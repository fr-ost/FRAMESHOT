/**
 * Pure geometry for the non-destructive pipeline:
 *   source px → crop → orientation (rotate/flip) → scale → output px
 * and the matching remapping of objects when the document changes.
 */
import type { Point, Rect, Size } from '../../core/types';
import type { EditorDoc, EditorObject, Orientation, TextObject } from './types';
import { IDENTITY } from './types';

/** Canvas-style affine matrix: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = readonly [number, number, number, number, number, number];

export const ROTATE_CW: Orientation = [0, -1, 1, 0];
export const ROTATE_CCW: Orientation = [0, 1, -1, 0];
export const FLIP_H: Orientation = [-1, 0, 0, 1];
export const FLIP_V: Orientation = [1, 0, 0, -1];

export function multiplyOrientation(m: Orientation, n: Orientation): Orientation {
  // (m · n): apply n first, then m.
  return [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3]];
}

export function swapsAxes(o: Orientation): boolean {
  return o[0] === 0;
}

/** Crop size after orientation (before scaling). */
export function orientedSize(doc: Pick<EditorDoc, 'crop' | 'orientation'>): Size {
  return swapsAxes(doc.orientation)
    ? { width: doc.crop.h, height: doc.crop.w }
    : { width: doc.crop.w, height: doc.crop.h };
}

/** Matrix mapping source pixel coordinates to output coordinates. */
export function docMatrix(doc: Pick<EditorDoc, 'crop' | 'orientation' | 'output'>): Matrix {
  const o = doc.orientation;
  const os = orientedSize(doc);
  const sx = doc.output.width / os.width;
  const sy = doc.output.height / os.height;
  const cx = doc.crop.x + doc.crop.w / 2;
  const cy = doc.crop.y + doc.crop.h / 2;
  // p' = S · (O · (p - c) + os/2)
  const a = sx * o[0];
  const c = sx * o[1];
  const b = sy * o[2];
  const d = sy * o[3];
  const e = sx * (os.width / 2 - (o[0] * cx + o[1] * cy));
  const f = sy * (os.height / 2 - (o[2] * cx + o[3] * cy));
  return [a, b, c, d, e, f];
}

export function applyMatrix(m: Matrix, p: Point): Point {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

export function invertMatrix(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) throw new Error('Matrix is not invertible');
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

export function mapRect(m: Matrix, r: Rect): Rect {
  const pts = [
    applyMatrix(m, { x: r.x, y: r.y }),
    applyMatrix(m, { x: r.x + r.w, y: r.y }),
    applyMatrix(m, { x: r.x, y: r.y + r.h }),
    applyMatrix(m, { x: r.x + r.w, y: r.y + r.h }),
  ];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// ── Object remapping ─────────────────────────────────────────────────────

/** Rough text box size without a canvas (used when remapping text). */
export function estimateTextSize(t: Pick<TextObject, 'text' | 'size'>): Size {
  const lines = t.text.split('\n');
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { width: longest * t.size * 0.56, height: lines.length * t.size * 1.25 };
}

/**
 * Maps every object through a point transform. `scale` adjusts stroke widths,
 * font sizes and marker sizes (used by resize).
 */
export function mapObjects(objects: EditorObject[], fn: (p: Point) => Point, scale = 1): EditorObject[] {
  return objects.map((o) => mapObject(o, fn, scale));
}

function mapBox<T extends { x: number; y: number; w: number; h: number }>(o: T, fn: (p: Point) => Point): T {
  const a = fn({ x: o.x, y: o.y });
  const b = fn({ x: o.x + o.w, y: o.y + o.h });
  return { ...o, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

export function mapObject(o: EditorObject, fn: (p: Point) => Point, scale = 1): EditorObject {
  switch (o.type) {
    case 'arrow':
    case 'line': {
      const p1 = fn({ x: o.x1, y: o.y1 });
      const p2 = fn({ x: o.x2, y: o.y2 });
      return { ...o, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, width: o.width * scale };
    }
    case 'rect':
      return { ...mapBox(o, fn), strokeWidth: o.strokeWidth * scale, radius: o.radius * scale };
    case 'ellipse':
      return { ...mapBox(o, fn), strokeWidth: o.strokeWidth * scale };
    case 'blur':
      return { ...mapBox(o, fn), radius: o.radius * scale };
    case 'pixelate':
      return { ...mapBox(o, fn), size: o.size * scale };
    case 'redact':
      return mapBox(o, fn);
    case 'pen':
    case 'highlighter': {
      const pts: number[] = [];
      for (let i = 0; i < o.points.length; i += 2) {
        const p = fn({ x: o.points[i], y: o.points[i + 1] });
        pts.push(p.x, p.y);
      }
      return { ...o, points: pts, width: o.width * scale };
    }
    case 'text': {
      // Map the box center so the text stays over the same content.
      const size = estimateTextSize(o);
      const c = fn({ x: o.x + size.width / 2, y: o.y + size.height / 2 });
      const newSize = o.size * scale;
      const ns = estimateTextSize({ text: o.text, size: newSize });
      return { ...o, size: newSize, x: c.x - ns.width / 2, y: c.y - ns.height / 2 };
    }
    case 'marker':
    case 'symbol': {
      const c = fn({ x: o.x, y: o.y });
      return { ...o, x: c.x, y: c.y, size: o.size * scale };
    }
  }
}

// ── Document operations (all return new documents) ──────────────────────

export function rotateDoc(doc: EditorDoc, dir: 'cw' | 'ccw'): EditorDoc {
  const { width: W, height: H } = doc.output;
  const fn = dir === 'cw' ? (p: Point) => ({ x: H - p.y, y: p.x }) : (p: Point) => ({ x: p.y, y: W - p.x });
  return {
    ...doc,
    orientation: multiplyOrientation(dir === 'cw' ? ROTATE_CW : ROTATE_CCW, doc.orientation),
    output: { width: H, height: W },
    objects: mapObjects(doc.objects, fn),
  };
}

export function flipDoc(doc: EditorDoc, axis: 'h' | 'v'): EditorDoc {
  const { width: W, height: H } = doc.output;
  const fn = axis === 'h' ? (p: Point) => ({ x: W - p.x, y: p.y }) : (p: Point) => ({ x: p.x, y: H - p.y });
  return {
    ...doc,
    orientation: multiplyOrientation(axis === 'h' ? FLIP_H : FLIP_V, doc.orientation),
    objects: mapObjects(doc.objects, fn),
  };
}

/** Normalizes and clamps a crop rectangle given in output coordinates. */
export function normalizeCropRect(doc: EditorDoc, r: Rect): Rect {
  const x0 = Math.max(0, Math.min(doc.output.width, Math.round(Math.min(r.x, r.x + r.w))));
  const y0 = Math.max(0, Math.min(doc.output.height, Math.round(Math.min(r.y, r.y + r.h))));
  const x1 = Math.max(0, Math.min(doc.output.width, Math.round(Math.max(r.x, r.x + r.w))));
  const y1 = Math.max(0, Math.min(doc.output.height, Math.round(Math.max(r.y, r.y + r.h))));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function cropDoc(doc: EditorDoc, rect: Rect): EditorDoc {
  const r = normalizeCropRect(doc, rect);
  if (r.w < 1 || r.h < 1) return doc;
  const inv = invertMatrix(docMatrix(doc));
  const src = mapRect(inv, r);
  return {
    ...doc,
    crop: src,
    output: { width: r.w, height: r.h },
    objects: mapObjects(doc.objects, (p) => ({ x: p.x - r.x, y: p.y - r.y })),
  };
}

export function resizeDoc(doc: EditorDoc, width: number, height: number): EditorDoc {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const sx = w / doc.output.width;
  const sy = h / doc.output.height;
  if (sx === 1 && sy === 1) return doc;
  return {
    ...doc,
    output: { width: w, height: h },
    objects: mapObjects(doc.objects, (p) => ({ x: p.x * sx, y: p.y * sy }), Math.sqrt(sx * sy)),
  };
}

export function resetDoc(doc: EditorDoc): EditorDoc {
  const { width, height } = doc.source;
  return {
    version: 1,
    source: doc.source,
    crop: { x: 0, y: 0, w: width, h: height },
    orientation: IDENTITY,
    output: { width, height },
    objects: [],
  };
}

export function isPristine(doc: EditorDoc): boolean {
  const o = doc.orientation;
  return (
    doc.objects.length === 0 &&
    o[0] === 1 &&
    o[1] === 0 &&
    o[2] === 0 &&
    o[3] === 1 &&
    doc.crop.x === 0 &&
    doc.crop.y === 0 &&
    doc.crop.w === doc.source.width &&
    doc.crop.h === doc.source.height &&
    doc.output.width === doc.source.width &&
    doc.output.height === doc.source.height
  );
}
