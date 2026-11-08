/**
 * Composer: turns a screenshot (with its edits) into a polished visual with a
 * background, padding, rounded corners, shadow and optional window frame.
 */
import {
  AlignCenter,
  ArrowLeft,
  ClipboardCopy,
  Download,
  Lock,
  LockOpen,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildFilename, withFolder, defaultItemName } from '../core/filename';
import { formatDimensions, newId } from '../core/format';
import type { Settings } from '../core/settings';
import type { ExportFormat, LibraryItem } from '../core/types';
import { addItem } from '../db/db';
import { copyImageBlob, displayPath, downloadBlob, DownloadCancelledError } from '../export/deliver';
import { encodeCanvas, renderItemCanvas } from '../export/service';
import { canvasToBlob, dHash, makeThumbnail } from '../imaging/image-io';
import { ColorPicker } from '../ui/color';
import { navigate } from '../ui/hooks';
import { DropdownContent, DropdownItem, DropdownMenu, DropdownTrigger, useToast } from '../ui/overlays';
import { Button, Field, IconButton, Input, SegmentedControl, Select, Slider, Spinner, Switch, cx } from '../ui/primitives';
import { canvasSizeFor, DEFAULT_COMPOSER, GRADIENTS, PRESETS, sanitizeComposer, type Align, type ComposerSettings, type PresetId } from './layout';
import { renderComposition } from './render';

const STORE_KEY = 'frameshot.composer';

function loadComposer(): ComposerSettings {
  try {
    return sanitizeComposer(JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_COMPOSER };
  }
}

export function ComposerPage({ id, settings }: { id: string; settings: Settings }) {
  const [source, setSource] = useState<{ canvas: OffscreenCanvas; item: LibraryItem } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    renderItemCanvas(id)
      .then((r) => alive && setSource(r))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [id]);
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-fg-muted">
        <p>{error}</p>
        <Button onClick={() => navigate('/')}>Back to library</Button>
      </div>
    );
  }
  if (!source) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-sm text-fg-subtle">
        <Spinner /> Preparing composer…
      </div>
    );
  }
  return <Composer source={source.canvas} item={source.item} settings={settings} />;
}

function Composer({ source, item, settings }: { source: OffscreenCanvas; item: LibraryItem; settings: Settings }) {
  const toast = useToast();
  const [s, setS] = useState<ComposerSettings>(loadComposer);
  const [busy, setBusy] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapSize, setWrapSize] = useState({ w: 800, h: 600 });
  const size = useMemo(() => canvasSizeFor(s, source.width, source.height), [s, source]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => setWrapSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Preview at screen resolution.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(1, (wrapSize.w - 64) / size.width, (wrapSize.h - 64) / size.height);
    const k = Math.max(0.02, fit * dpr);
    const frame = requestAnimationFrame(() => {
      const out = renderComposition(source, s, { scale: Math.min(1, k), domain: item.source?.domain });
      canvas.width = out.width;
      canvas.height = out.height;
      canvas.style.width = `${Math.round(size.width * fit)}px`;
      canvas.style.height = `${Math.round(size.height * fit)}px`;
      canvas.getContext('2d')!.drawImage(out, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [s, source, size, wrapSize, item.source?.domain]);

  const update = (patch: Partial<ComposerSettings>) => setS((cur) => sanitizeComposer({ ...cur, ...patch }));
  const full = () => renderComposition(source, s, { domain: item.source?.domain });

  const download = async (format: ExportFormat) => {
    setBusy('Exporting…');
    try {
      const canvas = full();
      const blob = await encodeCanvas(canvas, format, settings, { item });
      const name = buildFilename(
        settings.filenameTemplate,
        { date: new Date(), domain: item.source?.domain, title: item.source?.title, mode: 'composition', width: canvas.width, height: canvas.height, name: item.name },
        format,
      );
      const res = await downloadBlob(blob, withFolder(settings.downloadFolder, name), { saveAs: settings.askWhereToSave });
      toast.success(<span>Saved <strong>{displayPath(res.path || name)}</strong></span>);
    } catch (err) {
      if (err instanceof DownloadCancelledError) toast.info('Download cancelled.');
      else toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    setBusy('Copying…');
    try {
      await copyImageBlob(canvasToBlob(full(), 'png'));
      toast.success('Copied to clipboard.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Copy failed.');
    } finally {
      setBusy(null);
    }
  };

  const saveToLibrary = async () => {
    setBusy('Saving…');
    try {
      const canvas = full();
      const [blob, thumb] = await Promise.all([canvasToBlob(canvas, 'png'), makeThumbnail(canvas)]);
      const now = Date.now();
      const id = newId();
      await addItem(
        {
          id,
          name: `${item.name.replace(/ — .*$/, '')} — composition`.slice(0, 200) || defaultItemName({}),
          createdAt: now,
          updatedAt: now,
          kind: 'composition',
          source: item.source,
          width: canvas.width,
          height: canvas.height,
          byteSize: blob.size,
          mimeType: 'image/png',
          favorite: false,
          collectionId: item.collectionId,
          tags: [...item.tags],
          hasEdits: false,
          warnings: [],
          dhash: dHash(canvas),
        },
        blob,
        thumb,
      );
      toast.show('Composition saved to your library.', 'success', { label: 'Open', onClick: () => navigate(`/edit/${encodeURIComponent(id)}`) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(null);
    }
  };

  const ratio = size.width / size.height;
  const checker = s.background.type === 'transparent';

  return (
    <div className="flex h-full flex-col">
      <header className="fr-glass relative z-20 flex h-[60px] shrink-0 items-center gap-2 border-b border-border px-3">
        <IconButton label="Back to editor" onClick={() => navigate(`/edit/${encodeURIComponent(item.id)}`)}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">Composer</h1>
          <p className="truncate text-[11px] text-fg-subtle">{item.name}</p>
        </div>
        <span className="hidden rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium tabular-nums text-fg-muted sm:inline">{formatDimensions(size.width, size.height)} px</span>
        <Button icon={<Save size={16} />} onClick={() => void saveToLibrary()} disabled={!!busy}>
          Save to library
        </Button>
        <Button icon={<ClipboardCopy size={16} />} onClick={() => void copy()} disabled={!!busy}>
          Copy
        </Button>
        <DropdownMenu>
          <DropdownTrigger asChild>
            <Button variant="primary" icon={busy === 'Exporting…' ? <Spinner /> : <Download size={16} />} disabled={!!busy}>
              Download
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            {(['png', 'jpeg', 'webp', 'pdf'] as ExportFormat[]).map((f) => (
              <DropdownItem key={f} icon={<Download size={14} />} onSelect={() => void download(f)}>
                {f === 'jpeg' ? 'JPEG' : f.toUpperCase()}
                {f === 'png' && s.background.type === 'transparent' ? ' (keeps transparency)' : ''}
              </DropdownItem>
            ))}
          </DropdownContent>
        </DropdownMenu>
      </header>
      <div className="flex min-h-0 flex-1">
        <div ref={wrapRef} className="fr-canvas-bg flex min-w-0 flex-1 items-center justify-center overflow-hidden p-8">
          <canvas
            ref={previewRef}
            className={cx('fr-animate-in max-h-full max-w-full rounded-[4px] shadow-pop', checker && 'fr-checker')}
            aria-label="Composition preview"
            role="img"
            data-testid="composer-preview"
          />
        </div>
        <aside aria-label="Composition settings" className="fr-glass fr-scroll w-[312px] shrink-0 space-y-6 overflow-y-auto border-l border-border p-5">
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Canvas</h2>
            <Field label="Size preset" htmlFor="fr-preset">
              <Select id="fr-preset" value={s.preset} onChange={(e) => {
                const preset = e.target.value as PresetId;
                if (preset === 'custom') update({ preset, width: size.width, height: size.height });
                else update({ preset });
              }}>
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end gap-2">
              <Field label="Width" htmlFor="fr-cw" className="flex-1">
                <Input id="fr-cw" type="number" min={16} max={8192} value={size.width} onChange={(e) => {
                  const w = Number(e.target.value);
                  update({ preset: 'custom', width: w, height: s.lockAspect ? Math.round(w / ratio) : size.height });
                }} />
              </Field>
              <IconButton label={s.lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'} active={s.lockAspect} onClick={() => update({ lockAspect: !s.lockAspect })}>
                {s.lockAspect ? <Lock size={15} /> : <LockOpen size={15} />}
              </IconButton>
              <Field label="Height" htmlFor="fr-ch" className="flex-1">
                <Input id="fr-ch" type="number" min={16} max={8192} value={size.height} onChange={(e) => {
                  const h = Number(e.target.value);
                  update({ preset: 'custom', height: h, width: s.lockAspect ? Math.round(h * ratio) : size.width });
                }} />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Background</h2>
            <SegmentedControl
              label="Background type"
              value={s.background.type}
              onChange={(type) => update({ background: { ...s.background, type } })}
              options={[
                { value: 'gradient', label: 'Gradient' },
                { value: 'solid', label: 'Solid' },
                { value: 'transparent', label: 'None' },
              ]}
            />
            {s.background.type === 'solid' && (
              <ColorPicker label="Color" value={s.background.color} palette={['#ffffff', '#f4f4f5', '#eef2ff', '#fef3c7', '#dcfce7', '#111827', '#1e1b4b', '#6366f1']} onChange={(c) => c && update({ background: { ...s.background, color: c } })} />
            )}
            {s.background.type === 'gradient' && (
              <>
                <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Gradient presets">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.label}
                      type="button"
                      role="radio"
                      aria-checked={s.background.from === g.from && s.background.to === g.to}
                      aria-label={g.label}
                      title={g.label}
                      onClick={() => update({ background: { ...s.background, from: g.from, to: g.to } })}
                      className={cx('fr-press h-9 rounded-[10px] border border-black/10 transition-transform hover:scale-105', s.background.from === g.from && s.background.to === g.to && 'ring-2 ring-primary ring-offset-2 ring-offset-surface')}
                      style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-[12px] text-fg-muted">
                    <input type="color" value={s.background.from} onChange={(e) => update({ background: { ...s.background, from: e.target.value } })} className="h-7 w-9 cursor-pointer rounded border border-border" />
                    From
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-fg-muted">
                    <input type="color" value={s.background.to} onChange={(e) => update({ background: { ...s.background, to: e.target.value } })} className="h-7 w-9 cursor-pointer rounded border border-border" />
                    To
                  </label>
                </div>
                <Slider label="Angle" min={0} max={360} value={s.background.angle} onChange={(angle) => update({ background: { ...s.background, angle } })} format={(n) => `${n}°`} id="fr-angle" />
              </>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Screenshot</h2>
            <SegmentedControl
              label="Scaling"
              value={s.fit}
              onChange={(fit) => update({ fit })}
              options={[
                { value: 'fit', label: 'Fit' },
                { value: 'fill', label: 'Fill' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            {s.fit === 'custom' && <Slider label="Scale" min={5} max={200} value={s.scale} onChange={(scale) => update({ scale })} format={(n) => `${n}%`} id="fr-scale" />}
            <Slider label="Padding" min={0} max={400} value={s.padding} onChange={(padding) => update({ padding })} format={(n) => `${n}px`} id="fr-padding" />
            <Slider label="Corner radius" min={0} max={80} value={s.radius} onChange={(radius) => update({ radius })} format={(n) => `${n}px`} id="fr-cradius" />
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-fg-muted">
                Alignment
                <button type="button" className="inline-flex items-center gap-1 text-fg-subtle hover:text-fg" onClick={() => update({ alignX: 'center', alignY: 'center' })}>
                  <AlignCenter size={12} /> Center
                </button>
              </div>
              <div role="radiogroup" aria-label="Alignment" className="grid w-24 grid-cols-3 gap-1">
                {(['start', 'center', 'end'] as Align[]).flatMap((y) =>
                  (['start', 'center', 'end'] as Align[]).map((x) => (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      role="radio"
                      aria-checked={s.alignX === x && s.alignY === y}
                      aria-label={`Align ${y === 'start' ? 'top' : y === 'end' ? 'bottom' : 'middle'} ${x === 'start' ? 'left' : x === 'end' ? 'right' : 'center'}`}
                      onClick={() => update({ alignX: x, alignY: y })}
                      className={cx('fr-press h-7 rounded-[7px] border transition-colors', s.alignX === x && s.alignY === y ? 'fr-accent-bg border-transparent shadow-glow' : 'border-border bg-surface-2 hover:border-border-strong')}
                    />
                  )),
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Effects</h2>
            <Switch label="Shadow" checked={s.shadow.enabled} onChange={(enabled) => update({ shadow: { ...s.shadow, enabled } })} />
            {s.shadow.enabled && (
              <>
                <Slider label="Shadow blur" min={0} max={160} value={s.shadow.blur} onChange={(blur) => update({ shadow: { ...s.shadow, blur } })} id="fr-sblur" />
                <Slider label="Shadow offset" min={-60} max={80} value={s.shadow.offsetY} onChange={(offsetY) => update({ shadow: { ...s.shadow, offsetY } })} id="fr-soff" />
                <Slider label="Shadow opacity" min={0} max={1} step={0.02} value={s.shadow.opacity} onChange={(opacity) => update({ shadow: { ...s.shadow, opacity } })} format={(n) => `${Math.round(n * 100)}%`} id="fr-sop" />
              </>
            )}
            <Field label="Window frame">
              <SegmentedControl
                label="Window frame"
                value={s.frame}
                onChange={(frame) => update({ frame })}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </Field>
          </section>

          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={() => setS({ ...DEFAULT_COMPOSER })}>
            Reset composition
          </Button>
        </aside>
      </div>
    </div>
  );
}
