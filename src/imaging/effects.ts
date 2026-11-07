/**
 * Privacy effects implemented as pure functions on RGBA pixel buffers.
 *
 * These run identically in the editor preview and in the export pipeline. The
 * export pipeline writes their output back with putImageData, which *replaces*
 * pixels rather than compositing over them, so no original pixel survives in
 * the exported file inside an obscured region.
 */

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function createBuffer(width: number, height: number): PixelBuffer {
  return { data: new Uint8ClampedArray(width * height * 4), width, height };
}

/**
 * Replaces each block with the average color of that block. Blocks are aligned
 * to (originX, originY) so a region renders identically wherever it is drawn.
 */
export function pixelate(buf: PixelBuffer, blockSize: number, originX = 0, originY = 0): PixelBuffer {
  const size = Math.max(2, Math.round(blockSize));
  const { width, height, data } = buf;
  const out = new Uint8ClampedArray(data.length);
  const startX = -(((originX % size) + size) % size);
  const startY = -(((originY % size) + size) % size);
  for (let by = startY; by < height; by += size) {
    const y0 = Math.max(0, by);
    const y1 = Math.min(height, by + size);
    for (let bx = startX; bx < width; bx += size) {
      const x0 = Math.max(0, bx);
      const x1 = Math.min(width, bx + size);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * width + x0) * 4;
        for (let x = x0; x < x1; x++, i += 4) {
          const alpha = data[i + 3];
          r += data[i] * alpha;
          g += data[i + 1] * alpha;
          b += data[i + 2] * alpha;
          a += alpha;
          n++;
        }
      }
      const avgA = n ? a / n : 0;
      const rr = a ? r / a : 0;
      const gg = a ? g / a : 0;
      const bb = a ? b / a : 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * width + x0) * 4;
        for (let x = x0; x < x1; x++, i += 4) {
          out[i] = rr;
          out[i + 1] = gg;
          out[i + 2] = bb;
          out[i + 3] = avgA;
        }
      }
    }
  }
  return { data: out, width, height };
}

/** One horizontal box-blur pass on premultiplied float channels. */
function boxPassH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const div = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 4; c++) {
      let acc = 0;
      // Edge pixels are clamped (extended) so borders don't darken.
      for (let k = -r; k <= r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k)) * 4 + c];
      for (let x = 0; x < w; x++) {
        dst[row + x * 4 + c] = acc / div;
        const addIdx = Math.min(w - 1, x + r + 1);
        const subIdx = Math.max(0, x - r);
        acc += src[row + addIdx * 4 + c] - src[row + subIdx * 4 + c];
      }
    }
  }
}

function boxPassV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number): void {
  const div = 2 * r + 1;
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[Math.min(h - 1, Math.max(0, k)) * w * 4 + x * 4 + c];
      for (let y = 0; y < h; y++) {
        dst[y * w * 4 + x * 4 + c] = acc / div;
        const addIdx = Math.min(h - 1, y + r + 1);
        const subIdx = Math.max(0, y - r);
        acc += src[addIdx * w * 4 + x * 4 + c] - src[subIdx * w * 4 + x * 4 + c];
      }
    }
  }
}

/**
 * Approximate Gaussian blur via three box-blur passes (premultiplied alpha to
 * avoid dark halos on transparent edges).
 */
export function boxBlur(buf: PixelBuffer, radius: number, passes = 3): PixelBuffer {
  const r = Math.max(1, Math.round(radius));
  const { width: w, height: h, data } = buf;
  const n = w * h * 4;
  let a = new Float32Array(n);
  let b = new Float32Array(n);
  for (let i = 0; i < n; i += 4) {
    const alpha = data[i + 3] / 255;
    a[i] = data[i] * alpha;
    a[i + 1] = data[i + 1] * alpha;
    a[i + 2] = data[i + 2] * alpha;
    a[i + 3] = data[i + 3];
  }
  for (let p = 0; p < passes; p++) {
    boxPassH(a, b, w, h, r);
    boxPassV(b, a, w, h, r);
  }
  const out = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i += 4) {
    const alpha = a[i + 3];
    const inv = alpha > 0 ? 255 / alpha : 0;
    out[i] = a[i] * inv;
    out[i + 1] = a[i + 1] * inv;
    out[i + 2] = a[i + 2] * inv;
    out[i + 3] = alpha;
  }
  return { data: out, width: w, height: h };
}

export function parseHexColor(hex: string): [number, number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0, 255];
  let v = m[1];
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  const a = v.length === 8 ? parseInt(v.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

/** Solid redaction: every pixel becomes the opaque redaction color. */
export function solidFill(buf: PixelBuffer, color: string): PixelBuffer {
  const [r, g, b] = parseHexColor(color);
  const out = new Uint8ClampedArray(buf.data.length);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 255; // Always opaque: nothing underneath can show through.
  }
  return { data: out, width: buf.width, height: buf.height };
}

export const EFFECT_DEFAULTS = {
  blurRadius: 14,
  blurMin: 4,
  blurMax: 60,
  pixelSize: 14,
  pixelMin: 4,
  pixelMax: 80,
} as const;
