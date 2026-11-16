/**
 * Full-page capture of a PDF (see background/pdf-capture.ts): gets the PDF
 * from the tab, or lets the user choose it when Chrome doesn't allow reading
 * it (local files), renders every page and saves the result to the library.
 */
import { FileText, KeyRound, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PdfJob } from '../background/pdf-capture';
import { defaultItemName } from '../core/filename';
import { newId } from '../core/format';
import { sendToBackground } from '../core/messages';
import type { Settings } from '../core/settings';
import type { LibraryItem } from '../core/types';
import { addItem } from '../db/db';
import { navigate } from '../ui/hooks';
import { Button, Input, Logo, Spinner } from '../ui/primitives';

type Phase =
  | { name: 'loading'; progress: number }
  | { name: 'pick' }
  | { name: 'password'; incorrect: boolean }
  | { name: 'rendering'; page: number; pages: number }
  | { name: 'error'; message: string }
  | { name: 'done' };

const MAX_PAGES = 300;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function PdfCapturePage({ token, settings }: { token: string; settings: Settings }) {
  const [phase, setPhase] = useState<Phase>({ name: 'loading', progress: 0 });
  const [job, setJobState] = useState<PdfJob | null>(null);
  const jobRef = useRef<PdfJob | null>(null);
  const setJob = (j: PdfJob | null) => {
    jobRef.current = j;
    setJobState(j);
  };
  const [password, setPassword] = useState('');
  const bytes = useRef<Uint8Array | null>(null);
  const finished = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const finish = async (result: { ids?: string[]; warnings?: string[]; error?: string; cancelled?: boolean }) => {
    if (finished.current) return;
    finished.current = true;
    await sendToBackground({ kind: 'pdf.finished', token, ...result });
  };

  // If the tab is closed half way, the capture ends as cancelled.
  useEffect(() => {
    const onHide = () => void finish({ cancelled: true });
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  const render = async (data: Uint8Array, pass?: string) => {
    const { openPdf, pageSizes, layoutFor, renderParts, PdfPasswordError } = await import('./render');
    let doc;
    try {
      doc = await openPdf(data, pass);
    } catch (err) {
      if (err instanceof PdfPasswordError) {
        setPhase({ name: 'password', incorrect: err.incorrect });
        return;
      }
      throw err;
    }
    const total = doc.numPages;
    setPhase({ name: 'rendering', page: 0, pages: Math.min(total, MAX_PAGES) });
    const sizes = await pageSizes(doc, MAX_PAGES);
    const layout = layoutFor(sizes, total, settings.capture.oversize);
    let lastReport = 0;
    const parts = await renderParts(doc, layout, (page, pages) => {
      setPhase({ name: 'rendering', page, pages });
      if (Date.now() - lastReport > 300 || page === pages) {
        lastReport = Date.now();
        void sendToBackground({ kind: 'pdf.progress', page, pages });
      }
    });
    await doc.destroy();

    const warnings = [`Rendered from the PDF: ${Math.min(total, MAX_PAGES)} page${total === 1 ? '' : 's'}.`];
    if (layout.skipped) warnings.push(`This PDF has ${total} pages; FrameShot captured the first ${MAX_PAGES}.`);
    const current = jobRef.current;
    const source = current?.source ?? { url: '', title: '', domain: '' };
    const now = Date.now();
    const baseName = defaultItemName({ title: source.title || current?.fileName || 'PDF', domain: source.domain, date: new Date(now) });
    const groupId = parts.length > 1 ? newId() : undefined;
    const ids: string[] = [];
    for (const [i, part] of parts.entries()) {
      const id = newId();
      const item: LibraryItem = {
        id,
        name: parts.length > 1 ? `${baseName} (part ${i + 1} of ${parts.length})` : baseName,
        createdAt: now + i,
        updatedAt: now + i,
        kind: 'capture',
        mode: 'full',
        source,
        width: part.width,
        height: part.height,
        byteSize: part.blob.size,
        mimeType: 'image/png',
        favorite: false,
        collectionId: null,
        tags: [],
        hasEdits: false,
        group: groupId ? { id: groupId, index: i, count: parts.length } : undefined,
        warnings,
        partial: layout.skipped > 0,
        scale: layout.scale,
        dhash: part.dhash,
      };
      await addItem(item, part.blob, part.thumb);
      ids.push(id);
    }
    await finish({ ids, warnings });
    setPhase({ name: 'done' });
    navigate(settings.afterCapture === 'editor' && ids[0] ? `/edit/${ids[0]}` : '/');
  };

  const fail = (err: unknown) => {
    const message = (err as Error)?.message || 'The PDF could not be captured.';
    setPhase({ name: 'error', message });
    void finish({ error: message });
  };

  useEffect(() => {
    void (async () => {
      const info = await sendToBackground({ kind: 'pdf.info', token });
      const j = info.ok ? info.data : null;
      if (!j) {
        setPhase({ name: 'error', message: 'This PDF capture has already finished or expired. Start it again from the PDF tab.' });
        finished.current = true;
        return;
      }
      setJob(j);
      if (!j.size) {
        setPhase({ name: 'pick' });
        return;
      }
      const data = new Uint8Array(j.size);
      for (let offset = 0; offset < j.size; ) {
        const piece = await sendToBackground({ kind: 'pdf.piece', token, offset });
        if (!piece.ok || !piece.data) throw new Error('The PDF tab was closed or changed before FrameShot could read it.');
        const chunk = base64ToBytes(piece.data);
        data.set(chunk, offset);
        offset += chunk.length;
        setPhase({ name: 'loading', progress: offset / j.size });
      }
      bytes.current = data;
      await render(data);
    })().catch(fail);
  }, [token]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    void (async () => {
      const data = new Uint8Array(await file.arrayBuffer());
      if (String.fromCharCode(...data.subarray(0, 5)) !== '%PDF-') throw new Error('That file is not a PDF. Choose the PDF that is open in Chrome.');
      bytes.current = data;
      const j = jobRef.current;
      if (j && !j.source.title) setJob({ ...j, source: { ...j.source, title: file.name } });
      await render(data);
    })().catch(fail);
  };

  const cancel = () => {
    void finish({ cancelled: true });
    navigate('/');
  };

  const pickText =
    job?.pickReason === 'local-file'
      ? 'Chrome doesn’t let extensions read PDF files from your computer directly. Choose the same file once, and FrameShot will capture all of its pages. It stays on your device.'
      : job?.pickReason === 'too-big'
        ? 'This PDF is very large. Download it, then choose the file here to capture all of its pages.'
        : 'FrameShot couldn’t read this PDF from its web address (it may need you to be signed in in a way the address doesn’t carry). Download it, then choose the file here.';

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="fr-card w-full max-w-[520px] p-8 text-center">
        <div className="flex justify-center"><Logo size={36} /></div>
        <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"><FileText size={26} /></div>
        <h1 className="mt-4 text-[20px] font-semibold tracking-tight">Full-page capture of a PDF</h1>
        {job && <p className="mt-1 truncate text-[13px] text-fg-subtle" title={job.fileName}>{job.fileName}</p>}

        {phase.name === 'loading' && (
          <div className="mt-6" aria-live="polite">
            <p className="flex items-center justify-center gap-2 text-sm text-fg-muted"><Spinner className="text-primary" /> Reading the PDF…</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(phase.progress * 100)}%` }} /></div>
          </div>
        )}

        {phase.name === 'rendering' && (
          <div className="mt-6" aria-live="polite">
            <p className="flex items-center justify-center gap-2 text-sm text-fg-muted"><Spinner className="text-primary" /> Rendering page {Math.max(1, phase.page)} of {phase.pages}…</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round((phase.page / Math.max(1, phase.pages)) * 100)}%` }} /></div>
          </div>
        )}

        {phase.name === 'pick' && (
          <div
            className="mt-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
          >
            <p className="text-sm leading-relaxed text-fg-muted">{pickText}</p>
            <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" data-testid="pdf-file" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button variant="primary" className="mt-5" icon={<Upload size={15} />} onClick={() => fileInput.current?.click()}>
              Choose the PDF
            </Button>
            <p className="mt-3 text-[12px] text-fg-subtle">Or drop the file here.</p>
          </div>
        )}

        {phase.name === 'password' && (
          <form
            className="mt-6 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              if (bytes.current) void render(bytes.current, password).catch(fail);
            }}
          >
            <p className="text-center text-sm text-fg-muted">{phase.incorrect ? 'That password is not right. Try again.' : 'This PDF is protected with a password. Enter it to capture the pages. It is only used on this device.'}</p>
            <Input className="mt-4" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} aria-label="PDF password" />
            <Button variant="primary" className="mt-3 w-full" icon={<KeyRound size={15} />} type="submit">Open PDF</Button>
          </form>
        )}

        {phase.name === 'error' && (
          <div className="mt-6">
            <p className="text-sm text-danger" role="alert">{phase.message}</p>
            <p className="mt-2 text-[13px] text-fg-subtle">A screenshot of what’s on screen (Visible area) always works on PDFs.</p>
            <Button className="mt-5" onClick={() => navigate('/')}>Open the library</Button>
          </div>
        )}

        {phase.name !== 'error' && phase.name !== 'done' && (
          <Button variant="ghost" size="sm" className="mt-6" icon={<X size={14} />} onClick={cancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
