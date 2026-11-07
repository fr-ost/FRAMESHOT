/**
 * Export rendering: produces the final, flattened image.
 *
 *   1. draw the original through crop/orientation/resize
 *   2. apply privacy effects *in the pixel buffer* (getImageData →
 *      blur/pixelate/fill → putImageData). putImageData replaces pixels, so
 *      the original pixels inside a redacted/blurred region are gone from the
 *      output — there is no hidden layer underneath.
 *   3. draw annotations on top
 */
import type { Rect } from '../../core/types';
import { boxBlur, pixelate, solidFill, type PixelBuffer } from '../../imaging/effects';
import { createCanvas, get2d, type Ctx2D } from '../../imaging/image-io';
import { docMatrix } from '../model/transform';
import type { EditorDoc, EffectObject } from '../model/types';
import { isEffect } from '../model/types';
import { drawBase, type BaseImage } from './base';
import { drawAnnotations } from './draw';

/** Integer pixel rect of an effect at a given scale, clamped to the canvas. */
export function effectPixelRect(e: EffectObject, scale: number, width: number, height: number): Rect {
  const x0 = Math.max(0, Math.floor(e.x * scale));
  const y0 = Math.max(0, Math.floor(e.y * scale));
  const x1 = Math.min(width, Math.ceil((e.x + e.w) * scale));
  const y1 = Math.min(height, Math.ceil((e.y + e.h) * scale));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

export function blurPadding(e: EffectObject, scale: number): number {
  return e.type === 'blur' ? Math.ceil(Math.max(1, e.radius * scale) * 3) : 0;
}

/**
 * Processes `padded` (which contains `inner` at offset (ox, oy)) and returns
 * the processed inner pixels.
 */
export function processEffect(e: EffectObject, padded: PixelBuffer, ox: number, oy: number, inner: { w: number; h: number }, scale: number): PixelBuffer {
  const extract = (buf: PixelBuffer): PixelBuffer => {
    if (ox === 0 && oy === 0 && buf.width === inner.w && buf.height === inner.h) return buf;
    const out = new Uint8ClampedArray(inner.w * inner.h * 4);
    for (let y = 0; y < inner.h; y++) {
      const srcStart = ((y + oy) * buf.width + ox) * 4;
      out.set(buf.data.subarray(srcStart, srcStart + inner.w * 4), y * inner.w * 4);
    }
    return { data: out, width: inner.w, height: inner.h };
  };
  switch (e.type) {
    case 'blur':
      return extract(boxBlur(padded, Math.max(1, e.radius * scale)));
    case 'pixelate':
      return pixelate(extract(padded), Math.max(2, e.size * scale));
    case 'redact':
      return solidFill(extract(padded), e.color);
  }
}

/** Applies one effect directly to a canvas context's pixels (identity transform). */
export function applyEffectToContext(ctx: Ctx2D, e: EffectObject, scale: number, width: number, height: number): void {
  const r = effectPixelRect(e, scale, width, height);
  if (r.w <= 0 || r.h <= 0) return;
  const pad = blurPadding(e, scale);
  const px = Math.max(0, r.x - pad);
  const py = Math.max(0, r.y - pad);
  const pw = Math.min(width, r.x + r.w + pad) - px;
  const ph = Math.min(height, r.y + r.h + pad) - py;
  const img = ctx.getImageData(px, py, pw, ph);
  const processed = processEffect(e, { data: img.data, width: pw, height: ph }, r.x - px, r.y - py, r, scale);
  ctx.putImageData(new ImageData(processed.data as Uint8ClampedArray<ArrayBuffer>, processed.width, processed.height), r.x, r.y);
}

export interface FlattenOptions {
  /** Output scale relative to the document size (1 = full resolution). */
  scale?: number;
  /** Skip annotations (used for previews of the processed base only). */
  annotations?: boolean;
}

export function renderFlattened(doc: EditorDoc, base: BaseImage, opts: FlattenOptions = {}): OffscreenCanvas {
  const scale = opts.scale ?? 1;
  const width = Math.max(1, Math.round(doc.output.width * scale));
  const height = Math.max(1, Math.round(doc.output.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = get2d(canvas, { willReadFrequently: doc.objects.some(isEffect) });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawBase(ctx, base, docMatrix(doc));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const o of doc.objects) if (isEffect(o)) applyEffectToContext(ctx, o, scale, width, height);
  if (opts.annotations !== false) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawAnnotations(ctx, doc.objects);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return canvas;
}
