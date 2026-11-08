/**
 * Object geometry: bounds, hit testing, selection handles, moving, resizing.
 * Pure functions; text measurement is injected so this runs in tests too.
 */
import type { Point, Rect, Size } from '../../core/types';
import { estimateTextSize } from './transform';
import type { EditorObject, TextObject } from './types';
import { isEffect } from './types';

export type TextMeasurer = (t: TextObject) => Size;
let measurer: TextMeasurer = (t) => estimateTextSize(t);

export function setTextMeasurer(fn: TextMeasurer): void {
  measurer = fn;
}

export function textPadding(t: Pick<TextObject, 'background' | 'size'>): number {
  return t.background ? Math.round(t.size * 0.3) : 0;
}

export function textBox(t: TextObject): Rect {
  const s = measurer(t);
  const pad = textPadding(t);
  return { x: t.x - pad, y: t.y - pad, w: s.width + pad * 2, h: s.height + pad * 2 };
}

function pointsBounds(points: number[], pad: number): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

/** Axis-aligned visual bounds of an object in document coordinates. */
export function objectBounds(o: EditorObject): Rect {
  switch (o.type) {
    case 'arrow':
    case 'line': {
      const pad = o.type === 'arrow' ? Math.max(o.width * 2, 6) : o.width / 2;
      return pointsBounds([o.x1, o.y1, o.x2, o.y2], pad);
    }
    case 'rect':
    case 'ellipse': {
      const pad = o.strokeWidth / 2;
      return { x: o.x - pad, y: o.y - pad, w: o.w + pad * 2, h: o.h + pad * 2 };
    }
    case 'blur':
    case 'pixelate':
    case 'redact':
      return { x: o.x, y: o.y, w: o.w, h: o.h };
    case 'pen':
    case 'highlighter':
      return pointsBounds(o.points, o.width / 2);
    case 'text':
      return textBox(o);
    case 'marker':
    case 'symbol':
      return { x: o.x - o.size / 2, y: o.y - o.size / 2, w: o.size, h: o.size };
  }
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function inRect(p: Point, r: Rect, pad = 0): boolean {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
}

/** Whether point p (document coords) hits the object; `tol` in document px. */
export function hitsObject(o: EditorObject, p: Point, tol: number): boolean {
  switch (o.type) {
    case 'arrow':
    case 'line':
      return distToSegment(p, { x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }) <= Math.max(tol, o.width / 2 + tol / 2);
    case 'rect': {
      if (o.fill) return inRect(p, o, tol);
      const outer = inRect(p, o, o.strokeWidth / 2 + tol);
      const inner = inRect(p, { x: o.x + o.strokeWidth / 2 + tol, y: o.y + o.strokeWidth / 2 + tol, w: o.w - o.strokeWidth - tol * 2, h: o.h - o.strokeWidth - tol * 2 });
      return outer && !inner;
    }
    case 'ellipse': {
      const rx = o.w / 2;
      const ry = o.h / 2;
      if (rx <= 0 || ry <= 0) return false;
      const cx = o.x + rx;
      const cy = o.y + ry;
      const norm = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
      if (o.fill) return norm <= 1 + tol / Math.min(rx, ry);
      const band = (o.strokeWidth / 2 + tol) / Math.min(rx, ry);
      return Math.abs(norm - 1) <= band;
    }
    case 'pen':
    case 'highlighter': {
      const limit = o.width / 2 + tol;
      for (let i = 0; i + 3 < o.points.length; i += 2) {
        if (distToSegment(p, { x: o.points[i], y: o.points[i + 1] }, { x: o.points[i + 2], y: o.points[i + 3] }) <= limit) return true;
      }
      return o.points.length === 2 && Math.hypot(p.x - o.points[0], p.y - o.points[1]) <= limit;
    }
    case 'text':
    case 'blur':
    case 'pixelate':
    case 'redact':
      return inRect(p, objectBounds(o), tol / 2);
    case 'marker':
    case 'symbol':
      return Math.hypot(p.x - o.x, p.y - o.y) <= o.size / 2 + tol / 2;
  }
}

/**
 * Topmost object under the point. Annotations render above privacy effects,
 * so they are tested first (each group from top to bottom).
 */
export function hitTest(objects: EditorObject[], p: Point, tol: number): EditorObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (!isEffect(o) && hitsObject(o, p, tol)) return o;
  }
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (isEffect(o) && hitsObject(o, p, tol)) return o;
  }
  return null;
}

export function selectionBounds(objects: EditorObject[]): Rect | null {
  if (objects.length === 0) return null;
  let r = objectBounds(objects[0]);
  for (const o of objects.slice(1)) {
    const b = objectBounds(o);
    const x = Math.min(r.x, b.x);
    const y = Math.min(r.y, b.y);
    r = { x, y, w: Math.max(r.x + r.w, b.x + b.w) - x, h: Math.max(r.y + r.h, b.y + b.h) - y };
  }
  return r;
}

export function intersectsRect(o: EditorObject, r: Rect): boolean {
  const b = objectBounds(o);
  return b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y;
}

// ── Handles ─────────────────────────────────────────────────────────────

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'p1' | 'p2';

export function isLinear(o: EditorObject): o is Extract<EditorObject, { type: 'arrow' | 'line' }> {
  return o.type === 'arrow' || o.type === 'line';
}

/** Handles for the selection, in document coordinates. */
export function handlesFor(objects: EditorObject[]): { id: HandleId; x: number; y: number }[] {
  if (objects.length === 1 && isLinear(objects[0])) {
    const o = objects[0];
    return [
      { id: 'p1', x: o.x1, y: o.y1 },
      { id: 'p2', x: o.x2, y: o.y2 },
    ];
  }
  const b = selectionBounds(objects);
  if (!b) return [];
  const { x, y, w, h } = b;
  const all: { id: HandleId; x: number; y: number }[] = [
    { id: 'nw', x, y },
    { id: 'n', x: x + w / 2, y },
    { id: 'ne', x: x + w, y },
    { id: 'e', x: x + w, y: y + h / 2 },
    { id: 'se', x: x + w, y: y + h },
    { id: 's', x: x + w / 2, y: y + h },
    { id: 'sw', x, y: y + h },
    { id: 'w', x, y: y + h / 2 },
  ];
  // Text and point-like objects scale uniformly: corner handles only.
  if (objects.length === 1 && ['text', 'marker', 'symbol'].includes(objects[0].type)) {
    return all.filter((hd) => hd.id.length === 2);
  }
  return all;
}

export function handleAt(objects: EditorObject[], p: Point, tol: number): HandleId | null {
  for (const h of handlesFor(objects)) if (Math.abs(p.x - h.x) <= tol && Math.abs(p.y - h.y) <= tol) return h.id;
  return null;
}

/** Computes the new bounds when dragging a handle. */
export function resizeBounds(b: Rect, handle: HandleId, p: Point, keepAspect: boolean): Rect {
  let x0 = b.x;
  let y0 = b.y;
  let x1 = b.x + b.w;
  let y1 = b.y + b.h;
  if (handle.includes('w')) x0 = p.x;
  if (handle.includes('e')) x1 = p.x;
  if (handle.includes('n')) y0 = p.y;
  if (handle.includes('s')) y1 = p.y;
  if (keepAspect && handle.length === 2 && b.w > 0 && b.h > 0) {
    const ratio = b.w / b.h;
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    if (w / h > ratio) {
      const nh = w / ratio;
      if (handle.includes('n')) y0 = y1 - nh * Math.sign(y1 - y0 || 1);
      else y1 = y0 + nh * Math.sign(y1 - y0 || 1);
    } else {
      const nw = h * ratio;
      if (handle.includes('w')) x0 = x1 - nw * Math.sign(x1 - x0 || 1);
      else x1 = x0 + nw * Math.sign(x1 - x0 || 1);
    }
  }
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(1, Math.abs(x1 - x0)), h: Math.max(1, Math.abs(y1 - y0)) };
}

/** Maps an object from old selection bounds to new bounds. */
export function fitObject(o: EditorObject, from: Rect, to: Rect): EditorObject {
  const sx = from.w > 0 ? to.w / from.w : 1;
  const sy = from.h > 0 ? to.h / from.h : 1;
  const map = (p: Point): Point => ({ x: to.x + (p.x - from.x) * sx, y: to.y + (p.y - from.y) * sy });
  switch (o.type) {
    case 'text': {
      const s = Math.max(0.05, Math.min(sx, sy));
      const tl = map({ x: o.x, y: o.y });
      return { ...o, x: tl.x, y: tl.y, size: Math.max(6, o.size * s) };
    }
    case 'marker':
    case 'symbol': {
      const c = map({ x: o.x, y: o.y });
      return { ...o, x: c.x, y: c.y, size: Math.max(8, o.size * Math.min(sx, sy)) };
    }
    case 'arrow':
    case 'line': {
      const a = map({ x: o.x1, y: o.y1 });
      const b = map({ x: o.x2, y: o.y2 });
      return { ...o, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }
    case 'pen':
    case 'highlighter': {
      const pts: number[] = [];
      for (let i = 0; i < o.points.length; i += 2) {
        const q = map({ x: o.points[i], y: o.points[i + 1] });
        pts.push(q.x, q.y);
      }
      return { ...o, points: pts };
    }
    default: {
      const a = map({ x: o.x, y: o.y });
      const b = map({ x: o.x + o.w, y: o.y + o.h });
      return { ...o, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    }
  }
}

export function moveObject(o: EditorObject, dx: number, dy: number): EditorObject {
  switch (o.type) {
    case 'arrow':
    case 'line':
      return { ...o, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy };
    case 'pen':
    case 'highlighter':
      return { ...o, points: o.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) };
    default:
      return { ...o, x: o.x + dx, y: o.y + dy };
  }
}

/** Ramer–Douglas–Peucker simplification for freehand strokes. */
export function simplifyPoints(points: number[], epsilon: number): number[] {
  if (points.length <= 4) return points;
  const pts: Point[] = [];
  for (let i = 0; i < points.length; i += 2) pts.push({ x: points[i], y: points[i + 1] });
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(pts[i], pts[s], pts[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > epsilon) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out: number[] = [];
  pts.forEach((p, i) => keep[i] && out.push(p.x, p.y));
  return out;
}

/** Next number for a step marker (max existing + 1). */
export function nextMarkerNumber(objects: EditorObject[]): number {
  let max = 0;
  for (const o of objects) if (o.type === 'marker') max = Math.max(max, o.n);
  return max + 1;
}

/**
 * Resizes (or draws) a crop rectangle locked to `ratio` (width / height).
 * Corners keep the opposite corner fixed; edges keep the opposite edge fixed
 * and grow the other dimension around the centre. The result stays inside
 * `bounds` and keeps the ratio exactly.
 */
export function aspectResize(orig: Rect, handle: HandleId | 'new', start: Point, p: Point, ratio: number, bounds: { w: number; h: number }): Rect {
  const r = ratio > 0 ? ratio : 1;
  const fit = (w: number, h: number, maxW: number, maxH: number) => {
    const scale = Math.min(1, maxW / Math.max(w, 1e-9), maxH / Math.max(h, 1e-9));
    // The smallest box is 1 px on its short side, still at the exact ratio.
    const width = Math.max(w * scale, Math.max(1, r));
    return { w: width, h: width / r };
  };
  if (handle === 'n' || handle === 's') {
    const ay = handle === 's' ? orig.y : orig.y + orig.h;
    const dir = handle === 's' ? 1 : -1;
    let h = Math.max(1, (p.y - ay) * dir);
    const cx = orig.x + orig.w / 2;
    const size = fit(h * r, h, 2 * Math.min(cx, bounds.w - cx), dir > 0 ? bounds.h - ay : ay);
    h = size.h;
    return { x: cx - size.w / 2, y: dir > 0 ? ay : ay - h, w: size.w, h };
  }
  if (handle === 'e' || handle === 'w') {
    const ax = handle === 'e' ? orig.x : orig.x + orig.w;
    const dir = handle === 'e' ? 1 : -1;
    const w = Math.max(1, (p.x - ax) * dir);
    const cy = orig.y + orig.h / 2;
    const size = fit(w, w / r, dir > 0 ? bounds.w - ax : ax, 2 * Math.min(cy, bounds.h - cy));
    return { x: dir > 0 ? ax : ax - size.w, y: cy - size.h / 2, w: size.w, h: size.h };
  }
  // Corners (and drawing a new rectangle from its start point).
  let ax: number;
  let ay: number;
  if (handle === 'new') {
    ax = start.x;
    ay = start.y;
  } else {
    ax = handle.includes('w') ? orig.x + orig.w : orig.x;
    ay = handle.includes('n') ? orig.y + orig.h : orig.y;
  }
  const dirX = handle === 'new' ? Math.sign(p.x - ax) || 1 : handle.includes('w') ? -1 : 1;
  const dirY = handle === 'new' ? Math.sign(p.y - ay) || 1 : handle.includes('n') ? -1 : 1;
  let w = Math.max(0, (p.x - ax) * dirX);
  let h = Math.max(0, (p.y - ay) * dirY);
  if (h === 0 || w / h > r) h = w / r;
  else w = h * r;
  const size = fit(w, h, dirX > 0 ? bounds.w - ax : ax, dirY > 0 ? bounds.h - ay : ay);
  return { x: dirX > 0 ? ax : ax - size.w, y: dirY > 0 ? ay : ay - size.h, w: size.w, h: size.h };
}
