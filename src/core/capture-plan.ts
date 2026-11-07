/**
 * Pure planning math for multi-frame captures (full page, tall elements,
 * scrollable containers, large selections). No DOM or canvas access here so
 * every rule can be unit tested.
 *
 * Coordinate spaces:
 *  - content:  the scroller's content coordinates in CSS px (document
 *              coordinates for the window scroller).
 *  - viewport: CSS px relative to the top-left of the browser viewport.
 *  - image:    device px of a captureVisibleTab frame.
 *  - output:   device px of the final stitched image.
 */
import { bottom, intersect, isEmpty, right, uncovered } from './geometry';
import type { Rect } from './types';

export interface CanvasLimits {
  /** Max width or height of a single canvas. */
  maxDimension: number;
  /** Max pixel count per output segment (memory budget, below Chrome's hard area limit). */
  maxPixels: number;
}

export const DEFAULT_CANVAS_LIMITS: CanvasLimits = {
  maxDimension: 32767,
  maxPixels: 100_000_000,
};

/** Chrome allows at most 2 captureVisibleTab calls per second per extension. */
export const MIN_CAPTURE_INTERVAL_MS = 520;

export interface ScrollStep {
  row: number;
  col: number;
  rows: number;
  cols: number;
  /** Desired top-left of the visible window, in content coordinates. */
  x: number;
  y: number;
}

function axisPositions(start: number, length: number, view: number, maxScroll: number, overlap: number): number[] {
  if (view <= 0) return [Math.max(0, Math.min(start, maxScroll))];
  if (length <= view) return [Math.max(0, Math.min(start, maxScroll))];
  const step = Math.max(1, view - overlap);
  const end = start + length;
  const positions: number[] = [];
  for (let pos = start; ; pos += step) {
    // The last position is aligned so the window ends exactly at the region end.
    const aligned = Math.min(pos, end - view);
    positions.push(Math.max(0, Math.min(aligned, maxScroll)));
    if (aligned + view >= end) break;
  }
  return positions;
}

/**
 * Plans the scroll positions needed to bring every part of `region` into the
 * scroller's visible window. Steps are row-major (top to bottom, then left to
 * right within a row).
 */
export function planScrollSteps(
  region: Rect,
  view: { w: number; h: number },
  maxScroll: { x: number; y: number },
  overlap = { x: 0, y: 0 },
): ScrollStep[] {
  const ys = axisPositions(region.y, region.h, view.h, maxScroll.y, overlap.y);
  const xs = axisPositions(region.x, region.w, view.w, maxScroll.x, overlap.x);
  const steps: ScrollStep[] = [];
  ys.forEach((y, row) =>
    xs.forEach((x, col) => steps.push({ row, col, rows: ys.length, cols: xs.length, x, y })),
  );
  return steps;
}

/**
 * Overlap (CSS px) used between frames. With fractional device scales, 1px of
 * overlap guarantees rounding can never create a gap; overlapping pixels are
 * drawn once (later frames only contribute what is new).
 */
export function overlapFor(scale: number): number {
  return Math.abs(scale - Math.round(scale)) > 1e-6 ? 2 : 0;
}

export interface FrameInput {
  row: number;
  col: number;
  /** Visible window in content coordinates. */
  content: Rect;
  /** Same window in viewport coordinates. */
  viewport: Rect;
  /** Height (CSS px) of bottom-anchored fixed elements shown in this frame. */
  bottomFixedHeight?: number;
  isLastRow?: boolean;
}

export interface DrawOp {
  /** Source rect inside the captured frame (image device px). */
  src: Rect;
  /** Destination rect in the stitched output (output device px). */
  dest: Rect;
  /** Content-space rect this op paints. */
  content: Rect;
}

/**
 * Tracks which parts of the region have been painted and converts each frame
 * into a draw operation that contributes only new pixels. Earlier frames win in
 * overlaps, except that the last row may re-paint the area occupied by
 * bottom-anchored fixed elements (e.g. a fixed footer shown only once).
 */
export class StitchPlanner {
  private painted: Rect[] = [];
  private rowBottoms = new Map<number, number>();
  private rowRight = new Map<number, number>();

  constructor(
    public region: Rect,
    /** Device px per CSS px in captured frames. */
    public captureScale: number,
    /** Device px per CSS px in the output (≤ captureScale when scaled down). */
    public outputScale: number = captureScale,
  ) {}

  get outputWidth(): number {
    return Math.max(1, Math.round(this.region.w * this.outputScale));
  }

  get outputHeight(): number {
    return Math.max(1, Math.round(this.region.h * this.outputScale));
  }

  /** Extends or shrinks the region height (infinite scroll / shrinking pages). */
  setRegionHeight(h: number): void {
    this.region = { ...this.region, h: Math.max(1, h) };
  }

  private coveredBottomBefore(row: number): number {
    let maxBottom = -Infinity;
    for (const [r, b] of this.rowBottoms) if (r < row) maxBottom = Math.max(maxBottom, b);
    return maxBottom;
  }

  addFrame(frame: FrameInput, imageSize: { width: number; height: number }): DrawOp | null {
    const visible = intersect(frame.content, this.region);
    if (isEmpty(visible)) return null;

    let top = visible.y;
    const prevBottom = this.coveredBottomBefore(frame.row);
    if (Number.isFinite(prevBottom)) top = Math.max(top, prevBottom);
    if (frame.isLastRow && frame.bottomFixedHeight && frame.bottomFixedHeight > 0) {
      // Re-paint the strip where a bottom-anchored fixed element now appears.
      top = Math.min(top, Math.max(visible.y, bottom(visible) - frame.bottomFixedHeight));
    }
    let left = visible.x;
    const prevRight = this.rowRight.get(frame.row);
    if (prevRight !== undefined) left = Math.max(left, prevRight);

    this.rowBottoms.set(frame.row, Math.max(this.rowBottoms.get(frame.row) ?? -Infinity, bottom(visible)));
    this.rowRight.set(frame.row, Math.max(prevRight ?? -Infinity, right(visible)));

    const content: Rect = { x: left, y: top, w: right(visible) - left, h: bottom(visible) - top };
    if (content.w <= 0 || content.h <= 0) return null;
    this.painted.push(content);

    const os = this.outputScale;
    const cs = this.captureScale;
    const dx0 = Math.round((content.x - this.region.x) * os);
    const dy0 = Math.round((content.y - this.region.y) * os);
    const dx1 = Math.round((right(content) - this.region.x) * os);
    const dy1 = Math.round((bottom(content) - this.region.y) * os);

    // Image px = (contentPoint - frame.content.origin + frame.viewport.origin) * captureScale
    let sx0: number;
    let sy0: number;
    let sx1: number;
    let sy1: number;
    if (Math.abs(os - cs) < 1e-9) {
      // Same scale: use one rounded translation so src/dest sizes match exactly.
      const offX = Math.round((this.region.x - frame.content.x + frame.viewport.x) * cs);
      const offY = Math.round((this.region.y - frame.content.y + frame.viewport.y) * cs);
      sx0 = dx0 + offX;
      sy0 = dy0 + offY;
      sx1 = dx1 + offX;
      sy1 = dy1 + offY;
    } else {
      sx0 = Math.round((content.x - frame.content.x + frame.viewport.x) * cs);
      sy0 = Math.round((content.y - frame.content.y + frame.viewport.y) * cs);
      sx1 = Math.round((right(content) - frame.content.x + frame.viewport.x) * cs);
      sy1 = Math.round((bottom(content) - frame.content.y + frame.viewport.y) * cs);
    }

    // Clamp to the captured image (guards against off-by-one at the edges).
    const clipLeft = Math.max(0, -sx0);
    const clipTop = Math.max(0, -sy0);
    const clipRight = Math.max(0, sx1 - imageSize.width);
    const clipBottom = Math.max(0, sy1 - imageSize.height);
    const ratio = os / cs;
    sx0 += clipLeft;
    sy0 += clipTop;
    sx1 -= clipRight;
    sy1 -= clipBottom;
    const destClip = (v: number) => Math.round(v * ratio);
    const dest: Rect = {
      x: dx0 + destClip(clipLeft),
      y: dy0 + destClip(clipTop),
      w: dx1 - destClip(clipRight) - (dx0 + destClip(clipLeft)),
      h: dy1 - destClip(clipBottom) - (dy0 + destClip(clipTop)),
    };
    const src: Rect = { x: sx0, y: sy0, w: sx1 - sx0, h: sy1 - sy0 };
    if (src.w <= 0 || src.h <= 0 || dest.w <= 0 || dest.h <= 0) return null;
    return { src, dest, content };
  }

  /**
   * Paints only the parts of a frame that fall inside known gaps. Used for
   * retry frames after a page scrolled somewhere other than requested.
   */
  addGapFill(frame: FrameInput, imageSize: { width: number; height: number }): DrawOp[] {
    const ops: DrawOp[] = [];
    for (const gap of this.gaps()) {
      const visible = intersect(intersect(frame.content, this.region), gap);
      if (isEmpty(visible)) continue;
      const sub = new StitchPlanner(visible, this.captureScale, this.outputScale);
      const op = sub.addFrame({ ...frame, row: 0, col: 0, isLastRow: false, bottomFixedHeight: 0 }, imageSize);
      if (!op) continue;
      // Re-base the destination from the sub-region to this region.
      const ox = Math.round((visible.x - this.region.x) * this.outputScale);
      const oy = Math.round((visible.y - this.region.y) * this.outputScale);
      ops.push({ ...op, dest: { ...op.dest, x: op.dest.x + ox, y: op.dest.y + oy } });
      this.painted.push(op.content);
    }
    return ops;
  }

  /** Content-space gaps that no frame painted. Empty means the capture is complete. */
  gaps(): Rect[] {
    return uncovered(this.region, this.painted);
  }

  /** Height (from the region top, CSS px) that is contiguously painted. */
  contiguousHeight(): number {
    const gaps = this.gaps();
    if (gaps.length === 0) return this.region.h;
    return Math.max(0, Math.min(...gaps.map((g) => g.y)) - this.region.y);
  }
}

export interface Segment {
  index: number;
  /** Top (output px) of this segment. */
  y: number;
  height: number;
}

/** Max height of one output segment for the given width. */
export function segmentHeightLimit(width: number, limits: CanvasLimits = DEFAULT_CANVAS_LIMITS): number {
  return Math.max(1, Math.min(limits.maxDimension, Math.floor(limits.maxPixels / Math.max(1, width))));
}

/** Splits an output image into segments that each fit the canvas limits. */
export function planSegments(width: number, height: number, limits: CanvasLimits = DEFAULT_CANVAS_LIMITS): Segment[] {
  const maxH = segmentHeightLimit(width, limits);
  const count = Math.max(1, Math.ceil(height / maxH));
  // Balance segment heights so the last part is not a thin sliver.
  const even = Math.ceil(height / count);
  const segments: Segment[] = [];
  for (let i = 0, y = 0; i < count; i++, y += even) {
    segments.push({ index: i, y, height: Math.min(even, height - y) });
  }
  return segments;
}

/**
 * Output scale factor (≤ 1) that keeps a single image inside the limits.
 * Used when the user prefers one scaled image over multiple parts, and always
 * for widths that exceed the maximum dimension.
 */
export function fitScale(width: number, height: number, limits: CanvasLimits = DEFAULT_CANVAS_LIMITS): number {
  const byDim = Math.min(limits.maxDimension / width, limits.maxDimension / height);
  const byArea = Math.sqrt(limits.maxPixels / (width * height));
  return Math.min(1, byDim, byArea);
}
