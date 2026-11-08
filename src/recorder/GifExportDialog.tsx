/** "Export as GIF" for a recording: trim, size, frame rate, loop; encoded on this device. */
import { AlertTriangle, ImagePlay, Repeat, Scissors } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { buildFilename, withFolder } from '../core/filename';
import { formatBytes } from '../core/format';
import type { Settings } from '../core/settings';
import type { LibraryItem } from '../core/types';
import { displayPath, downloadBlob, DownloadCancelledError } from '../export/deliver';
import { playSound } from '../ui/sounds';
import { Dialog, useToast } from '../ui/overlays';
import { Button, SegmentedControl, Spinner, Switch, cx } from '../ui/primitives';
import { drawFrameAt, exportGif, GIF_FPS, GIF_MAX_SECONDS, GIF_WIDTHS, openVideo, planGif, type GifProgress } from './gif-export';

/** m:ss.s */
export function formatSeconds(s: number): string {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  const rest = v - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
}

export function GifExportDialog({ item, blob, open, onOpenChange, settings }: { item: LibraryItem; blob: Blob; open: boolean; onOpenChange: (o: boolean) => void; settings: Settings }) {
  const toast = useToast();
  // The file's real length once known (the stored length is measured while recording).
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const duration = Math.max(0.1, fileDuration ?? (item.durationMs ?? 0) / 1000);
  const step = 0.1;
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(() => Math.min(duration, 10));
  const [width, setWidth] = useState(() => (item.width >= 640 ? 640 : Math.max(320, item.width)));
  const [fps, setFps] = useState<number>(15);
  const [loop, setLoop] = useState(true);
  const [progress, setProgress] = useState<GifProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const previewVideo = useRef<{ video: HTMLVideoElement; dispose: () => void } | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  // Reset when (re)opened only — not when the real length arrives, or the user's trim would be lost.
  const storedDuration = Math.max(0.1, (item.durationMs ?? 0) / 1000);
  useEffect(() => {
    if (!open) return;
    setFileDuration(null);
    setStart(0);
    setEnd(Math.min(storedDuration, 10));
    setError(null);
    setProgress(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A small preview of the first frame of the selection.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void openVideo(blob)
      .then((v) => {
        if (!alive) {
          v.dispose();
          return;
        }
        previewVideo.current = v;
        if (Number.isFinite(v.video.duration) && v.video.duration > 0) {
          const d = v.video.duration;
          setFileDuration(d);
          // Keep the user's selection; only clamp it to the real length.
          setEnd((e) => Math.min(e, d));
          setStart((st) => Math.min(st, Math.max(0, d - step)));
        }
        setPreviewReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
      previewVideo.current?.dispose();
      previewVideo.current = null;
      setPreviewReady(false);
    };
  }, [open, blob]);

  useEffect(() => {
    if (!previewReady || !previewVideo.current || !previewRef.current) return;
    const t = setTimeout(() => {
      if (previewVideo.current && previewRef.current) void drawFrameAt(previewVideo.current.video, start, previewRef.current).catch(() => {});
    }, 120);
    return () => clearTimeout(t);
  }, [start, previewReady]);

  const plan = useMemo(() => planGif(duration, item.width, item.height, { start, end, width, fps, loop }), [duration, item.width, item.height, start, end, width, fps, loop]);
  const length = plan.end - plan.start;
  const busy = progress !== null && !error;
  const tooLong = end - start > GIF_MAX_SECONDS;

  const create = async () => {
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ phase: 'preparing', done: 0, total: 0 });
    try {
      const result = await exportGif(blob, { start, end, width, fps, loop }, { onProgress: setProgress, signal: controller.signal, durationHint: duration });
      const filename = buildFilename(
        settings.filenameTemplate,
        { date: new Date(item.createdAt), domain: item.source?.domain, title: item.source?.title, mode: 'gif', width: result.plan.width, height: result.plan.height, name: item.name },
        'gif',
      );
      const res = await downloadBlob(result.blob, withFolder(settings.downloadFolder, filename), { saveAs: settings.askWhereToSave });
      toast.success(
        <span>
          Saved <strong>{displayPath(res.path || filename)}</strong> ({formatBytes(result.blob.size)})
        </span>,
      );
      onOpenChange(false);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        setProgress(null);
        return;
      }
      if (err instanceof DownloadCancelledError) {
        toast.info('Download cancelled.');
        setProgress(null);
        return;
      }
      playSound('error');
      setError(err instanceof Error ? err.message : 'The GIF could not be created.');
    } finally {
      abortRef.current = null;
    }
  };

  const close = (o: boolean) => {
    if (!o) abortRef.current?.abort();
    onOpenChange(o);
  };

  const pct = (v: number) => `${(v / duration) * 100}%`;
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="Export as GIF"
      description="Pick the part to turn into an animated GIF. It is made on this device and saved to your Downloads folder."
      width={560}
      footer={
        busy ? (
          <Button onClick={() => abortRef.current?.abort()} data-testid="gif-cancel">
            Cancel
          </Button>
        ) : (
          <>
            <Button onClick={() => close(false)}>Close</Button>
            <Button variant="primary" icon={<ImagePlay size={15} />} onClick={() => void create()} data-testid="gif-create">
              Create GIF
            </Button>
          </>
        )
      }
    >
      <div className={cx('space-y-5', busy && 'pointer-events-none opacity-60')} aria-busy={busy}>
        <div className="relative overflow-hidden rounded-[14px] border border-border bg-black">
          <canvas ref={previewRef} className="mx-auto block aspect-video max-h-[210px] w-full object-contain" aria-label="Preview of the first frame" />
          {!previewReady && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70">
              <Spinner />
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {formatSeconds(start)} – {formatSeconds(end)}
          </span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-fg-muted">
            <span className="flex items-center gap-1.5">
              <Scissors size={13} className="text-primary" /> Part of the recording
            </span>
            <span className="tabular-nums text-fg-subtle">
              {formatSeconds(length)} of {formatSeconds(duration)}
            </span>
          </div>
          <div className="fr-dual-range">
            <div className="fr-dual-track">
              <div className="fr-dual-fill" style={{ left: pct(start), right: `calc(100% - ${pct(end)})` } as CSSProperties} />
            </div>
            <input
              type="range"
              min={0}
              max={duration}
              step={step}
              value={start}
              aria-label="Start"
              aria-valuetext={formatSeconds(start)}
              data-testid="gif-start"
              onChange={(e) => setStart(Math.min(Number(e.target.value), end - step))}
            />
            <input
              type="range"
              min={0}
              max={duration}
              step={step}
              value={end}
              aria-label="End"
              aria-valuetext={formatSeconds(end)}
              data-testid="gif-end"
              onChange={(e) => setEnd(Math.max(Number(e.target.value), start + step))}
            />
          </div>
          {tooLong && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-warning">
              <AlertTriangle size={13} /> GIFs are limited to {GIF_MAX_SECONDS} seconds; the first {GIF_MAX_SECONDS} s of the selection are used.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-[12px] font-medium text-fg-muted">Width</span>
            <SegmentedControl
              label="GIF width"
              value={String(width)}
              onChange={(v) => setWidth(Number(v))}
              options={GIF_WIDTHS.filter((w) => w <= Math.max(320, item.width)).map((w) => ({ value: String(w), label: `${w}` }))}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-[12px] font-medium text-fg-muted">Frames per second</span>
            <SegmentedControl label="GIF frame rate" value={String(fps)} onChange={(v) => setFps(Number(v))} options={GIF_FPS.map((f) => ({ value: String(f), label: `${f}` }))} />
          </div>
        </div>
        <Switch label="Loop forever" description="Off: the GIF plays once and stops on the last frame." checked={loop} onChange={setLoop} />

      </div>

      {progress && !error ? (
        <div className="mt-5 space-y-1.5 rounded-xl bg-surface-2 px-3 py-2.5" aria-live="polite">
          <div className="flex items-center justify-between text-[12px] font-medium text-fg-muted">
            <span className="flex items-center gap-2">
              <Spinner className="text-primary" />
              {progress.phase === 'preparing' ? 'Preparing…' : progress.phase === 'reading' ? `Reading frames ${progress.done} of ${progress.total}` : 'Finishing the GIF…'}
            </span>
            <span className="tabular-nums">{progress.phase === 'reading' ? `${percent}%` : ''}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="GIF progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="fr-accent-bg h-full rounded-full transition-[width] duration-300" style={{ width: `${progress.phase === 'finishing' ? 100 : percent}%` }} />
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl bg-surface-2 px-3 py-2.5 text-[12px]">
          <p className="flex items-center gap-2 font-medium tabular-nums text-fg-muted" data-testid="gif-summary">
            <Repeat size={13} className="text-primary" />
            {plan.width}×{plan.height} · {plan.times.length} frames · {formatSeconds(length)}
          </p>
          <p className="mt-0.5 pl-[21px] text-fg-subtle">Still parts of the screen are stored once, so screen recordings make small GIFs.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-[12.5px] text-danger-soft-fg">
          <AlertTriangle size={14} className="mt-px shrink-0" /> {error}
        </p>
      )}
    </Dialog>
  );
}
