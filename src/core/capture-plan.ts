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

/**
 * Device pixels per CSS pixel of a captured frame. The ratio measured from the
 * frame (image width / innerWidth) is slightly off at fractional scales
 * because innerWidth is a rounded integer (e.g. 2244 / 1282 = 1.7504 instead
 * of 1.75), so the exact devicePixelRatio is used whenever it agrees with the
 * frame. When it does not (e.g. emulated device metrics), the measured ratio
 * wins because it describes the pixels actually captured.
 */
export function frameScale(imageWidth: number, innerWidth: number, devicePixelRatio?: number): number {
  const measured = innerWidth > 0 ? imageWidth / innerWidth : 1;
  if (devicePixelRatio && devicePixelRatio > 0 && Math.abs(measured - devicePixelRatio) / devicePixelRatio < 0.01) {
    return devicePixelRatio;
  }
  return measured;
}

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
  /**
   * Extra operations that fill sub-pixel rounding slivers next to `dest` by
   * repeating its edge pixels (see StitchPlanner.sliver).
   */
  extra?: DrawOp[];
}

/**
 * Converts frames into draw operations that contribute only new pixels.
 *
 * Coverage is tracked in *output device pixels*, after rounding and clamping
 * to the captured frame, so fractional device scales (e.g. 125% zoom) can
 * never leave 1px seams. Earlier frames win in overlaps, except that the last
 * row may re-paint the strip occupied by bottom-anchored fixed elements (e.g.
 * a fixed footer shown only once at the end).
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

  /**
   * The output rect a frame can paint (clamped to the frame image and the
   * region), plus a function mapping output rects to source rects.
   */
  private available(frame: FrameInput, imageSize: { width: number; height: number }) {
    const visible = intersect(frame.content, this.region);
    if (isEmpty(visible)) return null;
    const os = this.outputScale;
    const cs = this.captureScale;
    const same = Math.abs(os - cs) < 1e-9;
    const offX = Math.round((this.region.x - frame.content.x + frame.viewport.x) * cs);
    const offY = Math.round((this.region.y - frame.content.y + frame.viewport.y) * cs);
    // Output px → source px.
    const toSrcX = (dx: number) => (same ? dx + offX : (dx / os + this.region.x - frame.content.x + frame.viewport.x) * cs);
    const toSrcY = (dy: number) => (same ? dy + offY : (dy / os + this.region.y - frame.content.y + frame.viewport.y) * cs);
    // Source px → output px (inverse), used to clamp to the image bounds.
    const toDstX = (sx: number) => (same ? sx - offX : (sx / cs - this.region.x + frame.content.x - frame.viewport.x) * os);
    const toDstY = (sy: number) => (same ? sy - offY : (sy / cs - this.region.y + frame.content.y - frame.viewport.y) * os);
    let x0 = Math.round((visible.x - this.region.x) * os);
    let y0 = Math.round((visible.y - this.region.y) * os);
    let x1 = Math.round((right(visible) - this.region.x) * os);
    let y1 = Math.round((bottom(visible) - this.region.y) * os);
    x0 = Math.max(x0, Math.ceil(toDstX(0) - 1e-6));
    y0 = Math.max(y0, Math.ceil(toDstY(0) - 1e-6));
    x1 = Math.min(x1, Math.floor(toDstX(imageSize.width) + 1e-6));
    y1 = Math.min(y1, Math.floor(toDstY(imageSize.height) + 1e-6));
    if (x1 <= x0 || y1 <= y0) return null;
    const toSrc = (d: Rect): Rect => {
      if (same) return { x: d.x + offX, y: d.y + offY, w: d.w, h: d.h };
      const sx0 = toSrcX(d.x);
      const sy0 = toSrcY(d.y);
      return { x: sx0, y: sy0, w: toSrcX(d.x + d.w) - sx0, h: toSrcY(d.y + d.h) - sy0 };
    };
    return { rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, toSrc };
  }

  private toContent(d: Rect): Rect {
    const os = this.outputScale;
    return { x: this.region.x + d.x / os, y: this.region.y + d.y / os, w: d.w / os, h: d.h / os };
  }

  /**
   * Largest gap (output px) treated as a rounding sliver rather than missing
   * content: one CSS pixel plus one device pixel. Chrome reports integer CSS
   * sizes (scrollHeight, clientHeight) rounded from fractional layout values
   * and snaps scroll offsets to device pixels, so at fractional device scales
   * (125%/150%/175% display scaling, page zoom) the last device pixel row of a
   * page can be unreachable by any scroll position. Such slivers are filled by
   * repeating the adjacent captured row; anything larger is real missing
   * content and is still reported by gaps().
   */
  get sliver(): number {
    return Math.ceil(this.outputScale) + 1;
  }

  addFrame(frame: FrameInput, imageSize: { width: number; height: number }): DrawOp | null {
    const avail = this.available(frame, imageSize);
    if (!avail) return null;
    const a = avail.rect;
    const aBottom = a.y + a.h;
    const aRight = a.x + a.w;
    let top = a.y;
    const prevBottom = this.coveredBottomBefore(frame.row);
    if (Number.isFinite(prevBottom)) top = Math.max(top, prevBottom);
    if (frame.isLastRow && frame.bottomFixedHeight && frame.bottomFixedHeight > 0) {
      // Re-paint the strip where a bottom-anchored fixed element now appears.
      const strip = Math.round(frame.bottomFixedHeight * this.outputScale);
      top = Math.min(top, Math.max(a.y, aBottom - strip));
    }
    let left = a.x;
    const prevRight = this.rowRight.get(frame.row);
    if (prevRight !== undefined) left = Math.max(left, prevRight);

    // Rounding slivers between this frame and what is already painted (or the
    // region edges) are filled from this frame's own edge pixels.
    const s = this.sliver;
    const refTop = Number.isFinite(prevBottom) ? prevBottom : 0;
    const refLeft = prevRight ?? 0;
    const bleedTop = top > refTop && top - refTop <= s ? top - refTop : 0;
    const bleedLeft = left > refLeft && left - refLeft <= s ? left - refLeft : 0;
    const bleedBottom = aBottom < this.outputHeight && this.outputHeight - aBottom <= s ? this.outputHeight - aBottom : 0;
    const bleedRight = aRight < this.outputWidth && this.outputWidth - aRight <= s ? this.outputWidth - aRight : 0;

    this.rowBottoms.set(frame.row, Math.max(this.rowBottoms.get(frame.row) ?? -Infinity, aBottom + bleedBottom));
    this.rowRight.set(frame.row, Math.max(prevRight ?? -Infinity, aRight + bleedRight));

    const dest: Rect = { x: left, y: top, w: aRight - left, h: aBottom - top };
    if (dest.w <= 0 || dest.h <= 0) return null;
    const extra = this.bleedOps(dest, avail.toSrc, bleedTop, bleedBottom, bleedLeft, bleedRight);
    this.painted.push({
      x: dest.x - bleedLeft,
      y: dest.y - bleedTop,
      w: dest.w + bleedLeft + bleedRight,
      h: dest.h + bleedTop + bleedBottom,
    });
    return { src: avail.toSrc(dest), dest, content: this.toContent(dest), ...(extra.length ? { extra } : {}) };
  }

  /** Ops that stretch the edge row/column of `dest` over adjacent slivers. */
  private bleedOps(dest: Rect, toSrc: (d: Rect) => Rect, t: number, b: number, l: number, r: number): DrawOp[] {
    const ops: DrawOp[] = [];
    const op = (src: Rect, d: Rect): DrawOp => ({ src: toSrc(src), dest: d, content: this.toContent(d) });
    const x0 = dest.x - l;
    const w = dest.w + l + r; // vertical bleeds also cover the corners
    if (l) ops.push(op({ x: dest.x, y: dest.y, w: 1, h: dest.h }, { x: x0, y: dest.y, w: l, h: dest.h }));
    if (r) ops.push(op({ x: dest.x + dest.w - 1, y: dest.y, w: 1, h: dest.h }, { x: dest.x + dest.w, y: dest.y, w: r, h: dest.h }));
    if (t) ops.push(op({ x: dest.x, y: dest.y, w: dest.w, h: 1 }, { x: x0, y: dest.y - t, w, h: t }));
    if (b) ops.push(op({ x: dest.x, y: dest.y + dest.h - 1, w: dest.w, h: 1 }, { x: x0, y: dest.y + dest.h, w, h: b }));
    return ops;
  }

  /**
   * Paints only the parts of a frame that fall inside known gaps. Used for
   * retry frames after a page scrolled somewhere other than requested.
   */
  addGapFill(frame: FrameInput, imageSize: { width: number; height: number }): DrawOp[] {
    const avail = this.available(frame, imageSize);
    if (!avail) return [];
    const ops: DrawOp[] = [];
    for (const gap of this.outputGaps()) {
      const d = intersect(avail.rect, gap);
      if (isEmpty(d)) continue;
      this.painted.push(d);
      ops.push({ src: avail.toSrc(d), dest: d, content: this.toContent(d) });
    }
    return ops;
  }

  private outputGaps(): Rect[] {
    return uncovered({ x: 0, y: 0, w: this.outputWidth, h: this.outputHeight }, this.painted, 0.5);
  }

  /** Content-space gaps that no frame painted. Empty means the capture is complete. */
  gaps(): Rect[] {
    return this.outputGaps().map((g) => this.toContent(g));
  }

  /** Height (from the region top, CSS px) that is contiguously painted. */
  contiguousHeight(): number {
    const gaps = this.outputGaps();
    if (gaps.length === 0) return this.region.h;
    return Math.max(0, Math.min(...gaps.map((g) => g.y)) / this.outputScale);
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

/**
 * Scroll position (visible-window origin, content coordinates) used to retry a
 * gap. The gap is placed a third of the way into the viewport rather than at
 * its very edge, so device-pixel scroll snapping cannot make it miss again.
 */
export function retryScrollTarget(gap: Rect, view: { w: number; h: number }): { x: number; y: number } {
  return {
    x: gap.x > 0 ? Math.max(0, gap.x - view.w / 3) : 0,
    y: gap.y > 0 ? Math.max(0, gap.y - view.h / 3) : 0,
  };
}
