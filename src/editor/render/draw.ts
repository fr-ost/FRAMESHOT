/**
 * Draws annotation objects onto a 2D context in document coordinates. The
 * same code renders the on-screen view and the exported image, so what you
 * see is what you export.
 */
import type { Ctx2D } from '../../imaging/image-io';
import { textPadding } from '../model/objects';
import type { AnnotationObject, ArrowObject, EditorObject, MarkerObject, SymbolObject, TextObject } from '../model/types';
import { FONT_STACKS, isEffect } from '../model/types';

export function fontFor(t: Pick<TextObject, 'bold' | 'size' | 'font'>): string {
  return `${t.bold ? 700 : 500} ${t.size}px ${FONT_STACKS[t.font]}`;
}

export function lineHeight(size: number): number {
  return size * 1.25;
}

let measureCtx: OffscreenCanvasRenderingContext2D | null = null;
/** Precise text box measurement (content area, without background padding). */
export function measureText(t: TextObject): { width: number; height: number } {
  if (!measureCtx && typeof OffscreenCanvas !== 'undefined') measureCtx = new OffscreenCanvas(1, 1).getContext('2d');
  const lines = (t.text || ' ').split('\n');
  if (!measureCtx) {
    const longest = Math.max(1, ...lines.map((l) => l.length));
    return { width: longest * t.size * 0.56, height: lines.length * lineHeight(t.size) };
  }
  measureCtx.font = fontFor(t);
  const width = Math.max(t.size * 0.3, ...lines.map((l) => measureCtx!.measureText(l || ' ').width));
  return { width, height: lines.length * lineHeight(t.size) };
}

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export function contrastColor(hex: string): string {
  return luminance(hex) > 0.6 ? '#111111' : '#ffffff';
}

function roundedRectPath(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  if (rr <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawArrow(ctx: Ctx2D, o: ArrowObject): void {
  const dx = o.x2 - o.x1;
  const dy = o.y2 - o.y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = Math.min(len * (o.heads === 'both' ? 0.45 : 0.8), Math.max(12, o.width * 3.4));
  const headHalf = headLen * 0.55;
  const head = (tipX: number, tipY: number, dirX: number, dirY: number) => {
    const bx = tipX - dirX * headLen;
    const by = tipY - dirY * headLen;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(bx - dirY * headHalf, by + dirX * headHalf);
    ctx.lineTo(bx + dirY * headHalf, by - dirX * headHalf);
    ctx.closePath();
    ctx.fill();
  };
  ctx.strokeStyle = o.color;
  ctx.fillStyle = o.color;
  ctx.lineWidth = o.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const startInset = o.heads === 'both' ? headLen * 0.8 : 0;
  ctx.beginPath();
  ctx.moveTo(o.x1 + ux * startInset, o.y1 + uy * startInset);
  ctx.lineTo(o.x2 - ux * headLen * 0.8, o.y2 - uy * headLen * 0.8);
  ctx.stroke();
  head(o.x2, o.y2, ux, uy);
  if (o.heads === 'both') head(o.x1, o.y1, -ux, -uy);
}

function smoothPath(ctx: Ctx2D, pts: number[]): void {
  ctx.beginPath();
  if (pts.length < 2) return;
  ctx.moveTo(pts[0], pts[1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[0] + 0.01, pts[1] + 0.01);
    return;
  }
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2;
    const my = (pts[i + 1] + pts[i + 3]) / 2;
    ctx.quadraticCurveTo(pts[i], pts[i + 1], mx, my);
  }
  ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
}

function drawText(ctx: Ctx2D, o: TextObject): void {
  const lines = (o.text || '').split('\n');
  ctx.font = fontFor(o);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const lh = lineHeight(o.size);
  if (o.background) {
    const m = measureText(o);
    const pad = textPadding(o);
    ctx.fillStyle = o.background;
    roundedRectPath(ctx, o.x - pad, o.y - pad, m.width + pad * 2, m.height + pad * 2, o.size * 0.25);
    ctx.fill();
  }
  // Vertical offset so glyphs sit nicely within the line box.
  const offset = (lh - o.size) / 2;
  if (o.outline) {
    ctx.strokeStyle = contrastColor(o.color);
    ctx.lineWidth = Math.max(2, o.size * 0.16);
    ctx.lineJoin = 'round';
    lines.forEach((line, i) => ctx.strokeText(line, o.x, o.y + offset + i * lh));
  }
  ctx.fillStyle = o.color;
  lines.forEach((line, i) => ctx.fillText(line, o.x, o.y + offset + i * lh));
}

function drawMarker(ctx: Ctx2D, o: MarkerObject): void {
  const r = o.size / 2;
  ctx.beginPath();
  ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
  ctx.fillStyle = o.fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, o.size * 0.06);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  const label = String(o.n);
  ctx.fillStyle = o.textColor;
  ctx.font = `700 ${Math.round(o.size * (label.length > 2 ? 0.4 : label.length > 1 ? 0.48 : 0.56))}px ${FONT_STACKS.sans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, o.x, o.y + o.size * 0.03);
}

function drawSymbol(ctx: Ctx2D, o: SymbolObject): void {
  const s = o.size;
  const r = s / 2;
  const { x, y } = o;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (o.symbol === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = o.color;
    ctx.fill();
    return;
  }
  if (o.symbol === 'heart') {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.8);
    ctx.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.3, y - r * 0.1, x, y + r * 0.8);
    ctx.closePath();
    ctx.fillStyle = o.color;
    ctx.fill();
    return;
  }
  // Badge symbols: filled circle with a white glyph.
  if (o.symbol === 'warning') {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y + r * 0.82);
    ctx.lineTo(x - r, y + r * 0.82);
    ctx.closePath();
    ctx.fillStyle = o.color;
    ctx.lineWidth = s * 0.08;
    ctx.strokeStyle = o.color;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = o.color;
    ctx.fill();
  }
  const glyph = contrastColor(o.color);
  ctx.strokeStyle = glyph;
  ctx.fillStyle = glyph;
  ctx.lineWidth = s * 0.11;
  ctx.beginPath();
  switch (o.symbol) {
    case 'check':
      ctx.moveTo(x - r * 0.45, y + r * 0.02);
      ctx.lineTo(x - r * 0.12, y + r * 0.35);
      ctx.lineTo(x + r * 0.48, y - r * 0.3);
      ctx.stroke();
      break;
    case 'cross':
      ctx.moveTo(x - r * 0.38, y - r * 0.38);
      ctx.lineTo(x + r * 0.38, y + r * 0.38);
      ctx.moveTo(x + r * 0.38, y - r * 0.38);
      ctx.lineTo(x - r * 0.38, y + r * 0.38);
      ctx.stroke();
      break;
    case 'question':
      ctx.font = `800 ${Math.round(s * 0.66)}px ${FONT_STACKS.sans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y + s * 0.04);
      break;
    case 'info':
      ctx.moveTo(x, y - r * 0.05);
      ctx.lineTo(x, y + r * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - r * 0.42, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'warning':
      ctx.moveTo(x, y - r * 0.32);
      ctx.lineTo(x, y + r * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + r * 0.5, s * 0.065, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

export function drawAnnotation(ctx: Ctx2D, o: AnnotationObject): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, o.opacity ?? 1));
  switch (o.type) {
    case 'arrow':
      drawArrow(ctx, o);
      break;
    case 'line':
      ctx.strokeStyle = o.color;
      ctx.lineWidth = o.width;
      ctx.lineCap = 'round';
      if (o.dashed) ctx.setLineDash([o.width * 2.5, o.width * 2]);
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1);
      ctx.lineTo(o.x2, o.y2);
      ctx.stroke();
      break;
    case 'rect':
      roundedRectPath(ctx, o.x, o.y, o.w, o.h, o.radius);
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.fill();
      }
      if (o.strokeWidth > 0) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.max(0.1, o.w / 2), Math.max(0.1, o.h / 2), 0, 0, Math.PI * 2);
      if (o.fill) {
        ctx.fillStyle = o.fill;
        ctx.fill();
      }
      if (o.strokeWidth > 0) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.strokeWidth;
        ctx.stroke();
      }
      break;
    case 'pen':
      ctx.strokeStyle = o.color;
      ctx.lineWidth = o.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      smoothPath(ctx, o.points);
      ctx.stroke();
      break;
    case 'highlighter':
      // Multiply keeps text under the highlight readable.
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.55);
      ctx.strokeStyle = o.color;
      ctx.lineWidth = o.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      smoothPath(ctx, o.points);
      ctx.stroke();
      break;
    case 'text':
      drawText(ctx, o);
      break;
    case 'marker':
      drawMarker(ctx, o);
      break;
    case 'symbol':
      drawSymbol(ctx, o);
      break;
  }
  ctx.restore();
}

/** Draws all non-effect objects in z-order, optionally skipping one id. */
export function drawAnnotations(ctx: Ctx2D, objects: EditorObject[], skipId?: string | null): void {
  for (const o of objects) {
    if (isEffect(o) || o.id === skipId) continue;
    drawAnnotation(ctx, o);
  }
}
