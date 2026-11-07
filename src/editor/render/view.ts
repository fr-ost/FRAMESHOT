/**
 * On-screen rendering for the editor canvas.
 *
 * Document content is drawn with the view transform (zoom/pan); selection
 * handles and the crop overlay are drawn in screen space so they stay crisp.
 * Privacy effects are computed exactly (same code as export) and cached; while
 * an effect is being dragged a cheap live preview is drawn instead.
 */
import type { Rect } from '../../core/types';
import { createCanvas, get2d } from '../../imaging/image-io';
import { handlesFor, objectBounds } from '../model/objects';
import type { EditorState } from '../model/store';
import { docMatrix } from '../model/transform';
import type { EditorObject, EffectObject } from '../model/types';
import { isEffect } from '../model/types';
import { drawBase, type BaseImage } from './base';
import { drawAnnotation } from './draw';
import { blurPadding, processEffect } from './flatten';

const ACCENT = '#6366f1';
const MAX_PATCH_PIXELS = 6_000_000;

export interface RenderExtras {
  draft?: EditorObject | null;
  marquee?: Rect | null;
  /** Objects currently being dragged/resized (use cheap previews). */
  live?: Set<string>;
  hoverId?: string | null;
  dark?: boolean;
}

interface Patch {
  key: string;
  canvas: OffscreenCanvas;
}

export class ViewRenderer {
  private patches = new Map<string, Patch>();
  private checker: CanvasPattern | null = null;

  constructor(private base: BaseImage) {}

  dispose(): void {
    this.patches.clear();
  }

  render(canvas: HTMLCanvasElement, state: EditorState, extras: RenderExtras = {}): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { zoom, panX, panY } = state.view;
    const { doc } = state;
    const W = doc.output.width;
    const H = doc.output.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Visible document region (for culling).
    const visible: Rect = {
      x: -panX / zoom,
      y: -panY / zoom,
      w: canvas.width / dpr / zoom,
      h: canvas.height / dpr / zoom,
    };

    // Page shadow + transparency checkerboard.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = extras.dark ? '#1c1c20' : '#ffffff';
    ctx.fillRect(panX, panY, W * zoom, H * zoom);
    ctx.restore();
    ctx.fillStyle = this.checkerPattern(ctx, !!extras.dark);
    ctx.fillRect(panX, panY, W * zoom, H * zoom);

    // Document content.
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.imageSmoothingEnabled = zoom < 2;
    ctx.imageSmoothingQuality = 'high';
    const matrix = docMatrix(doc);
    drawBase(ctx, this.base, matrix, visible);

    const docKey = `${doc.crop.x},${doc.crop.y},${doc.crop.w},${doc.crop.h}|${doc.orientation.join(',')}|${W}x${H}`;
    const used = new Set<string>();
    const earlier: { e: EffectObject; key: string; patch: Patch | null }[] = [];
    const effects = doc.objects.filter(isEffect) as EffectObject[];
    const draftEffect = extras.draft && isEffect(extras.draft) ? (extras.draft as EffectObject) : null;
    for (const e of [...effects, ...(draftEffect ? [draftEffect] : [])]) {
      const deps = earlier.filter((p) => intersects(p.e, e)).map((p) => p.key);
      const key = `${JSON.stringify(e)}|${docKey}|${deps.join(';')}`;
      const live = extras.live?.has(e.id) || e === draftEffect || deps.some((d) => !this.patches.has(d));
      let patch: Patch | null = null;
      if (!live) {
        patch = this.patches.get(e.id) ?? null;
        if (!patch || patch.key !== key) {
          patch = this.computePatch(e, key, matrix, earlier.filter((p) => intersects(p.e, e)));
          if (patch) this.patches.set(e.id, patch);
        }
        used.add(e.id);
      }
      if (patch) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(e.x, e.y, e.w, e.h);
        ctx.clip();
        ctx.clearRect(e.x, e.y, e.w, e.h);
        ctx.imageSmoothingEnabled = e.type !== 'pixelate';
        ctx.drawImage(patch.canvas, e.x, e.y, e.w, e.h);
        ctx.restore();
      } else {
        this.drawCheapEffect(ctx, e, matrix, zoom * dpr);
      }
      earlier.push({ e, key, patch });
    }
    for (const id of [...this.patches.keys()]) if (!used.has(id)) this.patches.delete(id);

    for (const o of doc.objects) {
      if (isEffect(o) || o.id === state.editingTextId) continue;
      drawAnnotation(ctx, o);
    }
    if (extras.draft && !isEffect(extras.draft)) drawAnnotation(ctx, extras.draft);
    ctx.restore();

    // Effect outlines (so invisible-ish regions remain discoverable).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const e of effects) {
      if (state.selection.includes(e.id)) continue;
      const r = toScreen(e, zoom, panX, panY);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(99,102,241,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
      ctx.restore();
    }

    // Hover outline.
    if (extras.hoverId && !state.selection.includes(extras.hoverId)) {
      const o = doc.objects.find((x) => x.id === extras.hoverId);
      if (o) {
        const r = toScreen(objectBounds(o), zoom, panX, panY);
        ctx.strokeStyle = 'rgba(99,102,241,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
      }
    }

    // Selection.
    const selected = doc.objects.filter((o) => state.selection.includes(o.id));
    if (selected.length && state.tool !== 'crop' && !state.editingTextId) {
      const linear = selected.length === 1 && (selected[0].type === 'arrow' || selected[0].type === 'line');
      if (!linear) {
        for (const o of selected.length > 1 ? selected : []) {
          const r = toScreen(objectBounds(o), zoom, panX, panY);
          ctx.strokeStyle = 'rgba(99,102,241,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
        }
        const all = selected.map(objectBounds);
        const x = Math.min(...all.map((b) => b.x));
        const y = Math.min(...all.map((b) => b.y));
        const r = toScreen({ x, y, w: Math.max(...all.map((b) => b.x + b.w)) - x, h: Math.max(...all.map((b) => b.y + b.h)) - y }, zoom, panX, panY);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w), Math.round(r.h));
      }
      for (const h of handlesFor(selected)) {
        drawHandle(ctx, h.x * zoom + panX, h.y * zoom + panY, linear);
      }
    }

    if (extras.marquee) {
      const r = toScreen(extras.marquee, zoom, panX, panY);
      ctx.fillStyle = 'rgba(99,102,241,0.08)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
    }

    if (state.tool === 'crop' && state.cropRect) this.drawCropOverlay(ctx, state, zoom, panX, panY);
  }

  private computePatch(e: EffectObject, key: string, matrix: ReturnType<typeof docMatrix>, earlier: { e: EffectObject; patch: Patch | null }[]): Patch | null {
    const area = e.w * e.h;
    if (area < 1) return null;
    const scale = area > MAX_PATCH_PIXELS ? Math.sqrt(MAX_PATCH_PIXELS / area) : 1;
    const innerW = Math.max(1, Math.round(e.w * scale));
    const innerH = Math.max(1, Math.round(e.h * scale));
    const pad = blurPadding(e, scale);
    const pw = innerW + pad * 2;
    const ph = innerH + pad * 2;
    const region = createCanvas(pw, ph);
    const rctx = get2d(region, { willReadFrequently: true });
    rctx.imageSmoothingEnabled = true;
    rctx.imageSmoothingQuality = 'high';
    // Map document → region pixels: translate so (e.x - pad/scale) is the origin.
    rctx.setTransform(scale, 0, 0, scale, -(e.x * scale - pad), -(e.y * scale - pad));
    drawBase(rctx, this.base, matrix);
    for (const p of earlier) if (p.patch) rctx.drawImage(p.patch.canvas, p.e.x, p.e.y, p.e.w, p.e.h);
    rctx.setTransform(1, 0, 0, 1, 0, 0);
    const img = rctx.getImageData(0, 0, pw, ph);
    const processed = processEffect(e, { data: img.data, width: pw, height: ph }, pad, pad, { w: innerW, h: innerH }, scale);
    const out = createCanvas(innerW, innerH);
    get2d(out).putImageData(new ImageData(processed.data as Uint8ClampedArray<ArrayBuffer>, innerW, innerH), 0, 0);
    return { key, canvas: out };
  }

  private drawCheapEffect(ctx: CanvasRenderingContext2D, e: EffectObject, matrix: ReturnType<typeof docMatrix>, pxPerDoc: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(e.x, e.y, e.w, e.h);
    ctx.clip();
    if (e.type === 'redact') {
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.w, e.h);
    } else if (e.type === 'blur') {
      ctx.filter = `blur(${Math.max(1, e.radius * pxPerDoc * 0.6)}px)`;
      drawBase(ctx, this.base, matrix, { x: e.x - e.radius * 3, y: e.y - e.radius * 3, w: e.w + e.radius * 6, h: e.h + e.radius * 6 });
      ctx.filter = 'none';
    } else {
      const cols = Math.max(1, Math.round(e.w / e.size));
      const rows = Math.max(1, Math.round(e.h / e.size));
      const small = createCanvas(cols, rows);
      const sctx = get2d(small);
      sctx.imageSmoothingEnabled = true;
      sctx.setTransform(cols / e.w, 0, 0, rows / e.h, (-e.x * cols) / e.w, (-e.y * rows) / e.h);
      drawBase(sctx, this.base, matrix);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, e.x, e.y, e.w, e.h);
    }
    ctx.restore();
  }

  private drawCropOverlay(ctx: CanvasRenderingContext2D, state: EditorState, zoom: number, panX: number, panY: number): void {
    const { doc } = state;
    const crop = state.cropRect!;
    const page = toScreen({ x: 0, y: 0, w: doc.output.width, h: doc.output.height }, zoom, panX, panY);
    const r = toScreen(normalize(crop), zoom, panX, panY);
    ctx.save();
    ctx.fillStyle = 'rgba(9,9,11,0.55)';
    ctx.beginPath();
    ctx.rect(page.x, page.y, page.w, page.h);
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
      ctx.moveTo(r.x + (r.w * i) / 3, r.y);
      ctx.lineTo(r.x + (r.w * i) / 3, r.y + r.h);
      ctx.moveTo(r.x, r.y + (r.h * i) / 3);
      ctx.lineTo(r.x + r.w, r.y + (r.h * i) / 3);
    }
    ctx.stroke();
    const pts = [
      [r.x, r.y],
      [r.x + r.w / 2, r.y],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h / 2],
      [r.x + r.w, r.y + r.h],
      [r.x + r.w / 2, r.y + r.h],
      [r.x, r.y + r.h],
      [r.x, r.y + r.h / 2],
    ];
    for (const [x, y] of pts) drawHandle(ctx, x, y, false);
    const label = `${Math.round(Math.abs(crop.w))} × ${Math.round(Math.abs(crop.h))}`;
    ctx.font = '600 12px Inter Variable, system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 12;
    const ly = r.y > 28 ? r.y - 26 : r.y + 6;
    ctx.fillStyle = 'rgba(17,17,24,0.85)';
    ctx.beginPath();
    ctx.roundRect(r.x, ly, tw, 20, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + 6, ly + 10);
    ctx.restore();
  }

  private checkerPattern(ctx: CanvasRenderingContext2D, dark: boolean): CanvasPattern | string {
    if (this.checker) return this.checker;
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const g = c.getContext('2d');
    if (!g) return dark ? '#1c1c20' : '#ffffff';
    g.fillStyle = dark ? '#1c1c20' : '#ffffff';
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = dark ? '#26262b' : '#e9e9ec';
    g.fillRect(0, 0, 8, 8);
    g.fillRect(8, 8, 8, 8);
    this.checker = ctx.createPattern(c, 'repeat');
    return this.checker ?? '#ffffff';
  }
}

function normalize(r: Rect): Rect {
  return { x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h), w: Math.abs(r.w), h: Math.abs(r.h) };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function toScreen(r: Rect, zoom: number, panX: number, panY: number): Rect {
  return { x: r.x * zoom + panX, y: r.y * zoom + panY, w: r.w * zoom, h: r.h * zoom };
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, round: boolean): void {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 2;
  ctx.beginPath();
  if (round) ctx.arc(x, y, 5, 0, Math.PI * 2);
  else ctx.rect(Math.round(x) - 4.5, Math.round(y) - 4.5, 9, 9);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}
