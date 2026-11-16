/**
 * Full-page captures of PDFs opened in Chrome.
 *
 * Chrome's PDF viewer scrolls inside itself (it is a separate, protected
 * page), so the usual scroll-and-stitch capture would only ever see one
 * screen. Instead FrameShot renders every page of the PDF with pdf.js, which
 * ships inside the extension:
 *
 *  1. When the user starts a full-page capture on a tab showing a PDF, a tiny
 *     script on that tab re-reads the PDF from its own address (same origin,
 *     so it needs no extra permission, and nothing leaves the device).
 *  2. A FrameShot Studio tab opens on #/pdf/<token> and pulls the bytes in
 *     pieces through this service worker, renders the pages and saves them to
 *     the library like any other capture.
 *  3. Chrome never lets extensions read local files (file://), not even with
 *     "Allow access to file URLs". For those, the Studio tab asks the user to
 *     choose the same PDF once, and renders it from the chosen file.
 */
import type { CaptureSource } from '../core/types';
import { domainOf } from '../core/restricted';
import { newId } from '../core/format';
import { setStatus } from './status';
import { recordReviewSuccess } from '../core/review';

export const PDF_KEY = 'frameshot.pdf';
/** Largest PDF read from a tab (bigger files can still be chosen from disk). */
export const MAX_PDF_BYTES = 150 * 1024 * 1024;
/** Base64 piece size moved per message (well below Chrome's message limit). */
export const PDF_CHUNK_BYTES = 4 * 1024 * 1024;

export interface PdfJob {
  token: string;
  tabId: number;
  source: CaptureSource;
  /** Bytes waiting on the tab, or 0 when the user has to choose the file. */
  size: number;
  /** Why the file must be chosen by hand, when it must. */
  pickReason?: 'local-file' | 'unreadable' | 'too-big';
  fileName: string;
  startedAt: number;
}

export type PdfProbe = 'pdf' | 'page' | 'script-blocked' | 'unknown';

/** Is the tab showing Chrome's PDF viewer? 'script-blocked' means Chrome protects the page from scripts. */
export async function probePdf(tabId: number): Promise<PdfProbe> {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: () => document.contentType });
    return res?.result === 'application/pdf' ? 'pdf' : 'page';
  } catch (err) {
    const m = String((err as Error)?.message ?? err).toLowerCase();
    if (m.includes('chrome-extension://') || m.includes('chrome://') || m.includes('cannot be scripted') || m.includes('different extension')) return 'script-blocked';
    return 'unknown';
  }
}

function fileNameOf(url: string, title: string): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '');
    if (last) return last.slice(0, 120);
  } catch {
    /* fall through */
  }
  return (title || 'document').slice(0, 120);
}

async function readJob(): Promise<PdfJob | undefined> {
  return ((await chrome.storage.session.get(PDF_KEY))[PDF_KEY] as PdfJob | undefined) ?? undefined;
}

/** Runs on the PDF tab: re-reads the PDF from its address and keeps the bytes for later pieces. */
async function loadPdfInPage(max: number): Promise<{ size?: number; error?: string }> {
  try {
    if (location.protocol === 'file:') return { error: 'local-file' };
    const res = await fetch(location.href, { credentials: 'include' });
    if (!res.ok) return { error: `http-${res.status}` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > max) return { error: 'too-big', size: buf.byteLength };
    const head = new Uint8Array(buf, 0, Math.min(5, buf.byteLength));
    if (String.fromCharCode(...head) !== '%PDF-') return { error: 'not-pdf' };
    (globalThis as unknown as { __frameshotPdf?: Uint8Array }).__frameshotPdf = new Uint8Array(buf);
    return { size: buf.byteLength };
  } catch (err) {
    return { error: String((err as Error)?.message ?? err) };
  }
}

/** Runs on the PDF tab: returns one piece of the kept bytes as base64. */
function pdfPieceInPage(offset: number, length: number): string | null {
  const bytes = (globalThis as unknown as { __frameshotPdf?: Uint8Array }).__frameshotPdf;
  if (!bytes) return null;
  const part = bytes.subarray(offset, Math.min(bytes.length, offset + length));
  let bin = '';
  for (let i = 0; i < part.length; i += 0x8000) bin += String.fromCharCode(...part.subarray(i, i + 0x8000));
  return btoa(bin);
}

function forgetPdfInPage(): void {
  delete (globalThis as unknown as { __frameshotPdf?: Uint8Array }).__frameshotPdf;
}

/** Starts a full-page capture of the PDF in this tab (the Studio does the rendering). */
export async function startPdfCapture(tab: chrome.tabs.Tab): Promise<void> {
  const tabId = tab.id!;
  setStatus({ phase: 'capturing', mode: 'full', progress: 0.05, message: 'Reading the PDF…' });
  const url = tab.url ?? '';
  const source: CaptureSource = { url, title: tab.title ?? '', domain: domainOf(url) };
  let size = 0;
  let pickReason: PdfJob['pickReason'];
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: loadPdfInPage, args: [MAX_PDF_BYTES] });
    const out = res?.result as { size?: number; error?: string } | undefined;
    if (out?.size) size = out.size;
    else pickReason = out?.error === 'local-file' ? 'local-file' : out?.error === 'too-big' ? 'too-big' : 'unreadable';
  } catch {
    pickReason = url.startsWith('file:') ? 'local-file' : 'unreadable';
  }
  const job: PdfJob = { token: newId(), tabId, source, size, pickReason, fileName: fileNameOf(url, tab.title ?? ''), startedAt: Date.now() };
  await chrome.storage.session.set({ [PDF_KEY]: job });
  setStatus({
    phase: 'capturing',
    mode: 'full',
    progress: 0.15,
    message: size ? 'Rendering every page of the PDF…' : 'Choose the PDF in the FrameShot tab to capture all of its pages.',
  });
  await chrome.tabs.create({
    url: chrome.runtime.getURL(`/studio.html#/pdf/${job.token}`),
    index: tab.index + 1,
    windowId: tab.windowId,
    openerTabId: tabId,
  });
}

/** The Studio asks what to render. */
export async function pdfInfo(token: string): Promise<PdfJob | null> {
  const job = await readJob();
  return job && job.token === token ? job : null;
}

/** The Studio pulls the PDF piece by piece. */
export async function pdfPiece(token: string, offset: number): Promise<string | null> {
  const job = await readJob();
  if (!job || job.token !== token || !job.size) return null;
  const [res] = await chrome.scripting.executeScript({ target: { tabId: job.tabId }, func: pdfPieceInPage, args: [offset, PDF_CHUNK_BYTES] });
  return (res?.result as string | null) ?? null;
}

/** Progress reported by the Studio while it renders. */
export function pdfProgress(page: number, pages: number): void {
  setStatus({ phase: 'capturing', mode: 'full', progress: 0.2 + 0.75 * (page / Math.max(1, pages)), frame: page, frames: pages, message: `Rendering page ${page} of ${pages}…` });
}

/** The Studio finished (saved items), gave up, or the user cancelled. */
export async function pdfFinished(token: string, result: { ids?: string[]; warnings?: string[]; error?: string; cancelled?: boolean }): Promise<void> {
  const job = await readJob();
  if (job?.token === token) {
    await chrome.storage.session.remove(PDF_KEY);
    if (job.size) await chrome.scripting.executeScript({ target: { tabId: job.tabId }, func: forgetPdfInPage }).catch(() => {});
  }
  if (result.ids?.length) {
    await recordReviewSuccess().catch(() => {});
    setStatus({
      phase: 'done',
      mode: 'full',
      itemIds: result.ids,
      warnings: result.warnings ?? [],
      message: result.ids.length > 1 ? `Saved as ${result.ids.length} parts.` : 'Saved to your library.',
    });
  } else if (result.cancelled) {
    setStatus({ phase: 'cancelled', mode: 'full', message: 'Capture cancelled.' });
  } else {
    setStatus({ phase: 'error', mode: 'full', message: result.error || 'The PDF could not be captured.' });
  }
}
