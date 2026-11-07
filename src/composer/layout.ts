/**
 * Composer layout math (pure). Places the screenshot (optionally inside a
 * generic browser-window frame) on a canvas with padding, alignment and
 * fit/fill/custom scaling.
 */
import type { Rect } from '../core/types';

export type PresetId = 'auto' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16' | 'og' | 'fhd' | 'custom';
export type FitMode = 'fit' | 'fill' | 'custom';
export type Align = 'start' | 'center' | 'end';
export type FrameStyle = 'none' | 'light' | 'dark';
export type BackgroundType = 'solid' | 'gradient' | 'transparent';

export interface ComposerSettings {
  preset: PresetId;
  width: number;
  height: number;
  lockAspect: boolean;
  padding: number;
  background: { type: BackgroundType; color: string; from: string; to: string; angle: number };
  radius: number;
  shadow: { enabled: boolean; blur: number; offsetY: number; opacity: number };
  fit: FitMode;
  scale: number;
  alignX: Align;
  alignY: Align;
  frame: FrameStyle;
}

export const PRESETS: { id: PresetId; label: string; ratio?: number; size?: [number, number] }[] = [
  { id: 'auto', label: 'Fit to screenshot' },
  { id: '16:9', label: '16:9 Widescreen', ratio: 16 / 9 },
  { id: '4:3', label: '4:3 Standard', ratio: 4 / 3 },
  { id: '1:1', label: '1:1 Square', ratio: 1 },
  { id: '4:5', label: '4:5 Portrait', ratio: 4 / 5 },
  { id: '9:16', label: '9:16 Story', ratio: 9 / 16 },
  { id: 'og', label: '1200 × 630 Social card', size: [1200, 630] },
  { id: 'fhd', label: '1920 × 1080 Full HD', size: [1920, 1080] },
  { id: 'custom', label: 'Custom size' },
];

export const MAX_CANVAS = 8192;
const MAX_RATIO_SIDE = 4096;

export const DEFAULT_COMPOSER: ComposerSettings = {
  preset: 'auto',
  width: 1600,
  height: 1000,
  lockAspect: false,
  padding: 64,
  background: { type: 'gradient', color: '#eef2ff', from: '#6366f1', to: '#ec4899', angle: 135 },
  radius: 12,
  shadow: { enabled: true, blur: 40, offsetY: 16, opacity: 0.28 },
  fit: 'fit',
  scale: 100,
  alignX: 'center',
  alignY: 'center',
  frame: 'none',
};

export const GRADIENTS: { from: string; to: string; label: string }[] = [
  { from: '#6366f1', to: '#ec4899', label: 'Indigo to pink' },
  { from: '#0ea5e9', to: '#22c55e', label: 'Sky to green' },
  { from: '#f97316', to: '#facc15', label: 'Sunset' },
  { from: '#111827', to: '#4b5563', label: 'Graphite' },
  { from: '#e0e7ff', to: '#fce7f3', label: 'Soft pastel' },
  { from: '#14b8a6', to: '#6366f1', label: 'Teal to indigo' },
];

/** Frame bar height in screenshot pixels for a given screenshot width. */
export function frameBarHeight(imageWidth: number, frame: FrameStyle): number {
  return frame === 'none' ? 0 : Math.round(Math.max(24, Math.min(72, imageWidth * 0.035)));
}

/** Resolves the canvas size for a preset and screenshot size. */
export function canvasSizeFor(s: ComposerSettings, imgW: number, imgH: number): { width: number; height: number } {
  const objW = imgW;
  const objH = imgH + frameBarHeight(imgW, s.frame);
  const p = Math.max(0, s.padding);
  const preset = PRESETS.find((x) => x.id === s.preset);
  let w: number;
  let h: number;
  if (s.preset === 'custom') {
    w = s.width;
    h = s.height;
  } else if (preset?.size) {
    [w, h] = preset.size;
  } else if (preset?.ratio) {
    const r = preset.ratio;
    w = Math.max(objW + p * 2, (objH + p * 2) * r);
    h = w / r;
    const k = Math.min(1, MAX_RATIO_SIDE / Math.max(w, h));
    w *= k;
    h *= k;
  } else {
    w = objW + p * 2;
    h = objH + p * 2;
    const k = Math.min(1, MAX_CANVAS / Math.max(w, h));
    w *= k;
    h *= k;
  }
  return { width: clampDim(w), height: clampDim(h) };
}

function clampDim(n: number): number {
  return Math.max(16, Math.min(MAX_CANVAS, Math.round(n)));
}

export interface CompositionLayout {
  canvas: { width: number; height: number };
  /** Whole object (frame + image) rect on the canvas. */
  object: Rect;
  /** Screenshot rect on the canvas. */
  image: Rect;
  frameBar: number;
  scale: number;
}

const factor = (a: Align) => (a === 'start' ? 0 : a === 'end' ? 1 : 0.5);

export function computeLayout(s: ComposerSettings, imgW: number, imgH: number): CompositionLayout {
  const canvas = canvasSizeFor(s, imgW, imgH);
  const bar = frameBarHeight(imgW, s.frame);
  const objW = imgW;
  const objH = imgH + bar;
  // When the canvas was scaled down (auto/ratio presets), padding scales too.
  const natural = s.preset === 'auto' ? objW + s.padding * 2 : 0;
  const k = s.preset === 'auto' && natural > 0 ? canvas.width / natural : 1;
  const pad = Math.max(0, s.padding * k);
  const innerW = Math.max(1, canvas.width - pad * 2);
  const innerH = Math.max(1, canvas.height - pad * 2);
  let scale: number;
  if (s.fit === 'fill') scale = Math.max(innerW / objW, innerH / objH);
  else if (s.fit === 'custom') scale = Math.max(0.01, s.scale / 100);
  else scale = Math.min(innerW / objW, innerH / objH);
  const w = objW * scale;
  const h = objH * scale;
  const x = pad + (innerW - w) * factor(s.alignX);
  const y = pad + (innerH - h) * factor(s.alignY);
  return {
    canvas,
    object: { x, y, w, h },
    image: { x, y: y + bar * scale, w: imgW * scale, h: imgH * scale },
    frameBar: bar * scale,
    scale,
  };
}

/** Gradient line endpoints for a CSS-like angle (degrees, 0 = to top). */
export function gradientLine(angle: number, w: number, h: number): [number, number, number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return [cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half];
}

export function sanitizeComposer(input: unknown): ComposerSettings {
  const d = DEFAULT_COMPOSER;
  if (!input || typeof input !== 'object') return { ...d };
  const s = input as Partial<ComposerSettings>;
  const num = (v: unknown, min: number, max: number, f: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : f);
  const color = (v: unknown, f: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : f);
  const pick = <T extends string>(v: unknown, opts: readonly T[], f: T): T => (opts.includes(v as T) ? (v as T) : f);
  return {
    preset: pick(s.preset, PRESETS.map((p) => p.id), d.preset),
    width: Math.round(num(s.width, 16, MAX_CANVAS, d.width)),
    height: Math.round(num(s.height, 16, MAX_CANVAS, d.height)),
    lockAspect: typeof s.lockAspect === 'boolean' ? s.lockAspect : d.lockAspect,
    padding: Math.round(num(s.padding, 0, 1000, d.padding)),
    background: {
      type: pick(s.background?.type, ['solid', 'gradient', 'transparent'] as const, d.background.type),
      color: color(s.background?.color, d.background.color),
      from: color(s.background?.from, d.background.from),
      to: color(s.background?.to, d.background.to),
      angle: num(s.background?.angle, 0, 360, d.background.angle),
    },
    radius: num(s.radius, 0, 200, d.radius),
    shadow: {
      enabled: typeof s.shadow?.enabled === 'boolean' ? s.shadow.enabled : d.shadow.enabled,
      blur: num(s.shadow?.blur, 0, 200, d.shadow.blur),
      offsetY: num(s.shadow?.offsetY, -100, 100, d.shadow.offsetY),
      opacity: num(s.shadow?.opacity, 0, 1, d.shadow.opacity),
    },
    fit: pick(s.fit, ['fit', 'fill', 'custom'] as const, d.fit),
    scale: num(s.scale, 1, 400, d.scale),
    alignX: pick(s.alignX, ['start', 'center', 'end'] as const, d.alignX),
    alignY: pick(s.alignY, ['start', 'center', 'end'] as const, d.alignY),
    frame: pick(s.frame, ['none', 'light', 'dark'] as const, d.frame),
  };
}
