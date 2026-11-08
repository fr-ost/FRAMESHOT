/**
 * Pointer interaction for the editor canvas: selecting, moving, resizing,
 * drawing every annotation type, cropping, panning and zooming.
 */
import type { Point, Rect } from '../../core/types';
import { aspectResize,
  fitObject,
  handleAt,
  hitTest,
  intersectsRect,
  isLinear,
  moveObject,
  nextMarkerNumber,
  resizeBounds,
  selectionBounds,
  simplifyPoints,
  type HandleId,
} from '../model/objects';
import { objectId, type EditorStore, type ToolId } from '../model/store';
import type { EditorObject, TextObject } from '../model/types';
import { contrastColor } from '../render/draw';

type Drag =
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | { kind: 'move'; start: Point; originals: EditorObject[]; moved: boolean }
  | { kind: 'resize'; handle: HandleId; originals: EditorObject[]; bounds: Rect }
  | { kind: 'draw'; start: Point; object: EditorObject }
  | { kind: 'marquee'; start: Point; additive: boolean; base: string[] }
  | { kind: 'crop'; mode: 'new' | 'move' | HandleId; start: Point; orig: Rect };

export interface InteractionState {
  draft: EditorObject | null;
  marquee: Rect | null;
  live: Set<string>;
  hoverId: string | null;
  cursor: string;
}

const DRAW_TOOLS: ReadonlySet<ToolId> = new Set([
  'arrow',
  'line',
  'rect',
  'roundrect',
  'ellipse',
  'pen',
  'highlighter',
  'blur',
  'pixelate',
  'redact',
]);

export class CanvasInteraction {
  state: InteractionState = { draft: null, marquee: null, live: new Set(), hoverId: null, cursor: 'default' };
  private drag: Drag | null = null;
  private spaceDown = false;
  private pointerId: number | null = null;

  constructor(
    private store: EditorStore,
    private canvas: HTMLCanvasElement,
    private onChange: () => void,
  ) {}

  setSpace(down: boolean): void {
    this.spaceDown = down;
    this.updateCursor(null);
  }

  private toDoc(e: { clientX: number; clientY: number }): Point {
    const rect = this.canvas.getBoundingClientRect();
    const { zoom, panX, panY } = this.store.getState().view;
    return { x: (e.clientX - rect.left - panX) / zoom, y: (e.clientY - rect.top - panY) / zoom };
  }

  private tol(px = 7): number {
    return px / this.store.getState().view.zoom;
  }

  private emit(): void {
    this.onChange();
  }

  // ── Pointer events ──

  onPointerDown = (e: PointerEvent): void => {
    const s = this.store.getState();
    if (s.editingTextId) return; // the text overlay handles its own events
    // Prevent the browser's default focus change / text selection, which would
    // otherwise steal focus from the inline text editor we may open.
    e.preventDefault();
    // ...but do move keyboard focus off panel controls (a slider, a field), so
    // arrow keys and shortcuts act on the canvas again, not on that control.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body && active.matches('input, select, textarea, button, [contenteditable="true"]')) active.blur();
    const p = this.toDoc(e);
    this.canvas.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;

    if (e.button === 1 || this.spaceDown || s.tool === 'pan') {
      this.drag = { kind: 'pan', startX: e.clientX, startY: e.clientY, panX: s.view.panX, panY: s.view.panY };
      this.updateCursor('grabbing');
      return;
    }
    if (e.button !== 0) return;

    if (s.tool === 'crop') {
      this.beginCrop(p);
      return;
    }

    // Handles of the current selection take priority in every tool.
    const selected = this.store.selectedObjects();
    const handle = selected.length ? handleAt(selected, p, this.tol(8)) : null;
    if (handle) {
      this.store.beginGesture();
      this.drag = { kind: 'resize', handle, originals: selected, bounds: selectionBounds(selected)! };
      this.state.live = new Set(selected.map((o) => o.id));
      return;
    }

    if (s.tool === 'select') {
      const hit = hitTest(s.doc.objects, p, this.tol());
      if (hit) {
        if (e.detail >= 2 && hit.type === 'text') {
          this.editText(hit);
          return;
        }
        let selection = s.selection;
        if (e.shiftKey) {
          selection = selection.includes(hit.id) ? selection.filter((id) => id !== hit.id) : [...selection, hit.id];
        } else if (!selection.includes(hit.id)) {
          selection = [hit.id];
        }
        this.store.select(selection);
        const originals = s.doc.objects.filter((o) => selection.includes(o.id));
        this.store.beginGesture();
        this.drag = { kind: 'move', start: p, originals, moved: false };
        this.state.live = new Set(selection);
      } else {
        if (!e.shiftKey) this.store.select([]);
        this.drag = { kind: 'marquee', start: p, additive: e.shiftKey, base: e.shiftKey ? s.selection : [] };
      }
      this.emit();
      return;
    }

    if (s.tool === 'text') {
      const hit = hitTest(s.doc.objects, p, this.tol());
      if (hit?.type === 'text') this.editText(hit);
      else this.createText(p);
      return;
    }
    if (s.tool === 'marker') {
      this.store.addObject({
        id: objectId(),
        type: 'marker',
        x: p.x,
        y: p.y,
        n: nextMarkerNumber(s.doc.objects),
        size: s.style.markerSize,
        fill: s.style.color,
        textColor: contrastColor(s.style.color),
        opacity: s.style.opacity,
      });
      return;
    }
    if (s.tool === 'symbol') {
      this.store.addObject({
        id: objectId(),
        type: 'symbol',
        x: p.x,
        y: p.y,
        size: s.style.symbolSize,
        symbol: s.style.symbol,
        color: s.style.color,
        opacity: s.style.opacity,
      });
      return;
    }
    if (DRAW_TOOLS.has(s.tool)) {
      const object = this.newShape(s.tool, p);
      if (object) {
        this.drag = { kind: 'draw', start: p, object };
        this.state.draft = object;
        this.emit();
      }
    }
  };

  onPointerMove = (e: PointerEvent): void => {
    const p = this.toDoc(e);
    const d = this.drag;
    if (!d) {
      this.updateHover(p);
      return;
    }
    const s = this.store.getState();
    switch (d.kind) {
      case 'pan':
        this.store.setView({ panX: d.panX + e.clientX - d.startX, panY: d.panY + e.clientY - d.startY });
        break;
      case 'move': {
        let dx = p.x - d.start.x;
        let dy = p.y - d.start.y;
        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        if (!d.moved && Math.hypot(dx, dy) < this.tol(3)) return;
        d.moved = true;
        const byId = new Map(d.originals.map((o) => [o.id, moveObject(o, dx, dy)]));
        this.store.replaceObjects(s.doc.objects.map((o) => byId.get(o.id) ?? o), true);
        break;
      }
      case 'resize': {
        if (d.originals.length === 1 && isLinear(d.originals[0]) && (d.handle === 'p1' || d.handle === 'p2')) {
          const o = d.originals[0];
          const anchor = d.handle === 'p1' ? { x: o.x2, y: o.y2 } : { x: o.x1, y: o.y1 };
          const q = e.shiftKey ? snapAngle(anchor, p) : p;
          const patch = d.handle === 'p1' ? { x1: q.x, y1: q.y } : { x2: q.x, y2: q.y };
          this.store.updateObject(o.id, patch, true);
        } else {
          const uniform =
            e.shiftKey || (d.originals.length === 1 && ['text', 'marker', 'symbol'].includes(d.originals[0].type));
          const nb = resizeBounds(d.bounds, d.handle, p, uniform);
          const byId = new Map(d.originals.map((o) => [o.id, fitObject(o, d.bounds, nb)]));
          this.store.replaceObjects(s.doc.objects.map((o) => byId.get(o.id) ?? o), true);
        }
        break;
      }
      case 'draw':
        this.state.draft = this.updateShape(d.object, d.start, p, e.shiftKey);
        d.object = this.state.draft;
        this.emit();
        break;
      case 'marquee': {
        const r = normRect(d.start, p);
        this.state.marquee = r;
        const ids = s.doc.objects.filter((o) => intersectsRect(o, r)).map((o) => o.id);
        this.store.select([...new Set([...d.base, ...ids])]);
        this.emit();
        break;
      }
      case 'crop':
        this.updateCrop(d, p, e.shiftKey);
        break;
    }
  };

  onPointerUp = (e: PointerEvent): void => {
    if (this.pointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.pointerId);
      } catch {
        /* ignore */
      }
      this.pointerId = null;
    }
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    switch (d.kind) {
      case 'pan':
        break;
      case 'move':
      case 'resize':
        this.store.endGesture();
        break;
      case 'draw': {
        const obj = this.finalizeShape(d.object);
        if (obj) this.store.addObject(obj);
        this.state.draft = null;
        break;
      }
      case 'marquee':
        this.state.marquee = null;
        break;
      case 'crop':
        break;
    }
    this.state.live = new Set();
    this.updateHover(this.toDoc(e));
    this.emit();
  };

  onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const s = this.store.getState();
    const rect = this.canvas.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025));
      this.store.zoomAt(s.view.zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      const k = e.deltaMode === 1 ? 16 : 1;
      const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k;
      const dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * k;
      this.store.setView({ panX: s.view.panX - dx, panY: s.view.panY - dy });
    }
  };

  onDoubleClick = (e: MouseEvent): void => {
    const s = this.store.getState();
    if (s.tool === 'crop') {
      this.store.applyCrop();
      return;
    }
    const hit = hitTest(s.doc.objects, this.toDoc(e), this.tol());
    if (hit?.type === 'text') this.editText(hit);
  };

  // ── Hover / cursor ──

  private updateHover(p: Point): void {
    const s = this.store.getState();
    let cursor = 'default';
    let hoverId: string | null = null;
    if (this.spaceDown || s.tool === 'pan') cursor = 'grab';
    else if (s.tool === 'crop') cursor = cropCursor(s.cropRect, p, this.tol(8));
    else {
      const selected = this.store.selectedObjects();
      const handle = selected.length ? handleAt(selected, p, this.tol(8)) : null;
      if (handle) cursor = handleCursor(handle);
      else if (s.tool === 'select') {
        const hit = hitTest(s.doc.objects, p, this.tol());
        hoverId = hit?.id ?? null;
        cursor = hit ? 'move' : 'default';
      } else if (s.tool === 'text') cursor = 'text';
      else cursor = 'crosshair';
    }
    const changed = hoverId !== this.state.hoverId;
    this.state.hoverId = hoverId;
    this.updateCursor(cursor);
    if (changed) this.emit();
  }

  private updateCursor(cursor: string | null): void {
    const c = cursor ?? (this.spaceDown ? 'grab' : this.state.cursor);
    this.state.cursor = c;
    this.canvas.style.cursor = c;
  }

  // ── Shapes ──

  private newShape(tool: ToolId, p: Point): EditorObject | null {
    const st = this.store.getState().style;
    const id = objectId();
    const base = { id, opacity: st.opacity };
    switch (tool) {
      case 'arrow':
        return { ...base, type: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: st.color, width: st.strokeWidth, heads: st.heads };
      case 'line':
        return { ...base, type: 'line', x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: st.color, width: st.strokeWidth, dashed: st.dashed };
      case 'rect':
      case 'roundrect':
        return { ...base, type: 'rect', x: p.x, y: p.y, w: 0, h: 0, stroke: st.color, strokeWidth: st.strokeWidth, fill: st.fill, radius: tool === 'roundrect' ? Math.max(4, st.radius) : 0 };
      case 'ellipse':
        return { ...base, type: 'ellipse', x: p.x, y: p.y, w: 0, h: 0, stroke: st.color, strokeWidth: st.strokeWidth, fill: st.fill };
      case 'pen':
        return { ...base, type: 'pen', points: [p.x, p.y], color: st.color, width: st.strokeWidth };
      case 'highlighter':
        return { ...base, type: 'highlighter', points: [p.x, p.y], color: st.highlighterColor, width: st.highlighterWidth, opacity: 1 };
      case 'blur':
        return { id, opacity: 1, type: 'blur', x: p.x, y: p.y, w: 0, h: 0, radius: st.blurRadius };
      case 'pixelate':
        return { id, opacity: 1, type: 'pixelate', x: p.x, y: p.y, w: 0, h: 0, size: st.pixelSize };
      case 'redact':
        return { id, opacity: 1, type: 'redact', x: p.x, y: p.y, w: 0, h: 0, color: st.redactColor };
      default:
        return null;
    }
  }

  private updateShape(o: EditorObject, start: Point, p: Point, shift: boolean): EditorObject {
    switch (o.type) {
      case 'arrow':
      case 'line': {
        const q = shift ? snapAngle(start, p) : p;
        return { ...o, x2: q.x, y2: q.y };
      }
      case 'pen':
      case 'highlighter': {
        if (shift) return { ...o, points: [start.x, start.y, p.x, p.y] };
        const pts = o.points;
        const lx = pts[pts.length - 2];
        const ly = pts[pts.length - 1];
        if (Math.hypot(p.x - lx, p.y - ly) < this.tol(1.5)) return o;
        return { ...o, points: [...pts, p.x, p.y] };
      }
      default: {
        let w = p.x - start.x;
        let h = p.y - start.y;
        if (shift) {
          const m = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * m;
          h = Math.sign(h || 1) * m;
        }
        const r = normRect(start, { x: start.x + w, y: start.y + h });
        return { ...o, ...r } as EditorObject;
      }
    }
  }

  private finalizeShape(o: EditorObject): EditorObject | null {
    const min = this.tol(3);
    switch (o.type) {
      case 'arrow':
      case 'line':
        return Math.hypot(o.x2 - o.x1, o.y2 - o.y1) < min ? null : o;
      case 'pen':
      case 'highlighter':
        if (o.points.length < 4) return { ...o, points: [o.points[0], o.points[1], o.points[0] + 0.01, o.points[1] + 0.01] };
        return { ...o, points: simplifyPoints(o.points, this.tol(0.6)) };
      default:
        if ('w' in o && (o.w < min || o.h < min)) return null;
        return o;
    }
  }

  // ── Text ──

  private createText(p: Point): void {
    const st = this.store.getState().style;
    const t: TextObject = {
      id: objectId(),
      type: 'text',
      x: p.x,
      y: p.y - st.fontSize * 0.6,
      text: '',
      font: st.font,
      size: st.fontSize,
      color: st.color,
      bold: st.bold,
      background: st.textBackground,
      outline: st.textOutline,
      opacity: st.opacity,
    };
    this.store.beginGesture();
    this.store.updateTransient({ ...this.store.getState().doc, objects: [...this.store.getState().doc.objects, t] }, { selection: [t.id] });
    this.store.setEditingText(t.id);
  }

  editText(t: TextObject): void {
    this.store.beginGesture();
    this.store.setEditingText(t.id);
  }

  // ── Crop ──

  private beginCrop(p: Point): void {
    const s = this.store.getState();
    const r = s.cropRect ? normRectR(s.cropRect) : { x: 0, y: 0, w: s.doc.output.width, h: s.doc.output.height };
    const tol = this.tol(8);
    const handle = cropHandleAt(r, p, tol);
    let mode: 'new' | 'move' | HandleId = 'new';
    if (handle) mode = handle;
    else if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) mode = 'move';
    this.drag = { kind: 'crop', mode, start: p, orig: r };
  }

  private updateCrop(d: Extract<Drag, { kind: 'crop' }>, p: Point, shift: boolean): void {
    const s = this.store.getState();
    const W = s.doc.output.width;
    const H = s.doc.output.height;
    const clampP = (q: Point) => ({ x: Math.max(0, Math.min(W, q.x)), y: Math.max(0, Math.min(H, q.y)) });
    let next: Rect;
    if (d.mode === 'new') next = normRect(clampP(d.start), clampP(p));
    else if (d.mode === 'move') {
      const dx = Math.max(-d.orig.x, Math.min(W - d.orig.x - d.orig.w, p.x - d.start.x));
      const dy = Math.max(-d.orig.y, Math.min(H - d.orig.y - d.orig.h, p.y - d.start.y));
      next = { ...d.orig, x: d.orig.x + dx, y: d.orig.y + dy };
    } else next = resizeBounds(d.orig, d.mode, clampP(p), shift);
    const ratio = this.cropAspect;
    if (ratio && d.mode !== 'move') {
      next = aspectResize(d.orig, d.mode === 'new' ? 'new' : d.mode, d.start, clampP(p), ratio, { w: W, h: H });
    }
    this.store.setCropRect(next);
  }

  /** Locked crop aspect ratio (width / height), or null for free. */
  cropAspect: number | null = null;
}

function snapAngle(a: Point, p: Point): Point {
  const dx = p.x - a.x;
  const dy = p.y - a.y;
  const len = Math.hypot(dx, dy);
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
}

function normRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

function normRectR(r: Rect): Rect {
  return { x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h), w: Math.abs(r.w), h: Math.abs(r.h) };
}

function cropHandleAt(r: Rect, p: Point, tol: number): HandleId | null {
  const pts: [HandleId, number, number][] = [
    ['nw', r.x, r.y],
    ['n', r.x + r.w / 2, r.y],
    ['ne', r.x + r.w, r.y],
    ['e', r.x + r.w, r.y + r.h / 2],
    ['se', r.x + r.w, r.y + r.h],
    ['s', r.x + r.w / 2, r.y + r.h],
    ['sw', r.x, r.y + r.h],
    ['w', r.x, r.y + r.h / 2],
  ];
  for (const [id, x, y] of pts) if (Math.abs(p.x - x) <= tol && Math.abs(p.y - y) <= tol) return id;
  return null;
}

function cropCursor(r: Rect | null, p: Point, tol: number): string {
  if (!r) return 'crosshair';
  const n = normRectR(r);
  const h = cropHandleAt(n, p, tol);
  if (h) return handleCursor(h);
  if (p.x > n.x && p.x < n.x + n.w && p.y > n.y && p.y < n.y + n.h) return 'move';
  return 'crosshair';
}

function handleCursor(h: HandleId): string {
  switch (h) {
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'nw':
    case 'se':
      return 'nwse-resize';
    default:
      return 'grab';
  }
}
