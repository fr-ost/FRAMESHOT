import { describe, expect, it } from 'vitest';
import { boxBlur, createBuffer, parseHexColor, pixelate, solidFill, type PixelBuffer } from '../../src/imaging/effects';
import { dHashFromPixels, hammingDistanceHex } from '../../src/imaging/image-io';

function stripes(w: number, h: number, period = 4): PixelBuffer {
  const b = createBuffer(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = Math.floor(x / (period / 2)) % 2 ? 255 : 0;
      const i = (y * w + x) * 4;
      b.data.set([v, v, v, 255], i);
    }
  return b;
}

const unique = (b: PixelBuffer) => {
  const s = new Set<number>();
  for (let i = 0; i < b.data.length; i += 4) s.add((b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2]);
  return s.size;
};

describe('solid redaction', () => {
  it('replaces every pixel with an opaque color', () => {
    const out = solidFill(stripes(20, 10), '#123456');
    for (let i = 0; i < out.data.length; i += 4) expect([...out.data.subarray(i, i + 4)]).toEqual([0x12, 0x34, 0x56, 255]);
  });

  it('is opaque even over transparent input', () => {
    const out = solidFill(createBuffer(4, 4), '#000');
    expect(out.data[3]).toBe(255);
  });

  it('parses colors', () => {
    expect(parseHexColor('#fff')).toEqual([255, 255, 255, 255]);
    expect(parseHexColor('11223380')).toEqual([17, 34, 51, 128]);
    expect(parseHexColor('nope')).toEqual([0, 0, 0, 255]);
  });
});

describe('pixelate', () => {
  it('averages blocks so fine detail disappears', () => {
    const out = pixelate(stripes(32, 32, 4), 8);
    expect(unique(out)).toBe(1); // every 8px block averages to the same gray
    expect(out.data[0]).toBeGreaterThan(100);
    expect(out.data[0]).toBeLessThan(155);
  });

  it('aligns blocks to the given origin and handles partial blocks', () => {
    const b = createBuffer(10, 1);
    for (let x = 0; x < 10; x++) b.data.set([x * 20, 0, 0, 255], x * 4);
    const out = pixelate(b, 4, 2, 0); // grid starts 2px "before" the buffer
    const reds = Array.from({ length: 10 }, (_, x) => out.data[x * 4]);
    expect(reds.slice(0, 2)).toEqual([10, 10]); // partial first block (x 0–1)
    expect(new Set(reds.slice(2, 6)).size).toBe(1);
  });
});

describe('boxBlur', () => {
  it('removes high-frequency detail', () => {
    const out = boxBlur(stripes(64, 16, 4), 6);
    for (let x = 10; x < 54; x++) {
      const v = out.data[(8 * 64 + x) * 4];
      expect(v).toBeGreaterThan(100);
      expect(v).toBeLessThan(155);
    }
  });

  it('keeps a uniform image unchanged and opaque', () => {
    const b = solidFill(createBuffer(16, 16), '#3366cc');
    const out = boxBlur(b, 5);
    expect([...out.data.subarray(0, 4)]).toEqual([0x33, 0x66, 0xcc, 255]);
    expect([...out.data.subarray(out.data.length - 4)]).toEqual([0x33, 0x66, 0xcc, 255]);
  });
});

describe('perceptual hash', () => {
  it('is stable and measures distance', () => {
    const px = new Uint8ClampedArray(72 * 4);
    for (let i = 0; i < 72; i++) px.set([i * 3, i * 3, i * 3, 255], i * 4);
    const a = dHashFromPixels(px);
    expect(a).toHaveLength(16);
    expect(hammingDistanceHex(a, a)).toBe(0);
    expect(hammingDistanceHex('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hammingDistanceHex('00', '0')).toBe(Infinity);
  });
});
