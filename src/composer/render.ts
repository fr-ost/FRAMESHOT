import { createCanvas, get2d, type Ctx2D } from '../imaging/image-io';
import { computeLayout, gradientLine, type ComposerSettings } from './layout';

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rr);
}

/**
 * Renders a composition. `scale` < 1 renders a smaller preview with identical
 * proportions; exports use scale 1.
 */
export function renderComposition(
  image: CanvasImageSource & { width: number; height: number },
  s: ComposerSettings,
  opts: { scale?: number; domain?: string } = {},
): OffscreenCanvas {
  const k = opts.scale ?? 1;
  const layout = computeLayout(s, image.width, image.height);
  const canvas = createCanvas(Math.max(1, Math.round(layout.canvas.width * k)), Math.max(1, Math.round(layout.canvas.height * k)));
  const ctx = get2d(canvas);
  ctx.scale(k, k);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const { width: W, height: H } = layout.canvas;

  // Background
  if (s.background.type === 'solid') {
    ctx.fillStyle = s.background.color;
    ctx.fillRect(0, 0, W, H);
  } else if (s.background.type === 'gradient') {
    const [x0, y0, x1, y1] = gradientLine(s.background.angle, W, H);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, s.background.from);
    g.addColorStop(1, s.background.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const o = layout.object;
  const radius = s.radius * layout.scale;

  // Shadow: drawn by filling the object shape with a shadow, before clipping.
  if (s.shadow.enabled && s.shadow.opacity > 0) {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${s.shadow.opacity})`;
    ctx.shadowBlur = s.shadow.blur * k;
    ctx.shadowOffsetY = s.shadow.offsetY * k;
    ctx.fillStyle = s.frame === 'dark' ? '#1f2937' : '#ffffff';
    roundRect(ctx, o.x, o.y, o.w, o.h, radius);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRect(ctx, o.x, o.y, o.w, o.h, radius);
  ctx.clip();
  if (s.frame !== 'none') {
    const bar = layout.frameBar;
    ctx.fillStyle = s.frame === 'dark' ? '#1f2937' : '#f3f4f6';
    ctx.fillRect(o.x, o.y, o.w, bar + 1);
    const dot = bar * 0.22;
    const colors = ['#ef4444', '#f59e0b', '#22c55e'];
    colors.forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(o.x + bar * 0.6 + i * dot * 3, o.y + bar / 2, dot, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });
    const pillW = Math.min(o.w * 0.5, Math.max(o.w * 0.3, bar * 8));
    const pillH = bar * 0.56;
    const px = o.x + (o.w - pillW) / 2;
    const py = o.y + (bar - pillH) / 2;
    ctx.fillStyle = s.frame === 'dark' ? '#374151' : '#ffffff';
    roundRect(ctx, px, py, pillW, pillH, pillH / 2);
    ctx.fill();
    if (opts.domain) {
      ctx.fillStyle = s.frame === 'dark' ? '#d1d5db' : '#6b7280';
      ctx.font = `500 ${Math.round(pillH * 0.52)}px 'Inter Variable', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opts.domain.slice(0, 60), px + pillW / 2, py + pillH / 2, pillW - pillH);
    }
  }
  const im = layout.image;
  ctx.drawImage(image, im.x, im.y, im.w, im.h);
  ctx.restore();
  return canvas;
}
