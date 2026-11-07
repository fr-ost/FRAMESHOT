/**
 * Editor state container (framework-agnostic; React subscribes through
 * useSyncExternalStore). Documents are immutable: every edit produces a new
 * EditorDoc, so undo/redo is a simple stack of snapshots.
 *
 * Gestures (dragging, drawing) update the document transiently and commit a
 * single history entry when they end.
 */
import type { Rect } from '../../core/types';
import { moveObject, nextMarkerNumber, selectionBounds } from './objects';
import { cropDoc, flipDoc, resetDoc, resizeDoc, rotateDoc } from './transform';
import type { EditorDoc, EditorObject, FontKey, SymbolKey } from './types';

export type ToolId =
  | 'select'
  | 'pan'
  | 'crop'
  | 'arrow'
  | 'line'
  | 'rect'
  | 'roundrect'
  | 'ellipse'
  | 'pen'
  | 'highlighter'
  | 'text'
  | 'marker'
  | 'symbol'
  | 'blur'
  | 'pixelate'
  | 'redact';

export interface ToolStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
  fill: string | null;
  radius: number;
  dashed: boolean;
  heads: 'end' | 'both';
  font: FontKey;
  fontSize: number;
  bold: boolean;
  textBackground: string | null;
  textOutline: boolean;
  highlighterColor: string;
  highlighterWidth: number;
  markerSize: number;
  symbol: SymbolKey;
  symbolSize: number;
  blurRadius: number;
  pixelSize: number;
  redactColor: string;
}

export const DEFAULT_STYLE: ToolStyle = {
  color: '#ef4444',
  strokeWidth: 4,
  opacity: 1,
  fill: null,
  radius: 12,
  dashed: false,
  heads: 'end',
  font: 'sans',
  fontSize: 28,
  bold: true,
  textBackground: null,
  textOutline: false,
  highlighterColor: '#facc15',
  highlighterWidth: 22,
  markerSize: 36,
  symbol: 'check',
  symbolSize: 40,
  blurRadius: 14,
  pixelSize: 14,
  redactColor: '#000000',
};

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface EditorState {
  doc: EditorDoc;
  selection: string[];
  tool: ToolId;
  style: ToolStyle;
  view: ViewState;
  editingTextId: string | null;
  cropRect: Rect | null;
  canUndo: boolean;
  canRedo: boolean;
  /** Increments on every document change (used for autosave). */
  revision: number;
  /** True while a pointer gesture is in progress. */
  gesture: boolean;
}

const HISTORY_LIMIT = 100;
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 16;

let idCounter = 0;
export function objectId(): string {
  idCounter = (idCounter + 1) % 1e9;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export class EditorStore {
  private state: EditorState;
  private past: EditorDoc[] = [];
  private future: EditorDoc[] = [];
  private gestureBase: EditorDoc | null = null;
  private listeners = new Set<() => void>();

  constructor(doc: EditorDoc, style: Partial<ToolStyle> = {}) {
    this.state = {
      doc,
      selection: [],
      tool: 'select',
      style: { ...DEFAULT_STYLE, ...style },
      view: { zoom: 1, panX: 0, panY: 0 },
      editingTextId: null,
      cropRect: null,
      canUndo: false,
      canRedo: false,
      revision: 0,
      gesture: false,
    };
  }

  // ── Subscription ──
  getState = (): EditorState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<EditorState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private flags() {
    return { canUndo: this.past.length > 0, canRedo: this.future.length > 0 };
  }

  // ── History ──
  /** Commits a new document as one undoable step. */
  commit(doc: EditorDoc, extra: Partial<EditorState> = {}): void {
    if (doc === this.state.doc) {
      if (Object.keys(extra).length) this.set(extra);
      return;
    }
    this.past.push(this.state.doc);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    const selection = (extra.selection ?? this.state.selection).filter((id) => doc.objects.some((o) => o.id === id));
    this.set({ ...extra, doc, selection, revision: this.state.revision + 1, ...this.flags() });
  }

  beginGesture(): void {
    if (!this.gestureBase) this.gestureBase = this.state.doc;
    if (!this.state.gesture) this.set({ gesture: true });
  }

  /** Updates the document during a gesture without creating history entries. */
  updateTransient(doc: EditorDoc, extra: Partial<EditorState> = {}): void {
    if (!this.gestureBase) this.gestureBase = this.state.doc;
    this.set({ ...extra, doc });
  }

  endGesture(): void {
    const base = this.gestureBase;
    this.gestureBase = null;
    if (base && base !== this.state.doc) {
      this.past.push(base);
      if (this.past.length > HISTORY_LIMIT) this.past.shift();
      this.future = [];
      this.set({ gesture: false, revision: this.state.revision + 1, ...this.flags() });
    } else {
      this.set({ gesture: false });
    }
  }

  cancelGesture(): void {
    const base = this.gestureBase;
    this.gestureBase = null;
    if (base) this.set({ doc: base, gesture: false });
  }

  undo = (): void => {
    if (this.gestureBase) this.endGesture();
    const prev = this.past.pop();
    if (!prev) return;
    this.future.push(this.state.doc);
    this.set({ doc: prev, editingTextId: null, revision: this.state.revision + 1, ...this.validSelection(prev), ...this.flags() });
  };

  redo = (): void => {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.state.doc);
    this.set({ doc: next, editingTextId: null, revision: this.state.revision + 1, ...this.validSelection(next), ...this.flags() });
  };

  private validSelection(doc: EditorDoc) {
    return { selection: this.state.selection.filter((id) => doc.objects.some((o) => o.id === id)) };
  }

  // ── Tools, style, view ──
  setTool = (tool: ToolId): void => {
    const patch: Partial<EditorState> = { tool, editingTextId: null };
    if (tool !== 'select') patch.selection = [];
    patch.cropRect = tool === 'crop' ? { x: 0, y: 0, w: this.state.doc.output.width, h: this.state.doc.output.height } : null;
    this.set(patch);
  };

  /** Updates tool defaults and applies the same change to selected objects. */
  setStyle = (patch: Partial<ToolStyle>): void => {
    const style = { ...this.state.style, ...patch };
    const sel = new Set(this.state.selection);
    if (sel.size === 0) {
      this.set({ style });
      return;
    }
    const objects = this.state.doc.objects.map((o) => (sel.has(o.id) ? applyStyle(o, patch) : o));
    this.commit({ ...this.state.doc, objects }, { style });
  };

  /** Live style preview (e.g. while dragging a slider): one undo step on commit. */
  previewStyle = (patch: Partial<ToolStyle>): void => {
    const style = { ...this.state.style, ...patch };
    const sel = new Set(this.state.selection);
    if (sel.size === 0) {
      this.set({ style });
      return;
    }
    this.beginGesture();
    const objects = this.state.doc.objects.map((o) => (sel.has(o.id) ? applyStyle(o, patch) : o));
    this.updateTransient({ ...this.state.doc, objects }, { style });
  };

  commitPreview = (): void => {
    if (this.gestureBase) this.endGesture();
  };

  setView = (view: Partial<ViewState>): void => {
    const v = { ...this.state.view, ...view };
    v.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom));
    this.set({ view: v });
  };

  /** Zooms keeping the given screen point fixed. */
  zoomAt = (zoom: number, sx: number, sy: number): void => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const { view } = this.state;
    const dx = (sx - view.panX) / view.zoom;
    const dy = (sy - view.panY) / view.zoom;
    this.set({ view: { zoom: z, panX: sx - dx * z, panY: sy - dy * z } });
  };

  fit = (viewportW: number, viewportH: number, padding = 40): void => {
    const { width, height } = this.state.doc.output;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((viewportW - padding * 2) / width, (viewportH - padding * 2) / height, 1)));
    this.set({ view: { zoom, panX: (viewportW - width * zoom) / 2, panY: Math.max(padding, (viewportH - height * zoom) / 2) } });
  };

  /** Fits the width (better for very tall full-page captures). */
  fitWidth = (viewportW: number, viewportH: number, padding = 40): void => {
    const { width, height } = this.state.doc.output;
    const zoom = Math.min(1, Math.max(MIN_ZOOM, (viewportW - padding * 2) / width));
    void height;
    void viewportH;
    this.set({ view: { zoom, panX: (viewportW - width * zoom) / 2, panY: padding } });
  };

  actualSize = (viewportW: number, viewportH: number): void => {
    const { width, height } = this.state.doc.output;
    this.set({ view: { zoom: 1, panX: Math.max(20, (viewportW - width) / 2), panY: Math.max(20, (viewportH - height) / 2) } });
  };

  // ── Selection ──
  select = (ids: string[]): void => {
    this.set({ selection: ids, editingTextId: null });
  };

  selectAll = (): void => {
    this.set({ selection: this.state.doc.objects.map((o) => o.id), tool: 'select' });
  };

  selectedObjects(): EditorObject[] {
    const sel = new Set(this.state.selection);
    return this.state.doc.objects.filter((o) => sel.has(o.id));
  }

  setEditingText = (id: string | null): void => {
    this.set({ editingTextId: id, selection: id ? [id] : this.state.selection });
  };

  // ── Object edits ──
  addObject(obj: EditorObject, select = true): void {
    this.commit({ ...this.state.doc, objects: [...this.state.doc.objects, obj] }, select ? { selection: [obj.id] } : {});
  }

  updateObject(id: string, patch: Partial<EditorObject>, transient = false): void {
    const objects = this.state.doc.objects.map((o) => (o.id === id ? ({ ...o, ...patch } as EditorObject) : o));
    const doc = { ...this.state.doc, objects };
    if (transient) this.updateTransient(doc);
    else this.commit(doc);
  }

  replaceObjects(next: EditorObject[], transient = false): void {
    const doc = { ...this.state.doc, objects: next };
    if (transient) this.updateTransient(doc);
    else this.commit(doc);
  }

  deleteObjects(ids: string[]): void {
    const set = new Set(ids);
    if (!this.state.doc.objects.some((o) => set.has(o.id))) return;
    this.commit(
      { ...this.state.doc, objects: this.state.doc.objects.filter((o) => !set.has(o.id)) },
      { selection: this.state.selection.filter((id) => !set.has(id)), editingTextId: null },
    );
  }

  deleteSelection = (): void => this.deleteObjects(this.state.selection);

  duplicateSelection = (): void => {
    const sel = this.selectedObjects();
    if (!sel.length) return;
    const offset = Math.max(12, Math.round(this.state.doc.output.width * 0.01));
    let n = nextMarkerNumber(this.state.doc.objects);
    const copies = sel.map((o) => {
      const moved = moveObject({ ...o, id: objectId() } as EditorObject, offset, offset);
      return moved.type === 'marker' ? { ...moved, n: n++ } : moved;
    });
    this.commit({ ...this.state.doc, objects: [...this.state.doc.objects, ...copies] }, { selection: copies.map((c) => c.id) });
  };

  nudgeSelection = (dx: number, dy: number): void => {
    const sel = new Set(this.state.selection);
    if (!sel.size) return;
    this.commit({ ...this.state.doc, objects: this.state.doc.objects.map((o) => (sel.has(o.id) ? moveObject(o, dx, dy) : o)) });
  };

  reorder = (op: 'front' | 'back' | 'forward' | 'backward'): void => {
    const sel = new Set(this.state.selection);
    if (!sel.size) return;
    const objs = [...this.state.doc.objects];
    if (op === 'front') {
      this.commit({ ...this.state.doc, objects: [...objs.filter((o) => !sel.has(o.id)), ...objs.filter((o) => sel.has(o.id))] });
      return;
    }
    if (op === 'back') {
      this.commit({ ...this.state.doc, objects: [...objs.filter((o) => sel.has(o.id)), ...objs.filter((o) => !sel.has(o.id))] });
      return;
    }
    if (op === 'forward') {
      for (let i = objs.length - 2; i >= 0; i--) {
        if (sel.has(objs[i].id) && !sel.has(objs[i + 1].id)) [objs[i], objs[i + 1]] = [objs[i + 1], objs[i]];
      }
    } else {
      for (let i = 1; i < objs.length; i++) {
        if (sel.has(objs[i].id) && !sel.has(objs[i - 1].id)) [objs[i], objs[i - 1]] = [objs[i - 1], objs[i]];
      }
    }
    this.commit({ ...this.state.doc, objects: objs });
  };

  // ── Image operations ──
  rotate = (dir: 'cw' | 'ccw'): void => this.commit(rotateDoc(this.state.doc, dir), { cropRect: null, tool: this.state.tool === 'crop' ? 'select' : this.state.tool });

  flip = (axis: 'h' | 'v'): void => this.commit(flipDoc(this.state.doc, axis));

  setCropRect = (rect: Rect | null): void => this.set({ cropRect: rect });

  applyCrop = (): void => {
    const r = this.state.cropRect;
    if (!r) return;
    const next = cropDoc(this.state.doc, r);
    this.commit(next, { cropRect: null, tool: 'select' });
  };

  resize = (width: number, height: number): void => this.commit(resizeDoc(this.state.doc, width, height));

  reset = (): void => this.commit(resetDoc(this.state.doc), { selection: [], cropRect: null, editingTextId: null });

  selectionBounds(): Rect | null {
    return selectionBounds(this.selectedObjects());
  }
}

/** Applies a style patch to an object, mapping generic style keys to fields. */
export function applyStyle(o: EditorObject, s: Partial<ToolStyle>): EditorObject {
  const out: Record<string, unknown> = { ...o };
  if (s.opacity !== undefined) out.opacity = s.opacity;
  switch (o.type) {
    case 'arrow':
      if (s.color !== undefined) out.color = s.color;
      if (s.strokeWidth !== undefined) out.width = s.strokeWidth;
      if (s.heads !== undefined) out.heads = s.heads;
      break;
    case 'line':
      if (s.color !== undefined) out.color = s.color;
      if (s.strokeWidth !== undefined) out.width = s.strokeWidth;
      if (s.dashed !== undefined) out.dashed = s.dashed;
      break;
    case 'rect':
    case 'ellipse':
      if (o.type === 'rect' && s.radius !== undefined) out.radius = s.radius;
      if (s.color !== undefined) out.stroke = s.color;
      if (s.strokeWidth !== undefined) out.strokeWidth = s.strokeWidth;
      if (s.fill !== undefined) out.fill = s.fill;
      break;
    case 'pen':
      if (s.color !== undefined) out.color = s.color;
      if (s.strokeWidth !== undefined) out.width = s.strokeWidth;
      break;
    case 'highlighter':
      if (s.highlighterColor !== undefined) out.color = s.highlighterColor;
      if (s.highlighterWidth !== undefined) out.width = s.highlighterWidth;
      break;
    case 'text':
      if (s.color !== undefined) out.color = s.color;
      if (s.font !== undefined) out.font = s.font;
      if (s.fontSize !== undefined) out.size = s.fontSize;
      if (s.bold !== undefined) out.bold = s.bold;
      if (s.textBackground !== undefined) out.background = s.textBackground;
      if (s.textOutline !== undefined) out.outline = s.textOutline;
      break;
    case 'marker':
      if (s.color !== undefined) out.fill = s.color;
      if (s.markerSize !== undefined) out.size = s.markerSize;
      break;
    case 'symbol':
      if (s.color !== undefined) out.color = s.color;
      if (s.symbol !== undefined) out.symbol = s.symbol;
      if (s.symbolSize !== undefined) out.size = s.symbolSize;
      break;
    case 'blur':
      if (s.blurRadius !== undefined) out.radius = s.blurRadius;
      break;
    case 'pixelate':
      if (s.pixelSize !== undefined) out.size = s.pixelSize;
      break;
    case 'redact':
      if (s.redactColor !== undefined) out.color = s.redactColor;
      break;
  }
  return out as unknown as EditorObject;
}

/** Reads the style an object implies (for syncing the properties panel). */
export function styleOf(o: EditorObject): Partial<ToolStyle> {
  switch (o.type) {
    case 'arrow':
      return { color: o.color, strokeWidth: o.width, opacity: o.opacity, heads: o.heads };
    case 'line':
      return { color: o.color, strokeWidth: o.width, opacity: o.opacity, dashed: o.dashed };
    case 'rect':
      return { color: o.stroke, strokeWidth: o.strokeWidth, fill: o.fill, radius: o.radius, opacity: o.opacity };
    case 'ellipse':
      return { color: o.stroke, strokeWidth: o.strokeWidth, fill: o.fill, opacity: o.opacity };
    case 'pen':
      return { color: o.color, strokeWidth: o.width, opacity: o.opacity };
    case 'highlighter':
      return { highlighterColor: o.color, highlighterWidth: o.width, opacity: o.opacity };
    case 'text':
      return { color: o.color, font: o.font, fontSize: o.size, bold: o.bold, textBackground: o.background, textOutline: o.outline, opacity: o.opacity };
    case 'marker':
      return { color: o.fill, markerSize: o.size, opacity: o.opacity };
    case 'symbol':
      return { color: o.color, symbol: o.symbol, symbolSize: o.size, opacity: o.opacity };
    case 'blur':
      return { blurRadius: o.radius };
    case 'pixelate':
      return { pixelSize: o.size };
    case 'redact':
      return { redactColor: o.color };
  }
}
