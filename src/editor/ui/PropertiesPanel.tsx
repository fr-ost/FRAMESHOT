/**
 * Context-sensitive properties: style for the active tool or selected objects,
 * layer ordering, the layer list, and image operations.
 */
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Maximize2,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDimensions } from '../../core/format';
import { ColorPicker, HIGHLIGHT_PALETTE } from '../../ui/color';
import { Button, IconButton, SegmentedControl, Select, Slider, Switch, cx } from '../../ui/primitives';
import { styleOf, type EditorState, type EditorStore, type ToolId, type ToolStyle } from '../model/store';
import { FONT_LABELS, OBJECT_LABELS, SYMBOL_LABELS, type EditorObject, type FontKey, type ObjectType, type SymbolKey } from '../model/types';

type Ctx = ObjectType | 'roundrect' | 'none';

function contextFor(state: EditorState): Ctx {
  if (state.selection.length) {
    const types = new Set(state.doc.objects.filter((o) => state.selection.includes(o.id)).map((o) => o.type));
    return types.size === 1 ? [...types][0] : 'none';
  }
  const map: Partial<Record<ToolId, Ctx>> = {
    arrow: 'arrow',
    line: 'line',
    rect: 'rect',
    roundrect: 'roundrect',
    ellipse: 'ellipse',
    pen: 'pen',
    highlighter: 'highlighter',
    text: 'text',
    marker: 'marker',
    symbol: 'symbol',
    blur: 'blur',
    pixelate: 'pixelate',
    redact: 'redact',
  };
  return map[state.tool] ?? 'none';
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="fr-fade border-b border-border px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function PropertiesPanel({ store, state, onResize }: { store: EditorStore; state: EditorState; onResize: () => void }) {
  const ctx = contextFor(state);
  const selected = state.doc.objects.filter((o) => state.selection.includes(o.id));
  // Show the selection's actual values (first selected object) rather than tool defaults.
  const st: ToolStyle = selected.length ? { ...state.style, ...styleOf(selected[0]) } : state.style;
  const set = (patch: Partial<ToolStyle>) => store.setStyle(patch);
  const v = st;
  // Sliders preview live and commit a single undo step when released.
  const sliderProps = (key: keyof ToolStyle) => ({
    value: v[key] as number,
    onChange: (n: number) => store.previewStyle({ [key]: n } as Partial<ToolStyle>),
    onCommit: () => store.commitPreview(),
  });

  const title = ctx === 'none' ? (selected.length > 1 ? `${selected.length} objects` : 'Properties') : ctx === 'roundrect' ? 'Rounded rectangle' : OBJECT_LABELS[ctx];

  return (
    <aside aria-label="Properties" className="fr-glass fr-scroll flex w-[280px] shrink-0 flex-col overflow-y-auto border-l border-border">
      {ctx !== 'none' && (
        <Section title={title}>
          {['arrow', 'line', 'rect', 'roundrect', 'ellipse', 'pen', 'text', 'marker', 'symbol'].includes(ctx) && (
            <ColorPicker label={ctx === 'rect' || ctx === 'roundrect' || ctx === 'ellipse' ? 'Border color' : 'Color'} value={v.color} onChange={(c) => c && set({ color: c })} />
          )}
          {['arrow', 'line', 'rect', 'roundrect', 'ellipse', 'pen'].includes(ctx) && (
            <Slider label="Thickness" min={1} max={40} {...sliderProps('strokeWidth')} format={(n) => `${n}px`} id="fr-stroke" />
          )}
          {(ctx === 'rect' || ctx === 'roundrect' || ctx === 'ellipse') && (
            <ColorPicker label="Fill" value={v.fill} allowNone onChange={(c) => set({ fill: c })} />
          )}
          {(ctx === 'rect' || ctx === 'roundrect') && (
            <Slider label="Corner radius" min={0} max={80} {...sliderProps('radius')} format={(n) => `${n}px`} id="fr-radius" />
          )}
          {ctx === 'arrow' && (
            <SegmentedControl
              label="Arrow heads"
              value={v.heads}
              onChange={(h) => set({ heads: h })}
              options={[
                { value: 'end', label: 'One end' },
                { value: 'both', label: 'Both ends' },
              ]}
            />
          )}
          {ctx === 'line' && <Switch label="Dashed" checked={v.dashed} onChange={(d) => set({ dashed: d })} />}
          {ctx === 'highlighter' && (
            <>
              <ColorPicker label="Color" palette={HIGHLIGHT_PALETTE} value={v.highlighterColor} onChange={(c) => c && set({ highlighterColor: c })} />
              <Slider label="Width" min={6} max={60} {...sliderProps('highlighterWidth')} format={(n) => `${n}px`} id="fr-hl" />
              <p className="text-xs text-fg-subtle">Hold Shift for a straight highlight.</p>
            </>
          )}
          {ctx === 'text' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label="Font" value={v.font} onChange={(e) => set({ font: e.target.value as FontKey })}>
                  {(Object.keys(FONT_LABELS) as FontKey[]).map((f) => (
                    <option key={f} value={f}>
                      {FONT_LABELS[f]}
                    </option>
                  ))}
                </Select>
                <Select aria-label="Font size" value={String(Math.round(v.fontSize))} onChange={(e) => set({ fontSize: Number(e.target.value) })}>
                  {[...new Set([12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80, 96, Math.round(v.fontSize)])].sort((a, b) => a - b).map((n) => (
                    <option key={n} value={n}>
                      {n}px
                    </option>
                  ))}
                </Select>
              </div>
              <Switch label="Bold" checked={v.bold} onChange={(b) => set({ bold: b })} />
              <Switch label="Outline" description="Contrasting outline for readability" checked={v.textOutline} onChange={(b) => set({ textOutline: b })} />
              <ColorPicker label="Background" allowNone value={v.textBackground} onChange={(c) => set({ textBackground: c })} />
            </>
          )}
          {ctx === 'marker' && (
            <Slider label="Size" min={16} max={120} {...sliderProps('markerSize')} format={(n) => `${n}px`} id="fr-marker" />
          )}
          {ctx === 'symbol' && (
            <>
              <div role="radiogroup" aria-label="Symbol" className="grid grid-cols-4 gap-1.5">
                {(Object.keys(SYMBOL_LABELS) as SymbolKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={v.symbol === k}
                    onClick={() => set({ symbol: k })}
                    className={cx(
                      'fr-press h-8 rounded-[10px] border text-[12px] font-medium transition-colors',
                      v.symbol === k ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border text-fg-muted hover:bg-surface-2',
                    )}
                  >
                    {SYMBOL_LABELS[k]}
                  </button>
                ))}
              </div>
              <Slider label="Size" min={16} max={160} {...sliderProps('symbolSize')} format={(n) => `${n}px`} id="fr-symbol" />
            </>
          )}
          {ctx === 'blur' && (
            <>
              <Slider label="Strength" min={4} max={60} {...sliderProps('blurRadius')} id="fr-blur" />
              <PrivacyNote>
                Blur can sometimes be reversed for short text. For passwords, card numbers, or personal data, use <strong>Redact</strong>.
              </PrivacyNote>
            </>
          )}
          {ctx === 'pixelate' && (
            <>
              <Slider label="Block size" min={4} max={80} {...sliderProps('pixelSize')} format={(n) => `${n}px`} id="fr-pixel" />
              <PrivacyNote>
                Pixelation of small text can sometimes be reversed. For confidential information, use <strong>Redact</strong>.
              </PrivacyNote>
            </>
          )}
          {ctx === 'redact' && (
            <>
              <ColorPicker label="Redaction color" value={v.redactColor} palette={['#000000', '#111827', '#374151', '#ffffff', '#ef4444', '#6366f1']} onChange={(c) => c && set({ redactColor: c })} />
              <p className="text-xs text-fg-subtle">Exported images contain only the solid color here — the original pixels are permanently replaced.</p>
            </>
          )}
          {!['blur', 'pixelate', 'redact', 'highlighter'].includes(ctx) && (
            <Slider label="Opacity" min={0.1} max={1} step={0.05} {...sliderProps('opacity')} format={(n) => `${Math.round(n * 100)}%`} id="fr-opacity" />
          )}
        </Section>
      )}

      {selected.length > 0 && (
        <Section title="Arrange">
          <div className="flex flex-wrap gap-1">
            <IconButton label="Bring to front" shortcut="Shift+]" variant="secondary" size="sm" onClick={() => store.reorder('front')}>
              <ArrowUpToLine size={15} />
            </IconButton>
            <IconButton label="Bring forward" shortcut="]" variant="secondary" size="sm" onClick={() => store.reorder('forward')}>
              <ArrowUp size={15} />
            </IconButton>
            <IconButton label="Send backward" shortcut="[" variant="secondary" size="sm" onClick={() => store.reorder('backward')}>
              <ArrowDown size={15} />
            </IconButton>
            <IconButton label="Send to back" shortcut="Shift+[" variant="secondary" size="sm" onClick={() => store.reorder('back')}>
              <ArrowDownToLine size={15} />
            </IconButton>
            <div className="mx-1 w-px bg-border" />
            <IconButton label="Duplicate" shortcut="Ctrl+D" variant="secondary" size="sm" onClick={store.duplicateSelection}>
              <Copy size={15} />
            </IconButton>
            <IconButton label="Delete" shortcut="Del" variant="secondary" size="sm" onClick={store.deleteSelection}>
              <Trash2 size={15} />
            </IconButton>
          </div>
          {selected.some((o) => o.type === 'blur' || o.type === 'pixelate' || o.type === 'redact') && (
            <p className="text-xs text-fg-subtle">Privacy effects always render beneath annotations.</p>
          )}
        </Section>
      )}

      {ctx === 'none' && selected.length === 0 && state.tool === 'select' && (
        <Section title="Tips">
          <ul className="space-y-1.5 text-[13px] text-fg-subtle">
            <li>Pick a tool on the left, then drag on the image.</li>
            <li>Hold <strong className="text-fg-muted">Shift</strong> for straight lines and perfect squares.</li>
            <li>Scroll to pan · <strong className="text-fg-muted">Ctrl + scroll</strong> to zoom.</li>
            <li>Double-click text to edit it.</li>
          </ul>
        </Section>
      )}

      <Section title="Image">
        <div className="flex flex-wrap gap-1">
          <IconButton label="Rotate left" variant="secondary" size="sm" onClick={() => store.rotate('ccw')}>
            <RotateCcw size={15} />
          </IconButton>
          <IconButton label="Rotate right" variant="secondary" size="sm" onClick={() => store.rotate('cw')}>
            <RotateCw size={15} />
          </IconButton>
          <IconButton label="Flip horizontally" variant="secondary" size="sm" onClick={() => store.flip('h')}>
            <FlipHorizontal2 size={15} />
          </IconButton>
          <IconButton label="Flip vertically" variant="secondary" size="sm" onClick={() => store.flip('v')}>
            <FlipVertical2 size={15} />
          </IconButton>
          <IconButton label="Resize image" variant="secondary" size="sm" onClick={onResize}>
            <Maximize2 size={15} />
          </IconButton>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-fg-subtle">Size</dt>
          <dd className="tabular-nums text-fg-muted">{formatDimensions(state.doc.output.width, state.doc.output.height)} px</dd>
          <dt className="text-fg-subtle">Original</dt>
          <dd className="tabular-nums text-fg-muted">{formatDimensions(state.doc.source.width, state.doc.source.height)} px</dd>
        </dl>
      </Section>

      <LayerList store={store} state={state} />

      <div className="mt-auto px-4 py-3">
        <Button variant="ghost" size="sm" icon={<Undo2 size={14} />} onClick={store.reset} disabled={!state.doc.objects.length && state.doc.output.width === state.doc.source.width && state.doc.crop.w === state.doc.source.width && state.doc.orientation[0] === 1}>
          Reset all edits
        </Button>
      </div>
    </aside>
  );
}

function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-[12px] border border-warning/20 bg-warning-soft p-3 text-[12px] leading-snug text-warning">
      <ShieldAlert size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function LayerList({ store, state }: { store: EditorStore; state: EditorState }) {
  const objects = [...state.doc.objects].reverse();
  if (!objects.length) return null;
  return (
    <Section title={`Layers (${objects.length})`}>
      <ul className="-mx-2 space-y-0.5" aria-label="Layers">
        {objects.map((o) => (
          <li key={o.id}>
            <div
              className={cx(
                'group flex h-8 items-center gap-2 rounded-[10px] px-2 text-[13px] transition-colors duration-150',
                state.selection.includes(o.id) ? 'bg-primary-soft font-medium text-primary-soft-fg' : 'text-fg-muted hover:bg-surface-2',
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={(e) => {
                  if (state.tool !== 'select') store.setTool('select');
                  store.select(e.shiftKey ? [...new Set([...state.selection, o.id])] : [o.id]);
                }}
              >
                <span className="h-3 w-3 shrink-0 rounded-sm border border-black/10" style={{ background: swatch(o) }} aria-hidden />
                <span className="truncate">{layerName(o)}</span>
              </button>
              <button
                type="button"
                aria-label={`Delete ${layerName(o)}`}
                className="invisible text-fg-subtle hover:text-danger group-hover:visible group-focus-within:visible"
                onClick={() => store.deleteObjects([o.id])}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function layerName(o: EditorObject): string {
  if (o.type === 'text') return o.text.trim().split('\n')[0].slice(0, 28) || 'Text';
  if (o.type === 'marker') return `Step ${o.n}`;
  if (o.type === 'symbol') return SYMBOL_LABELS[o.symbol];
  if (o.type === 'rect' && o.radius > 0) return 'Rounded rectangle';
  return OBJECT_LABELS[o.type];
}

function swatch(o: EditorObject): string {
  switch (o.type) {
    case 'rect':
    case 'ellipse':
      return o.fill ?? o.stroke;
    case 'marker':
      return o.fill;
    case 'redact':
      return o.color;
    case 'blur':
    case 'pixelate':
      return 'repeating-linear-gradient(45deg,#c7d2fe 0 3px,#e0e7ff 3px 6px)';
    default:
      return 'color' in o ? o.color : '#999';
  }
}
