import type { Point, Rect } from './types';

export const EPS = 0.5;

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

export function right(r: Rect): number {
  return r.x + r.w;
}

export function bottom(r: Rect): number {
  return r.y + r.h;
}

export function isEmpty(r: Rect): boolean {
  return !(r.w > 0 && r.h > 0);
}

export function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(right(a), right(b));
  const btm = Math.min(bottom(a), bottom(b));
  return { x, y, w: Math.max(0, r - x), h: Math.max(0, btm - y) };
}

export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(right(a), right(b)) - x, h: Math.max(bottom(a), bottom(b)) - y };
}

export function containsPoint(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= right(r) && p.y >= r.y && p.y <= bottom(r);
}

/** Normalizes a rect defined by two arbitrary corners. */
export function fromPoints(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function roundRect(r: Rect): Rect {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  return { x, y, w: Math.round(right(r)) - x, h: Math.round(bottom(r)) - y };
}

export function scaleRect(r: Rect, s: number): Rect {
  return { x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s };
}

export function clampRect(r: Rect, bounds: Rect): Rect {
  return intersect(r, bounds);
}

/**
 * Returns the parts of `region` not covered by the union of `rects`, as a list
 * of horizontal bands (sweep line). Used to prove a stitched capture is
 * complete before it is saved.
 */
export function uncovered(region: Rect, rects: Rect[], tolerance = EPS): Rect[] {
  const clipped = rects.map((r) => intersect(r, region)).filter((r) => !isEmpty(r));
  const ys = new Set<number>([region.y, bottom(region)]);
  for (const r of clipped) {
    ys.add(r.y);
    ys.add(bottom(r));
  }
  const sortedY = [...ys].sort((a, b) => a - b);
  const gaps: Rect[] = [];
  for (let i = 0; i < sortedY.length - 1; i++) {
    const y0 = sortedY[i];
    const y1 = sortedY[i + 1];
    if (y1 - y0 <= tolerance) continue;
    const mid = (y0 + y1) / 2;
    const intervals = clipped
      .filter((r) => r.y <= mid && bottom(r) >= mid)
      .map((r) => [r.x, right(r)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let cursor = region.x;
    for (const [a, b] of intervals) {
      if (a - cursor > tolerance) gaps.push({ x: cursor, y: y0, w: a - cursor, h: y1 - y0 });
      cursor = Math.max(cursor, b);
    }
    if (right(region) - cursor > tolerance) gaps.push({ x: cursor, y: y0, w: right(region) - cursor, h: y1 - y0 });
  }
  return gaps;
}
