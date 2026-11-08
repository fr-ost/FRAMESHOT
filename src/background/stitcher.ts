/**
 * Segmented stitching canvas. Output taller than the browser's canvas limits
 * is split into segments (parts). Each segment is finalized (encoded to PNG,
 * thumbnail + hash computed, canvas released) as soon as no later frame can
 * draw into it, keeping peak memory to roughly one or two segments.
 */
import { segmentHeightLimit, type CanvasLimits, type DrawOp } from '../core/capture-plan';
import { canvasToBlob, createCanvas, dHash, get2d, makeThumbnail } from '../imaging/image-io';

export interface FinishedSegment {
  index: number;
  blob: Blob;
  thumb: Blob;
  dhash: string;
  width: number;
  height: number;
}

interface LiveSegment {
  index: number;
  y: number;
  height: number;
  canvas: OffscreenCanvas | null;
  done: boolean;
}

export class SegmentedCanvas {
  private segments: LiveSegment[] = [];
  private finished: FinishedSegment[] = [];
  private pending: Promise<void>[] = [];
  readonly maxSegmentHeight: number;

  constructor(
    readonly width: number,
    private totalHeight: number,
    limits: CanvasLimits,
  ) {
    this.maxSegmentHeight = segmentHeightLimit(width, limits);
    this.layout();
  }

  get height(): number {
    return this.totalHeight;
  }

  get segmentCount(): number {
    return this.segments.length;
  }

  private layout(): void {
    // Keep already-allocated segments; (re)plan the rest with equal max heights.
    const kept = this.segments.filter((s) => s.canvas || s.done);
    let y = kept.length ? kept[kept.length - 1].y + kept[kept.length - 1].height : 0;
    const segs = [...kept];
    while (y < this.totalHeight) {
      const h = Math.min(this.maxSegmentHeight, this.totalHeight - y);
      segs.push({ index: segs.length, y, height: h, canvas: null, done: false });
      y += h;
    }
    this.segments = segs;
  }

  /** Updates the total output height (growing or shrinking pages). */
  setTotalHeight(height: number): void {
    const h = Math.max(1, Math.round(height));
    if (h === this.totalHeight) return;
    this.totalHeight = h;
    // Resize the last allocated, unfinished segment when it crosses the new end.
    for (const seg of this.segments) {
      if (seg.done || !seg.canvas) continue;
      const desired = Math.min(this.maxSegmentHeight, h - seg.y);
      if (desired > 0 && desired !== seg.height) this.resizeSegment(seg, desired);
    }
    // Drop unallocated segments past the end; layout() re-adds what's needed.
    this.segments = this.segments.filter((s) => s.canvas || s.done || s.y < h);
    for (const s of this.segments) if (!s.canvas && !s.done) s.height = Math.min(this.maxSegmentHeight, h - s.y);
    this.segments = this.segments.filter((s) => s.height > 0);
    this.layout();
  }

  private resizeSegment(seg: LiveSegment, height: number): void {
    const next = createCanvas(this.width, height);
    if (seg.canvas) get2d(next).drawImage(seg.canvas, 0, 0);
    seg.canvas = next;
    seg.height = height;
  }

  draw(image: CanvasImageSource, op: DrawOp): void {
    this.drawOne(image, op);
    for (const extra of op.extra ?? []) this.drawOne(image, extra);
  }

  private drawOne(image: CanvasImageSource, op: DrawOp): void {
    const { src, dest } = op;
    const scaleY = src.h / dest.h;
    for (const seg of this.segments) {
      const top = Math.max(dest.y, seg.y);
      const btm = Math.min(dest.y + dest.h, seg.y + seg.height);
      if (btm <= top) continue;
      if (seg.done) throw new Error('Internal stitching error: segment already finalized.');
      seg.canvas ??= createCanvas(this.width, seg.height);
      const ctx = get2d(seg.canvas);
      const sy = src.y + (top - dest.y) * scaleY;
      const sh = (btm - top) * scaleY;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, src.x, sy, src.w, sh, dest.x, top - seg.y, dest.w, btm - top);
    }
  }

  /** Finalizes every segment that ends at or above output row `y`. */
  finalizeAbove(y: number): void {
    for (const seg of this.segments) {
      if (!seg.done && seg.canvas && seg.y + seg.height <= y) this.finalize(seg);
    }
  }

  private finalize(seg: LiveSegment): void {
    seg.done = true;
    const canvas = seg.canvas ?? createCanvas(this.width, seg.height);
    seg.canvas = null;
    const job = (async () => {
      const hash = dHash(canvas);
      const [blob, thumb] = await Promise.all([canvasToBlob(canvas, 'png'), makeThumbnail(canvas)]);
      this.finished.push({ index: seg.index, blob, thumb, dhash: hash, width: canvas.width, height: canvas.height });
      // Release the backing store promptly.
      canvas.width = 1;
      canvas.height = 1;
    })();
    this.pending.push(job);
  }

  async finish(): Promise<FinishedSegment[]> {
    for (const seg of this.segments) if (!seg.done) this.finalize(seg);
    await Promise.all(this.pending);
    return [...this.finished].sort((a, b) => a.index - b.index);
  }

  /** Releases everything without producing output (cancel/error). */
  dispose(): void {
    for (const seg of this.segments) {
      if (seg.canvas) {
        seg.canvas.width = 1;
        seg.canvas.height = 1;
        seg.canvas = null;
      }
      seg.done = true;
    }
  }
}
