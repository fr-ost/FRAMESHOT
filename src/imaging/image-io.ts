/**
 * Image helpers that work in both the service worker and extension pages
 * (they rely only on OffscreenCanvas / createImageBitmap).
 */
import type { ImageFormat } from '../core/types';
import { FORMAT_MIME } from '../core/types';

export type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
export type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function createCanvas(width: number, height: number): OffscreenCanvas {
  return new OffscreenCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}

export function get2d(canvas: AnyCanvas, opts?: CanvasRenderingContext2DSettings): Ctx2D {
  const ctx = canvas.getContext('2d', opts) as Ctx2D | null;
  if (!ctx) {
    throw new Error(
      `Your browser could not allocate a ${canvas.width}×${canvas.height} image. It may be too large for available memory.`,
    );
  }
  return ctx;
}

export async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    throw new Error('This image could not be decoded. It may be corrupted or in an unsupported format.');
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function canvasToBlob(canvas: AnyCanvas, format: ImageFormat, quality?: number): Promise<Blob> {
  const type = FORMAT_MIME[format];
  let source: AnyCanvas = canvas;
  if (format === 'jpeg') {
    // JPEG has no alpha channel; flatten onto white instead of Chrome's black.
    const flat = createCanvas(canvas.width, canvas.height);
    const ctx = get2d(flat);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    source = flat;
  }
  let blob: Blob | null;
  if ('convertToBlob' in source) {
    blob = await source.convertToBlob({ type, quality });
  } else {
    const el = source;
    blob = await new Promise<Blob | null>((resolve) => el.toBlob(resolve, type, quality));
  }
  if (!blob || blob.size === 0) {
    throw new Error('The image could not be encoded. It may be too large for available memory.');
  }
  if (blob.type !== type) {
    throw new Error(`Your browser cannot encode ${format.toUpperCase()} images.`);
  }
  return blob;
}

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Thumbnails show the top of the image at a fixed width (long pages are cropped
 * to a portrait card rather than squashed into a sliver).
 */
export async function makeThumbnail(source: CanvasImageSource & { width: number; height: number }, opts: ThumbnailOptions = {}): Promise<Blob> {
  const maxW = opts.maxWidth ?? 480;
  const maxH = opts.maxHeight ?? 720;
  const sw = source.width;
  const sh = source.height;
  const scale = Math.min(1, maxW / sw);
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.min(maxH, Math.round(sh * scale)));
  const canvas = createCanvas(w, h);
  const ctx = get2d(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, sw, h / scale, 0, 0, w, h);
  return canvasToBlob(canvas, 'webp', 0.82);
}

/** 64-bit difference hash (dHash) as 16 hex chars, for duplicate detection. */
export function dHash(source: CanvasImageSource & { width: number; height: number }): string {
  const canvas = createCanvas(9, 8);
  const ctx = get2d(canvas, { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, 9, 8);
  const { data } = ctx.getImageData(0, 0, 9, 8);
  return dHashFromPixels(data);
}

export function dHashFromPixels(data: Uint8ClampedArray): string {
  const gray: number[] = [];
  for (let i = 0; i < 72; i++) gray.push(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  let hex = '';
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) byte = (byte << 1) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

let cachedMaxDimension: number | null = null;

/**
 * Probes the real maximum canvas dimension (cheaply, with a 1px-wide canvas).
 * Chrome's documented limit is 32,767; newer versions may allow more.
 */
export function probeMaxCanvasDimension(): number {
  if (cachedMaxDimension) return cachedMaxDimension;
  for (const candidate of [65535, 32767, 16384]) {
    try {
      const c = new OffscreenCanvas(1, candidate);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, candidate - 1, 1, 1);
      const px = ctx.getImageData(0, candidate - 1, 1, 1).data;
      if (px[0] === 255 && px[3] === 255) {
        cachedMaxDimension = candidate;
        return candidate;
      }
    } catch {
      // Try the next smaller size.
    }
  }
  cachedMaxDimension = 16384;
  return cachedMaxDimension;
}
