/**
 * GIF building for recordings (runs in a Web Worker; pure, so it is also
 * unit-tested in Node).
 *
 * Screen recordings are mostly still, so:
 *  - one palette for the whole GIF (built from sample frames) keeps colours
 *    steady from frame to frame instead of shimmering;
 *  - pixels that did not change are written as transparent (disposal 1 keeps
 *    the previous frame underneath), which compresses to almost nothing;
 *  - identical frames are merged into one longer frame.
 */
import { applyPalette, GIFEncoder, quantize, type Palette } from 'gifenc';

export interface GifBuildOptions {
  width: number;
  height: number;
  /** 0 = loop forever, -1 = play once. */
  repeat: number;
}

/** One palette (≤ 255 colours; a 256th slot is kept for transparency) from sample frames. */
export function buildPalette(samples: (Uint8Array | Uint8ClampedArray)[], maxColors = 255): Palette {
  const total = samples.reduce((n, s) => n + s.length, 0);
  if (total === 0) return [[0, 0, 0]];
  const all = new Uint8Array(total);
  let offset = 0;
  for (const s of samples) {
    all.set(s, offset);
    offset += s.length;
  }
  return quantize(all, Math.min(255, Math.max(2, maxColors)), { format: 'rgb565' });
}

/** Frame delays in centiseconds that add up exactly to the clip length (no drift). */
export function frameDelaysCs(count: number, fps: number): number[] {
  const delays: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.round((i * 100) / fps);
    const b = Math.round(((i + 1) * 100) / fps);
    delays.push(Math.max(2, b - a));
  }
  return delays;
}

function sameIndices(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export class GifBuilder {
  private readonly encoder = GIFEncoder();
  private readonly palette: Palette;
  private readonly colors: Palette;
  private readonly transparentIndex: number;
  private previous: Uint8Array | null = null;
  private pending: { index: Uint8Array; delayCs: number; transparent: boolean } | null = null;
  private written = 0;
  private merged = 0;

  constructor(
    private readonly options: GifBuildOptions,
    palette: Palette,
  ) {
    this.colors = palette.slice(0, 255);
    // The last slot is the transparent colour; it is never chosen for a pixel.
    this.palette = [...this.colors, [0, 0, 0]];
    this.transparentIndex = this.palette.length - 1;
  }

  /** Adds an RGBA frame (width × height × 4 bytes) shown for `delayCs` centiseconds. */
  addFrame(rgba: Uint8Array | Uint8ClampedArray, delayCs: number): void {
    const { width, height } = this.options;
    if (rgba.length !== width * height * 4) throw new Error(`Frame size mismatch: expected ${width}×${height}.`);
    const index = applyPalette(rgba, this.colors, 'rgb565');
    if (this.previous && sameIndices(index, this.previous)) {
      // Nothing changed: show the previous frame for longer.
      if (this.pending) this.pending.delayCs += delayCs;
      this.merged++;
      return;
    }
    let out = index;
    let transparent = false;
    if (this.previous) {
      out = new Uint8Array(index.length);
      const prev = this.previous;
      const t = this.transparentIndex;
      for (let i = 0; i < index.length; i++) out[i] = index[i] === prev[i] ? t : index[i];
      transparent = true;
    }
    this.flush();
    this.pending = { index: out, delayCs, transparent };
    this.previous = index;
  }

  private flush(): void {
    const p = this.pending;
    if (!p) return;
    const first = this.written === 0;
    this.encoder.writeFrame(p.index, this.options.width, this.options.height, {
      palette: first ? this.palette : undefined,
      delay: p.delayCs * 10,
      repeat: this.options.repeat,
      transparent: p.transparent,
      transparentIndex: this.transparentIndex,
      dispose: 1,
    });
    this.written++;
    this.pending = null;
  }

  get stats(): { frames: number; merged: number } {
    return { frames: this.written + (this.pending ? 1 : 0), merged: this.merged };
  }

  /** Finishes the file. */
  finish(): Uint8Array {
    if (!this.pending && this.written === 0) throw new Error('The GIF has no frames.');
    this.flush();
    this.encoder.finish();
    return this.encoder.bytes();
  }
}
