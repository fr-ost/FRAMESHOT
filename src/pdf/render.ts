/**
 * Renders a PDF to images with pdf.js (bundled with the extension; nothing is
 * downloaded). Runs only in FrameShot Studio, loaded on demand.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { canvasToBlob, dHash, get2d, makeThumbnail, probeMaxCanvasDimension } from '../imaging/image-io';
import { DEFAULT_CANVAS_LIMITS } from '../core/capture-plan';
import { PDF_BACKDROP, planPdfLayout, type PdfLayout, type PdfPageSize } from './layout';

export class PdfPasswordError extends Error {
  constructor(public readonly incorrect: boolean) {
    super(incorrect ? 'That password is not right.' : 'This PDF is protected with a password.');
  }
}

export async function openPdf(data: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    // pdf.js takes ownership of the buffer, so hand it a copy we can reuse for a password retry.
    data: data.slice(),
    password,
    // FrameShot's Content Security Policy forbids eval; tell pdf.js not to try.
    isEvalSupported: false,
    enableXfa: false,
    standardFontDataUrl: chrome.runtime.getURL('/pdfjs/standard_fonts/'),
    cMapUrl: chrome.runtime.getURL('/pdfjs/cmaps/'),
    cMapPacked: true,
  });
  try {
    return await task.promise;
  } catch (err) {
    const e = err as { name?: string; code?: number };
    if (e?.name === 'PasswordException') throw new PdfPasswordError(e.code === 2);
    throw new Error('This file could not be read as a PDF.');
  }
}

export async function pageSizes(doc: PDFDocumentProxy, max: number): Promise<PdfPageSize[]> {
  const out: PdfPageSize[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, max); i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    out.push({ w: vp.width, h: vp.height });
  }
  return out;
}

export function layoutFor(sizes: PdfPageSize[], total: number, oversize: 'split' | 'scale'): PdfLayout {
  const layout = planPdfLayout(sizes, {
    maxDimension: Math.min(32767, probeMaxCanvasDimension()),
    maxPixels: DEFAULT_CANVAS_LIMITS.maxPixels,
    oversize,
  });
  return { ...layout, skipped: layout.skipped + Math.max(0, total - sizes.length) };
}

export interface RenderedPart {
  blob: Blob;
  thumb: Blob;
  dhash: string;
  width: number;
  height: number;
}

/** Renders each part (a run of pages stacked vertically) into a PNG. */
export async function renderParts(doc: PDFDocumentProxy, layout: PdfLayout, onPage: (done: number, total: number) => void): Promise<RenderedPart[]> {
  const total = layout.parts.reduce((n, p) => n + p.pages.length, 0);
  let done = 0;
  const out: RenderedPart[] = [];
  for (const part of layout.parts) {
    const canvas = document.createElement('canvas');
    canvas.width = part.width;
    canvas.height = part.height;
    const ctx = get2d(canvas, { alpha: false }) as CanvasRenderingContext2D;
    ctx.fillStyle = PDF_BACKDROP;
    ctx.fillRect(0, 0, part.width, part.height);
    for (const placed of part.pages) {
      const page = await doc.getPage(placed.index + 1);
      const viewport = page.getViewport({ scale: layout.scale });
      // pdf.js paints its whole canvas white first, so each page gets its own canvas.
      const sheet = document.createElement('canvas');
      sheet.width = placed.w;
      sheet.height = placed.h;
      const sctx = get2d(sheet, { alpha: false }) as CanvasRenderingContext2D;
      await page.render({ canvasContext: sctx, viewport }).promise;
      page.cleanup();
      // A soft edge so white pages stand out from the backdrop, like a PDF viewer.
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(placed.x - 1, placed.y - 1, placed.w + 2, placed.h + 2);
      ctx.drawImage(sheet, placed.x, placed.y);
      sheet.width = sheet.height = 0;
      onPage(++done, total);
    }
    const [blob, thumb] = await Promise.all([canvasToBlob(canvas, 'png'), makeThumbnail(canvas)]);
    out.push({ blob, thumb, dhash: dHash(canvas), width: part.width, height: part.height });
    canvas.width = canvas.height = 0;
  }
  return out;
}
