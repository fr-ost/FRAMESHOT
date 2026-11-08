import { describe, expect, it } from 'vitest';
import { buildPalette, frameDelaysCs, GifBuilder } from '../../src/recorder/gif';
import { planGif } from '../../src/recorder/gif-export';
import { soundForStatus } from '../../src/background/sound';
import { SOUND_DURATION, SOUND_NAMES } from '../../src/core/sound-synth';
import { sanitizeSettings } from '../../src/core/settings';
import type { CaptureStatus } from '../../src/core/types';

// ── A minimal GIF decoder, to check what the encoder wrote frame by frame ──
interface DecodedFrame {
  delayCs: number;
  dispose: number;
  transparentIndex: number | null;
  pixels: Uint8Array; // palette indices as written (before compositing)
}
function decodeGif(bytes: Uint8Array) {
  let p = 0;
  const u8 = () => bytes[p++];
  const u16 = () => {
    const v = bytes[p] | (bytes[p + 1] << 8);
    p += 2;
    return v;
  };
  const header = String.fromCharCode(...bytes.subarray(0, 6));
  p = 6;
  const width = u16();
  const height = u16();
  const packed = u8();
  u8();
  u8();
  const globalSize = packed & 0x80 ? 2 << (packed & 7) : 0;
  const palette: number[][] = [];
  for (let i = 0; i < globalSize; i++) palette.push([u8(), u8(), u8()]);
  const frames: DecodedFrame[] = [];
  let loop: number | null = null;
  let gce = { delayCs: 0, dispose: 0, transparentIndex: null as number | null };
  const subBlocks = () => {
    const out: number[] = [];
    for (let len = u8(); len !== 0; len = u8()) for (let i = 0; i < len; i++) out.push(u8());
    return out;
  };
  for (;;) {
    const b = u8();
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = u8();
      const data = subBlocks();
      if (label === 0xf9) gce = { dispose: (data[0] >> 2) & 7, delayCs: data[1] | (data[2] << 8), transparentIndex: data[0] & 1 ? data[3] : null };
      if (label === 0xff && String.fromCharCode(...data.slice(0, 11)) === 'NETSCAPE2.0') loop = data[12] | (data[13] << 8);
    } else if (b === 0x2c) {
      u16();
      u16();
      const w = u16();
      const h = u16();
      const ip = u8();
      if (ip & 0x80) p += 3 * (2 << (ip & 7));
      const minCode = u8();
      const data = subBlocks();
      frames.push({ ...gce, pixels: lzwDecode(data, minCode, w * h) });
      gce = { delayCs: 0, dispose: 0, transparentIndex: null };
    } else throw new Error('bad block ' + b);
  }
  return { header, width, height, palette, frames, loop };
}
function lzwDecode(data: number[], minCode: number, count: number): Uint8Array {
  const out = new Uint8Array(count);
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let size = minCode + 1;
  let dict: number[][] = [];
  const reset = () => {
    dict = Array.from({ length: clear + 2 }, (_, i) => [i]);
    size = minCode + 1;
  };
  reset();
  let bits = 0;
  let acc = 0;
  let o = 0;
  let prev: number[] | null = null;
  for (const byte of data) {
    acc |= byte << bits;
    bits += 8;
    while (bits >= size) {
      const code = acc & ((1 << size) - 1);
      acc >>= size;
      bits -= size;
      if (code === clear) {
        reset();
        prev = null;
        continue;
      }
      if (code === eoi) return out;
      let entry = dict[code];
      if (!entry && prev) entry = [...prev, prev[0]];
      if (!entry) throw new Error('bad code');
      for (const v of entry) if (o < count) out[o++] = v;
      if (prev) dict.push([...prev, entry[0]]);
      prev = entry;
      if (dict.length === 1 << size && size < 12) size++;
    }
  }
  return out;
}

function solid(w: number, h: number, rgb: [number, number, number], patch?: { x: number; y: number; w: number; h: number; rgb: [number, number, number] }) {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inside = patch && x >= patch.x && x < patch.x + patch.w && y >= patch.y && y < patch.y + patch.h;
      const c = inside ? patch!.rgb : rgb;
      const i = (y * w + x) * 4;
      a[i] = c[0];
      a[i + 1] = c[1];
      a[i + 2] = c[2];
      a[i + 3] = 255;
    }
  return a;
}

describe('GIF builder', () => {
  const W = 12;
  const H = 8;
  const red: [number, number, number] = [220, 40, 40];
  const blue: [number, number, number] = [30, 80, 230];
  const frames = [solid(W, H, red), solid(W, H, red), solid(W, H, red, { x: 2, y: 2, w: 3, h: 3, rgb: blue }), solid(W, H, blue)];

  it('writes a looping GIF89a, merges identical frames, and stores only changed pixels', () => {
    const palette = buildPalette(frames);
    const b = new GifBuilder({ width: W, height: H, repeat: 0 }, palette);
    frames.forEach((f) => b.addFrame(f, 10));
    expect(b.stats).toEqual({ frames: 3, merged: 1 });
    const gif = decodeGif(b.finish());
    expect(gif.header).toBe('GIF89a');
    expect([gif.width, gif.height]).toEqual([W, H]);
    expect(gif.loop).toBe(0);
    // The quantized colours plus one transparent slot (the table is padded to a power of two).
    expect(gif.palette.length).toBeGreaterThanOrEqual(palette.length + 1);
    // Two identical red frames became one frame shown twice as long.
    expect(gif.frames.map((f) => f.delayCs)).toEqual([20, 10, 10]);
    expect(gif.frames.every((f) => f.dispose === 1)).toBe(true);
    expect(gif.frames[0].transparentIndex).toBeNull();
    const t = gif.frames[1].transparentIndex!;
    expect(t).toBe(palette.length);
    // Frame 2 only touches the 3×3 patch; everything else is transparent.
    const changed = [...gif.frames[1].pixels].filter((v) => v !== t).length;
    expect(changed).toBe(9);
    // Compositing the frames reproduces the last picture: all blue.
    const canvas = new Uint8Array(gif.frames[0].pixels);
    for (const f of gif.frames.slice(1)) f.pixels.forEach((v, i) => v !== f.transparentIndex && (canvas[i] = v));
    const [r, g, bl] = gif.palette[canvas[0]];
    expect(bl).toBeGreaterThan(r + 100);
    expect(new Set(canvas).size).toBe(1);
    expect(g).toBeLessThan(bl);
  });

  it('plays once when asked and rejects frames of the wrong size or an empty GIF', () => {
    const palette = buildPalette([frames[0]]);
    const once = new GifBuilder({ width: W, height: H, repeat: -1 }, palette);
    once.addFrame(frames[0], 7);
    expect(decodeGif(once.finish()).loop).toBeNull();
    expect(() => new GifBuilder({ width: W, height: H, repeat: 0 }, palette).addFrame(new Uint8ClampedArray(10), 5)).toThrow(/size/);
    expect(() => new GifBuilder({ width: W, height: H, repeat: 0 }, palette).finish()).toThrow(/no frames/);
  });

  it('spreads delays so the GIF keeps the clip’s real length', () => {
    expect(frameDelaysCs(3, 10)).toEqual([10, 10, 10]);
    const d15 = frameDelaysCs(15, 15);
    expect(d15.reduce((a, b) => a + b, 0)).toBe(100);
    expect(Math.min(...d15)).toBeGreaterThanOrEqual(6);
    expect(frameDelaysCs(1, 200)).toEqual([2]); // never below the 2 cs browsers honour
  });
});

describe('GIF planning', () => {
  it('clamps the range, keeps the aspect ratio and never upscales', () => {
    const p = planGif(12, 1920, 1080, { start: 2, end: 4, width: 640, fps: 10, loop: true });
    expect([p.width, p.height]).toEqual([640, 360]);
    expect(p.times.length).toBe(20);
    expect(p.times[0]).toBe(2);
    expect(p.delaysCs.reduce((a, b) => a + b, 0)).toBe(200);
    const small = planGif(5, 400, 300, { start: 0, end: 5, width: 800, fps: 10, loop: true });
    expect(small.width).toBe(400);
  });

  it('caps GIFs at 60 seconds and keeps every sample inside the video', () => {
    const p = planGif(300, 1280, 720, { start: 10, end: 290, width: 480, fps: 10, loop: true });
    expect(p.end - p.start).toBe(60);
    expect(p.times.length).toBe(600);
    const edge = planGif(3, 1280, 720, { start: 2.95, end: 9, width: 480, fps: 10, loop: false });
    expect(Math.max(...edge.times)).toBeLessThan(3);
    expect(edge.times.length).toBeGreaterThanOrEqual(1);
  });
});

describe('sounds', () => {
  const status = (phase: CaptureStatus['phase'], patch: Partial<CaptureStatus> = {}): CaptureStatus => ({ phase, updatedAt: 1, ...patch });

  it('maps capture status changes to sound effects, once each', () => {
    expect(soundForStatus(status('saving'), status('done'))).toBe('shutter');
    expect(soundForStatus(status('done'), status('done'))).toBeNull();
    expect(soundForStatus(status('capturing'), status('error', { errorCode: 'incomplete' }))).toBe('error');
    expect(soundForStatus(status('idle'), status('error', { errorCode: 'busy' }))).toBeNull();
    expect(soundForStatus(status('idle'), status('waiting', { message: '3' }))).toBe('tick');
    expect(soundForStatus(status('waiting', { message: '3' }), status('waiting', { message: '3' }))).toBeNull();
    expect(soundForStatus(status('waiting', { message: '3' }), status('waiting', { message: '2' }))).toBe('tick');
    expect(soundForStatus(status('preparing'), status('cancelled'))).toBeNull();
  });

  it('has a length for every sound and validates sound settings', () => {
    for (const n of SOUND_NAMES) expect(SOUND_DURATION[n]).toBeGreaterThan(0);
    expect(sanitizeSettings(undefined).sounds).toEqual({ enabled: true, volume: 0.6 });
    expect(sanitizeSettings({ sounds: { enabled: false, volume: 7 } }).sounds).toEqual({ enabled: false, volume: 1 });
    expect(sanitizeSettings({ sounds: { enabled: 'yes', volume: -1 } }).sounds).toEqual({ enabled: true, volume: 0 });
  });
});
