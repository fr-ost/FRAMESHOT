/**
 * Frameora editor screen: loads a library item, hosts the canvas, tools and
 * properties, autosaves non-destructive edits, and exports flattened images.
 */
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  ExternalLink,
  Layers,
  LayoutTemplate,
  Maximize,
  MoreHorizontal,
  Redo2,
  Scan,
  Stamp,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { withFolder } from '../../core/filename';
import type { Settings } from '../../core/settings';
import { isSafeLink } from '../../core/restricted';
import type { ExportFormat, LibraryItem } from '../../core/types';
import { deleteItems, getDoc, getItem, getOriginal, listItems, putDoc, putThumb, replaceOriginal, updateItem } from '../../db/db';
import { copyImageBlob, displayPath, downloadBlob, DownloadCancelledError } from '../../export/deliver';
import { ExportDialog, type ExportChoice } from '../../export/ExportDialog';
import { encodeCanvas, filenameFor } from '../../export/service';
import { blobToBitmap, canvasToBlob, dHash, makeThumbnail } from '../../imaging/image-io';
import { navigate, isTypingTarget } from '../../ui/hooks';
import { Dialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger, useConfirm, useToast } from '../../ui/overlays';
import { Banner, Button, Field, IconButton, Input, Spinner, Switch, cx } from '../../ui/primitives';
import { DEFAULT_STYLE, EditorStore, type ToolId, type ToolStyle } from '../model/store';
import { isPristine } from '../model/transform';
import { createDoc, isValidDoc } from '../model/types';
import { createBaseImage, disposeBaseImage, type BaseImage } from '../render/base';
import { renderFlattened } from '../render/flatten';
import { CanvasView, type CanvasHandle } from './CanvasView';
import { PropertiesPanel } from './PropertiesPanel';
import { TOOL_SHORTCUTS, Toolbar } from './Toolbar';

const STYLE_KEY = 'frameora.editor.style';

function loadStyle(): Partial<ToolStyle> {
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed)) if (k in DEFAULT_STYLE && typeof v === typeof (DEFAULT_STYLE as unknown as Record<string, unknown>)[k]) out[k] = v;
    return out as Partial<ToolStyle>;
  } catch {
    return {};
  }
}

interface Loaded {
  item: LibraryItem;
  base: BaseImage;
  store: EditorStore;
  siblings: LibraryItem[];
}

export function EditorPage({ id, settings, dark }: { id: string; settings: Settings; dark: boolean }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let base: BaseImage | null = null;
    setLoaded(null);
    setError(null);
    (async () => {
      const item = await getItem(id);
      if (!item) throw new Error('This screenshot is no longer in your library.');
      const blob = await getOriginal(id);
      if (!blob) throw new Error('The image data for this screenshot is missing.');
      base = await createBaseImage(await blobToBitmap(blob));
      const stored = await getDoc(id);
      const doc = stored && isValidDoc(stored.doc, { width: base.width, height: base.height }) ? stored.doc : createDoc(base.width, base.height);
      const siblings = item.group ? (await listItems()).filter((i) => i.group?.id === item.group!.id).sort((a, b) => a.group!.index - b.group!.index) : [];
      if (cancelled) {
        disposeBaseImage(base);
        return;
      }
      setLoaded({ item, base, store: new EditorStore(doc, loadStyle()), siblings });
    })().catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
      const b = base;
      // Defer so the workspace's own cleanup (thumbnail refresh) can still draw.
      if (b) setTimeout(() => disposeBaseImage(b), 0);
    };
  }, [id]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="text-warning" />
        <p className="max-w-md text-sm text-fg-muted">{error}</p>
        <Button onClick={() => navigate('/')} icon={<ArrowLeft size={16} />}>
          Back to library
        </Button>
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-sm text-fg-subtle">
        <Spinner /> Opening screenshot…
      </div>
    );
  }
  return <EditorWorkspace key={loaded.item.id} {...loaded} settings={settings} dark={dark} />;
}

function EditorWorkspace({ item: initialItem, base, store, siblings, settings, dark }: Loaded & { settings: Settings; dark: boolean }) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const toast = useToast();
  const confirm = useConfirm();
  const canvasHandle = useRef<CanvasHandle | null>(null);
  const [item, setItem] = useState(initialItem);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [exportOpen, setExportOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showWarnings, setShowWarnings] = useState(true);
  const [name, setName] = useState(item.name);

  if (__FRAMEORA_E2E__) {
    // Test-only hook (compiled out of production builds).
    (window as unknown as Record<string, unknown>).__frameoraEditor = store;
  }

  // ── Autosave (non-destructive document + refreshed thumbnail) ──
  const lastSaved = useRef(state.revision);
  const thumbTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const thumbDirty = useRef(false);
  const refreshThumb = useCallback(() => {
    clearTimeout(thumbTimer.current);
    if (!thumbDirty.current) return;
    thumbDirty.current = false;
    try {
      // Rendering is synchronous, so this is safe even while the editor unmounts.
      const doc = store.getState().doc;
      const c = renderFlattened(doc, base, { scale: Math.min(1, 480 / doc.output.width) });
      void makeThumbnail(c)
        .then((t) => putThumb(item.id, t))
        .catch(() => {});
    } catch {
      // Thumbnail refresh is best-effort.
    }
  }, [store, base, item.id]);

  const saveNow = useCallback(async () => {
    const s = store.getState();
    if (s.revision === lastSaved.current) return;
    const rev = s.revision;
    setSaveState('saving');
    try {
      const pristine = isPristine(s.doc);
      await putDoc(item.id, s.doc);
      const next = await updateItem(item.id, {
        hasEdits: !pristine,
        editedWidth: pristine ? undefined : s.doc.output.width,
        editedHeight: pristine ? undefined : s.doc.output.height,
      });
      setItem(next);
      lastSaved.current = rev;
      setSaveState('saved');
      thumbDirty.current = true;
      clearTimeout(thumbTimer.current);
      thumbTimer.current = setTimeout(refreshThumb, 1200);
    } catch (err) {
      setSaveState('error');
      toast.error(err instanceof Error ? err.message : 'Could not save your edits.');
    }
  }, [store, item.id, toast, refreshThumb]);

  useEffect(() => {
    if (state.gesture || state.revision === lastSaved.current) return;
    const t = setTimeout(() => void saveNow(), 500);
    return () => clearTimeout(t);
  }, [state.revision, state.gesture, saveNow]);

  useEffect(() => {
    const flush = () => {
      void saveNow().then(refreshThumb);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      const unsaved = store.getState().revision !== lastSaved.current;
      if (unsaved) thumbDirty.current = true;
      refreshThumb();
      if (unsaved) void saveNow();
    };
  }, [saveNow, refreshThumb, store]);

  useEffect(() => {
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(state.style));
    } catch {
      /* ignore */
    }
  }, [state.style]);

  // ── View helpers ──
  const viewport = () => canvasHandle.current?.size() ?? { width: 800, height: 600 };
  const fit = (size?: { width: number; height: number }) => {
    const v = size ?? viewport();
    const tall = state.doc.output.height / state.doc.output.width > 2.2;
    if (tall) store.fitWidth(v.width, v.height);
    else store.fit(v.width, v.height);
  };
  const zoomBy = (factor: number) => {
    const v = viewport();
    store.zoomAt(store.getState().view.zoom * factor, v.width / 2, v.height / 2);
  };

  // ── Export ──
  const flatten = () => renderFlattened(store.getState().doc, base);

  const doExport = async (choice: Partial<ExportChoice> & { format: ExportFormat }) => {
    setBusy('Exporting…');
    try {
      await saveNow();
      const canvas = flatten();
      const quality = choice.quality ?? (choice.format === 'webp' ? settings.webpQuality : settings.jpegQuality);
      const blob = await encodeCanvas(canvas, choice.format, { ...settings, pdf: { ...settings.pdf, pageSize: choice.pageSize ?? settings.pdf.pageSize } }, { item, compactPdf: choice.compactPdf, quality });
      const filename = withFolder(settings.downloadFolder, filenameFor(item, settings, choice.format, { width: canvas.width, height: canvas.height }));
      const result = await downloadBlob(blob, filename, { saveAs: choice.saveAs ?? settings.askWhereToSave });
      toast.success(
        <span>
          Saved <strong className="font-semibold">{displayPath(result.path || filename)}</strong>
        </span>,
      );
    } catch (err) {
      if (err instanceof DownloadCancelledError) toast.info('Download cancelled.');
      else toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const doCopy = async () => {
    setBusy('Copying…');
    try {
      await copyImageBlob(canvasToBlob(flatten(), 'png'));
      toast.success('Copied to clipboard.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Copy failed.');
    } finally {
      setBusy(null);
    }
  };

  const doFlattenIntoLibrary = async () => {
    const ok = await confirm({
      title: 'Apply edits permanently?',
      message:
        'This replaces the stored original with the edited image. Blurred, pixelated, and redacted areas will no longer exist anywhere in your library. This cannot be undone.',
      confirmLabel: 'Apply permanently',
      danger: true,
    });
    if (!ok) return;
    setBusy('Applying…');
    try {
      const canvas = flatten();
      const [blob, thumb] = await Promise.all([canvasToBlob(canvas, 'png'), makeThumbnail(canvas)]);
      await replaceOriginal(item.id, blob, thumb, {
        width: canvas.width,
        height: canvas.height,
        byteSize: blob.size,
        mimeType: 'image/png',
        hasEdits: false,
        editedWidth: undefined,
        editedHeight: undefined,
        dhash: dHash(canvas),
      });
      toast.success('Edits applied permanently.');
      // Reload the editor with the new original.
      navigate(`/edit/${encodeURIComponent(item.id)}?r=${Date.now()}`);
      location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not apply edits.');
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    const ok = await confirm({ title: 'Delete screenshot?', message: 'It will be removed from your library on this device.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    lastSaved.current = store.getState().revision; // nothing left to save
    await deleteItems([item.id]);
    toast.success('Screenshot deleted.');
    navigate('/');
  };

  const commitName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === item.name) {
      setName(item.name);
      return;
    }
    setItem(await updateItem(item.id, { name: trimmed.slice(0, 200) }));
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || store.getState().editingTextId) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const s = store.getState();
      if (e.key === ' ' && !e.repeat) {
        canvasHandle.current?.interaction?.setSpace(true);
        e.preventDefault();
        return;
      }
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        store.redo();
      } else if (mod && key === 'd') {
        e.preventDefault();
        store.duplicateSelection();
      } else if (mod && key === 'a') {
        e.preventDefault();
        store.selectAll();
      } else if (mod && key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        void doCopy();
      } else if (mod && key === 's') {
        e.preventDefault();
        void doExport({ format: settings.defaultFormat });
      } else if (mod) {
        return;
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selection.length) {
          e.preventDefault();
          store.deleteSelection();
        }
      } else if (e.key === 'Escape') {
        if (s.tool === 'crop') store.setTool('select');
        else if (s.selection.length) store.select([]);
        else if (s.tool !== 'select') store.setTool('select');
      } else if (e.key === 'Enter' && s.tool === 'crop') {
        e.preventDefault();
        store.applyCrop();
      } else if (e.key.startsWith('Arrow') && s.selection.length) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        store.nudgeSelection(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0);
      } else if (e.key === '+' || e.key === '=') zoomBy(1.25);
      else if (e.key === '-' || e.key === '_') zoomBy(0.8);
      else if (e.key === '0') fit();
      else if (e.key === '1') {
        const v = viewport();
        store.actualSize(v.width, v.height);
      } else if (e.key === ']') store.reorder(e.shiftKey ? 'front' : 'forward');
      else if (e.key === '[') store.reorder(e.shiftKey ? 'back' : 'backward');
      else if (TOOL_SHORTCUTS[key] && !e.altKey) store.setTool(TOOL_SHORTCUTS[key] as ToolId);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') canvasHandle.current?.interaction?.setSpace(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

  const partIndex = item.group ? siblings.findIndex((s) => s.id === item.id) : -1;
  const warnings = useMemo(() => item.warnings ?? [], [item.warnings]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <IconButton label="Back to library" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void commitName()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setName(item.name);
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label="Screenshot name"
            className="w-full max-w-[520px] truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-fg hover:border-border focus:border-primary focus:outline-none"
          />
          <div className="flex items-center gap-2 px-2 text-[11px] text-fg-subtle">
            {item.source?.domain && <span className="truncate">{item.source.domain}</span>}
            <span aria-live="polite" className="inline-flex items-center gap-1">
              {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved' : (
                <>
                  <Check size={11} /> Saved locally
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <IconButton label="Undo" shortcut="Ctrl+Z" onClick={store.undo} disabled={!state.canUndo}>
            <Undo2 size={17} />
          </IconButton>
          <IconButton label="Redo" shortcut="Ctrl+Shift+Z" onClick={store.redo} disabled={!state.canRedo}>
            <Redo2 size={17} />
          </IconButton>
          <div className="mx-1.5 h-6 w-px bg-border" />
          <IconButton label="Zoom out" shortcut="−" onClick={() => zoomBy(0.8)}>
            <ZoomOut size={17} />
          </IconButton>
          <button
            type="button"
            className="h-8 w-14 rounded-md text-center text-[12px] font-medium tabular-nums text-fg-muted hover:bg-surface-2"
            onClick={() => {
              const v = viewport();
              store.actualSize(v.width, v.height);
            }}
            title="Actual size (1)"
            aria-label={`Zoom ${Math.round(state.view.zoom * 100)} percent. Click for actual size.`}
          >
            {Math.round(state.view.zoom * 100)}%
          </button>
          <IconButton label="Zoom in" shortcut="+" onClick={() => zoomBy(1.25)}>
            <ZoomIn size={17} />
          </IconButton>
          <IconButton label="Fit to screen" shortcut="0" onClick={() => fit()}>
            <Maximize size={16} />
          </IconButton>
          <div className="mx-1.5 h-6 w-px bg-border" />
        </div>

        <Button
          variant="ghost"
          icon={<LayoutTemplate size={16} />}
          onClick={async () => {
            await saveNow();
            navigate(`/compose/${encodeURIComponent(item.id)}`);
          }}
        >
          Compose
        </Button>
        <Button icon={busy === 'Copying…' ? <Spinner /> : <ClipboardCopy size={16} />} onClick={() => void doCopy()} disabled={!!busy}>
          Copy
        </Button>
        <div className="flex">
          <Button
            variant="primary"
            className="rounded-r-none"
            icon={busy === 'Exporting…' ? <Spinner /> : <Download size={16} />}
            disabled={!!busy}
            onClick={() => void doExport({ format: settings.defaultFormat })}
            data-testid="download-default"
          >
            Download {settings.defaultFormat.toUpperCase()}
          </Button>
          <DropdownMenu>
            <DropdownTrigger asChild>
              <Button variant="primary" className="rounded-l-none border-l border-white/20 px-2" aria-label="More export options" disabled={!!busy}>
                <ChevronDown size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              {(['png', 'jpeg', 'webp', 'pdf'] as ExportFormat[]).map((f) => (
                <DropdownItem key={f} icon={<Download size={14} />} onSelect={() => void doExport({ format: f })}>
                  Download {f === 'jpeg' ? 'JPEG' : f.toUpperCase()}
                </DropdownItem>
              ))}
              <DropdownSeparator />
              <DropdownItem icon={<Layers size={14} />} onSelect={() => setExportOpen(true)}>
                Export options…
              </DropdownItem>
            </DropdownContent>
          </DropdownMenu>
        </div>
        <DropdownMenu>
          <DropdownTrigger asChild>
            <IconButton label="More actions">
              <MoreHorizontal size={18} />
            </IconButton>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={<Stamp size={14} />} onSelect={() => void doFlattenIntoLibrary()} disabled={isPristine(state.doc)}>
              Apply edits permanently…
            </DropdownItem>
            {isSafeLink(item.source?.url) && (
              <DropdownItem icon={<ExternalLink size={14} />} onSelect={() => window.open(item.source!.url, '_blank', 'noopener,noreferrer')}>
                Open source page
              </DropdownItem>
            )}
            <DropdownSeparator />
            <DropdownItem icon={<Trash2 size={14} />} danger onSelect={() => void doDelete()}>
              Delete screenshot
            </DropdownItem>
          </DropdownContent>
        </DropdownMenu>
      </header>

      {(item.group || (showWarnings && warnings.length > 0)) && (
        <div className="space-y-2 border-b border-border bg-surface px-4 py-2">
          {item.group && (
            <div className="flex items-center gap-2 text-[13px] text-fg-muted">
              <Scan size={14} />
              <span>
                Part {item.group.index + 1} of {item.group.count}
              </span>
              <IconButton label="Previous part" size="sm" disabled={partIndex <= 0} onClick={() => navigate(`/edit/${encodeURIComponent(siblings[partIndex - 1].id)}`)}>
                <ChevronLeft size={15} />
              </IconButton>
              <IconButton label="Next part" size="sm" disabled={partIndex < 0 || partIndex >= siblings.length - 1} onClick={() => navigate(`/edit/${encodeURIComponent(siblings[partIndex + 1].id)}`)}>
                <ChevronRight size={15} />
              </IconButton>
            </div>
          )}
          {showWarnings && warnings.length > 0 && (
            <Banner
              tone="warning"
              icon={<AlertTriangle size={15} />}
              action={
                <button type="button" aria-label="Dismiss capture notes" onClick={() => setShowWarnings(false)} className="opacity-70 hover:opacity-100">
                  <X size={14} />
                </button>
              }
            >
              <ul className="space-y-0.5">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Banner>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Toolbar tool={state.tool} onTool={store.setTool} />
        <div className="relative flex min-w-0 flex-1 flex-col">
          {state.tool === 'crop' && (
            <CropBar
              onApply={store.applyCrop}
              onCancel={() => store.setTool('select')}
              onAspect={(ratio) => {
                const it = canvasHandle.current?.interaction;
                if (it) it.cropAspect = ratio;
                if (ratio) {
                  const { width, height } = store.getState().doc.output;
                  const w = Math.min(width, height * ratio);
                  const h = w / ratio;
                  store.setCropRect({ x: (width - w) / 2, y: (height - h) / 2, w, h });
                }
              }}
            />
          )}
          <CanvasView store={store} base={base} dark={dark} handleRef={canvasHandle} onReady={(size) => fit(size)} />
          {busy && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#18181b]/90 px-4 py-2 text-[13px] text-white shadow-pop">
              <Spinner /> {busy}
            </div>
          )}
        </div>
        <PropertiesPanel store={store} state={state} onResize={() => setResizeOpen(true)} />
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} settings={settings} onExport={(c) => doExport(c)} />
      <ResizeDialog
        open={resizeOpen}
        onOpenChange={setResizeOpen}
        width={state.doc.output.width}
        height={state.doc.output.height}
        onApply={(w, h) => {
          store.resize(w, h);
          setTimeout(() => fit(), 0);
        }}
      />
    </div>
  );
}

function CropBar({ onApply, onCancel, onAspect }: { onApply: () => void; onCancel: () => void; onAspect: (r: number | null) => void }) {
  const [aspect, setAspect] = useState<string>('free');
  const ratios: Record<string, number | null> = { free: null, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16 };
  return (
    <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5 shadow-pop">
      <span className="px-1 text-[13px] font-medium text-fg-muted">Crop</span>
      <div role="radiogroup" aria-label="Aspect ratio" className="flex gap-0.5">
        {Object.keys(ratios).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={aspect === k}
            onClick={() => {
              setAspect(k);
              onAspect(ratios[k]);
            }}
            className={cx('h-7 rounded-md px-2 text-[12px] font-medium', aspect === k ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg-subtle hover:bg-surface-2')}
          >
            {k === 'free' ? 'Free' : k}
          </button>
        ))}
      </div>
      <Button size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" variant="primary" onClick={onApply} data-testid="apply-crop">
        Apply
      </Button>
    </div>
  );
}

function ResizeDialog({
  open,
  onOpenChange,
  width,
  height,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  width: number;
  height: number;
  onApply: (w: number, h: number) => void;
}) {
  const [w, setW] = useState(String(width));
  const [h, setH] = useState(String(height));
  const [lock, setLock] = useState(true);
  useEffect(() => {
    if (open) {
      setW(String(width));
      setH(String(height));
    }
  }, [open, width, height]);
  const ratio = width / height;
  const valid = Number(w) >= 1 && Number(h) >= 1 && Number(w) <= 32767 && Number(h) <= 32767;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resize image"
      description={`Current size: ${width} × ${height} px`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              onApply(Number(w), Number(h));
              onOpenChange(false);
            }}
          >
            Resize
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Width (px)" htmlFor="fr-rw">
            <Input id="fr-rw" type="number" min={1} max={32767} value={w} onChange={(e) => {
              setW(e.target.value);
              if (lock) setH(String(Math.max(1, Math.round(Number(e.target.value) / ratio))));
            }} />
          </Field>
          <Field label="Height (px)" htmlFor="fr-rh">
            <Input id="fr-rh" type="number" min={1} max={32767} value={h} onChange={(e) => {
              setH(e.target.value);
              if (lock) setW(String(Math.max(1, Math.round(Number(e.target.value) * ratio))));
            }} />
          </Field>
        </div>
        <Switch label="Keep aspect ratio" checked={lock} onChange={setLock} />
        <div className="flex flex-wrap gap-1.5">
          {[25, 50, 75, 150, 200].map((p) => (
            <Button key={p} size="sm" onClick={() => {
              setW(String(Math.max(1, Math.round((width * p) / 100))));
              setH(String(Math.max(1, Math.round((height * p) / 100))));
            }}>
              {p}%
            </Button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
