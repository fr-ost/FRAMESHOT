/** Plays a screen recording from the library; download it or save a frame as a screenshot. */
import { AlertTriangle, ArrowLeft, Camera, Clock, Download, Film, HardDrive, Maximize, Pencil, Star, Trash2, Video, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatBytes, formatDate, formatDuration, newId } from '../core/format';
import type { Settings } from '../core/settings';
import { SURFACE_LABELS, type LibraryItem } from '../core/types';
import { addItem, deleteItems, getItem, getRecordingBlob, onLibraryEvent, updateItem } from '../db/db';
import { displayPath, downloadBlob, DownloadCancelledError } from '../export/deliver';
import { exportRecording } from '../export/service';
import { withFolder } from '../core/filename';
import { canvasToBlob, dHash, makeThumbnail } from '../imaging/image-io';
import { navigate, useObjectUrl } from '../ui/hooks';
import { Dialog, useConfirm, useToast } from '../ui/overlays';
import { Button, EmptyState, Field, IconButton, Input, Spinner } from '../ui/primitives';
import { ReviewCard, useReviewPrompt } from '../ui/ReviewPrompt';
import { baseMimeType, describeMimeType } from './formats';

export function PlayerPage({ id, settings }: { id: string; settings: Settings }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [item, setItem] = useState<LibraryItem | null | undefined>(undefined);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = useObjectUrl(blob);
  const review = useReviewPrompt(!!item && !!blob, 1500);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const it = await getItem(id);
      if (!alive) return;
      if (it && it.kind !== 'recording') {
        navigate(`/edit/${encodeURIComponent(id)}`);
        return;
      }
      setItem(it ?? null);
    };
    void load().catch((err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)));
    const off = onLibraryEvent(() => void load().catch(() => {}));
    return () => {
      alive = false;
      off();
    };
  }, [id]);

  useEffect(() => {
    if (!item) return;
    let alive = true;
    void getRecordingBlob(item.id, baseMimeType(item.mimeType)).then(
      (b) => {
        if (!alive) return;
        if (!b) setError('The video data for this recording is missing.');
        setBlob(b ?? null);
      },
      (err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)),
    );
    return () => {
      alive = false;
    };
    // Re-read only when a different recording is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const download = async () => {
    if (!item) return;
    setBusy('download');
    try {
      const { blob: file, filename } = await exportRecording(item.id, settings);
      const res = await downloadBlob(file, withFolder(settings.downloadFolder, filename), { saveAs: settings.askWhereToSave });
      toast.success(
        <span>
          Saved <strong>{displayPath(res.path || filename)}</strong>
        </span>,
      );
    } catch (err) {
      if (err instanceof DownloadCancelledError) toast.info('Download cancelled.');
      else toast.error(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setBusy(null);
    }
  };

  const saveFrame = async () => {
    const v = videoRef.current;
    if (!item || !v || !v.videoWidth || !v.videoHeight) return;
    setBusy('frame');
    try {
      v.pause();
      const canvas = new OffscreenCanvas(v.videoWidth, v.videoHeight);
      canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
      const [png, thumb] = await Promise.all([canvasToBlob(canvas, 'png'), makeThumbnail(canvas)]);
      const at = formatDuration(v.currentTime * 1000);
      const frameId = newId();
      const now = Date.now();
      await addItem(
        {
          id: frameId,
          name: `${item.name.replace(/ — .*$/, '')} — frame at ${at}`.slice(0, 200),
          createdAt: now,
          updatedAt: now,
          kind: 'frame',
          source: item.source,
          width: canvas.width,
          height: canvas.height,
          byteSize: png.size,
          mimeType: 'image/png',
          favorite: false,
          collectionId: item.collectionId,
          tags: [],
          hasEdits: false,
          warnings: [],
          dhash: dHash(canvas),
        },
        png,
        thumb,
      );
      toast.show(`Frame at ${at} saved as a screenshot.`, 'success', { label: 'Edit', onClick: () => navigate(`/edit/${encodeURIComponent(frameId)}`) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The frame could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!item) return;
    const ok = await confirm({
      title: 'Delete recording?',
      message: 'It will be permanently removed from the library on this device. Files you already downloaded are not affected.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteItems([item.id]);
    toast.success('Recording deleted.');
    navigate('/');
  };

  if (item === null || (error && !item)) {
    return (
      <Shell>
        <EmptyState
          icon={<Video size={28} />}
          title="Recording not found"
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Back to library
            </Button>
          }
        >
          {error ?? 'It may have been deleted.'}
        </EmptyState>
      </Shell>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="fr-glass relative z-20 flex h-[60px] shrink-0 items-center gap-2 border-b border-border px-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Library
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h1 className="truncate text-[15px] font-semibold tracking-tight" title={item?.name} data-testid="player-title">
            {item?.name ?? 'Loading…'}
          </h1>
          {item && (
            <IconButton label="Rename" size="sm" onClick={() => setRenaming(true)}>
              <Pencil size={14} />
            </IconButton>
          )}
        </div>
        {item && (
          <div className="flex shrink-0 items-center gap-1.5">
            <IconButton label={item.favorite ? 'Remove from favorites' : 'Add to favorites'} active={item.favorite} onClick={() => void updateItem(item.id, { favorite: !item.favorite })}>
              <Star size={16} fill={item.favorite ? 'currentColor' : 'none'} className={item.favorite ? 'text-amber-500' : undefined} />
            </IconButton>
            <IconButton label="Delete recording" onClick={() => void remove()}>
              <Trash2 size={16} />
            </IconButton>
            <Button icon={busy === 'frame' ? <Spinner /> : <Camera size={15} />} onClick={() => void saveFrame()} disabled={!url || !!busy} data-testid="save-frame" title="Save the frame you are looking at as a screenshot">
              Save frame
            </Button>
            <Button variant="primary" icon={busy === 'download' ? <Spinner /> : <Download size={15} />} onClick={() => void download()} disabled={!blob || !!busy} data-testid="player-download">
              Download
            </Button>
          </div>
        )}
      </header>

      <div className="fr-canvas-bg fr-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] space-y-5 p-6">
          <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-black shadow-pop">
            {url ? (
              <video
                ref={videoRef}
                src={url}
                controls
                playsInline
                preload="metadata"
                className="block max-h-[calc(100vh-260px)] min-h-[240px] w-full bg-black object-contain fr-fade"
                data-testid="player-video"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-white/70">
                {error ? (
                  <span className="flex items-center gap-2 text-sm">
                    <AlertTriangle size={16} /> {error}
                  </span>
                ) : (
                  <Spinner className="h-6 w-6" />
                )}
              </div>
            )}
          </div>

          {item && (
            <div className="flex flex-wrap items-center gap-2 fr-animate-in">
              <Meta icon={<Clock size={14} />} label="Length">
                {formatDuration(item.durationMs ?? 0)}
              </Meta>
              <Meta icon={<Maximize size={14} />} label="Size">
                {item.width}×{item.height}
              </Meta>
              <Meta icon={<Film size={14} />} label="Format">
                {describeMimeType(item.mimeType)}
              </Meta>
              <Meta icon={item.hasAudio ? <Volume2 size={14} /> : <VolumeX size={14} />} label="Sound">
                {item.hasAudio ? 'Yes' : 'No sound'}
              </Meta>
              <Meta icon={<HardDrive size={14} />} label="File">
                {formatBytes(item.byteSize)}
              </Meta>
              {item.surface && (
                <Meta icon={<Video size={14} />} label="Recorded">
                  {SURFACE_LABELS[item.surface]}
                </Meta>
              )}
              <span className="ml-auto text-[12px] text-fg-subtle">{formatDate(item.createdAt)}</span>
            </div>
          )}

          {item && item.warnings.length > 0 && (
            <ul className="space-y-1.5 rounded-[14px] border border-warning/25 bg-warning-soft p-3.5 text-[12.5px] leading-snug text-warning">
              {item.warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <AlertTriangle size={14} className="mt-px shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
          <ReviewCard controls={review} />
          <p className="text-center text-[12px] text-fg-subtle">Tip: pause on any moment and press “Save frame” to turn it into a screenshot you can annotate.</p>
        </div>
      </div>

      {item && renaming && <RenameDialog item={item} onClose={() => setRenaming(false)} />}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <header className="fr-glass relative z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Library
        </Button>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Meta({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] shadow-card backdrop-blur-md" title={label}>
      <span className="text-primary">{icon}</span>
      <span className="sr-only">{label}:</span>
      <span className="font-medium tabular-nums text-fg-muted">{children}</span>
    </span>
  );
}

function RenameDialog({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const [name, setName] = useState(item.name);
  const save = async () => {
    await updateItem(item.id, { name: name.trim().slice(0, 200) || item.name });
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Rename recording"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Name" htmlFor="fr-rec-name">
          <Input id="fr-rec-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
      </form>
    </Dialog>
  );
}
