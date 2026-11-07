import { describe, expect, it } from 'vitest';
import { canvasSizeFor, computeLayout, DEFAULT_COMPOSER, frameBarHeight, gradientLine, sanitizeComposer, type ComposerSettings } from '../../src/composer/layout';
import { drawAnnotation } from '../../src/editor/render/draw';
import type { AnnotationObject } from '../../src/editor/model/types';

const s = (patch: Partial<ComposerSettings>): ComposerSettings => ({ ...DEFAULT_COMPOSER, background: { ...DEFAULT_COMPOSER.background }, shadow: { ...DEFAULT_COMPOSER.shadow }, ...patch });

describe('composer layout', () => {
  it('auto preset wraps the screenshot in padding', () => {
    expect(canvasSizeFor(s({ preset: 'auto', padding: 50 }), 1000, 600)).toEqual({ width: 1100, height: 700 });
    const l = computeLayout(s({ preset: 'auto', padding: 50 }), 1000, 600);
    expect(l.image).toEqual({ x: 50, y: 50, w: 1000, h: 600 });
  });

  it('fixed presets and fit/fill scaling', () => {
    const fit = computeLayout(s({ preset: 'og', padding: 30, fit: 'fit' }), 1280, 800);
    expect(fit.canvas).toEqual({ width: 1200, height: 630 });
    expect(fit.image.h).toBeCloseTo(570);
    expect(fit.image.x + fit.image.w / 2).toBeCloseTo(600);
    const fill = computeLayout(s({ preset: 'og', padding: 0, fit: 'fill' }), 1280, 800);
    expect(fill.image.w).toBeCloseTo(1200);
    expect(fill.image.h).toBeGreaterThan(630);
  });

  it('ratio presets keep the requested aspect ratio and never exceed limits', () => {
    const c = canvasSizeFor(s({ preset: '16:9', padding: 40 }), 1280, 7200);
    expect(c.width / c.height).toBeCloseTo(16 / 9, 2);
    expect(Math.max(c.width, c.height)).toBeLessThanOrEqual(4096);
    expect(canvasSizeFor(s({ preset: '1:1', padding: 0 }), 500, 300)).toEqual({ width: 500, height: 500 });
  });

  it('aligns the screenshot and adds a window frame bar', () => {
    const l = computeLayout(s({ preset: 'custom', width: 1000, height: 1000, padding: 0, fit: 'custom', scale: 50, alignX: 'end', alignY: 'start', frame: 'light' }), 400, 400);
    const bar = frameBarHeight(400, 'light');
    expect(l.object).toEqual({ x: 800, y: 0, w: 200, h: (400 + bar) / 2 });
    expect(l.image.y).toBeCloseTo(bar / 2);
  });

  it('computes gradient lines and sanitizes stored settings', () => {
    const [x0, y0, x1, y1] = gradientLine(90, 100, 50); // to the right
    expect([Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)]).toEqual([0, 25, 100, 25]);
    const bad = sanitizeComposer({ preset: 'zzz', padding: -5, background: { type: 'x', color: 'red' }, shadow: { opacity: 9 } });
    expect(bad.preset).toBe('auto');
    expect(bad.padding).toBe(0);
    expect(bad.background.type).toBe('gradient');
    expect(bad.background.color).toBe(DEFAULT_COMPOSER.background.color);
    expect(bad.shadow.opacity).toBe(1);
  });
});

/** Minimal recording 2D context for rendering tests. */
function recorder() {
  const calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get(target: Record<string, unknown>, prop: string) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return (t: string) => ({ width: t.length * 10 });
        return (...args: unknown[]) => calls.push(`${prop}(${args.map((a) => (typeof a === 'number' ? Math.round(a) : typeof a)).join(',')})`);
      },
      set(target: Record<string, unknown>, prop: string, value: unknown) {
        target[prop] = value;
        calls.push(`${prop}=${typeof value === 'number' ? Math.round(value as number) : String(value)}`);
        return true;
      },
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('annotation rendering', () => {
  const objs: AnnotationObject[] = [
    { id: 'a', type: 'arrow', x1: 0, y1: 0, x2: 100, y2: 0, color: '#ff0000', width: 4, heads: 'both', opacity: 0.5 },
    { id: 'r', type: 'rect', x: 0, y: 0, w: 50, h: 40, stroke: '#00ff00', strokeWidth: 3, fill: '#0000ff', radius: 8, opacity: 1 },
    { id: 'e', type: 'ellipse', x: 0, y: 0, w: 50, h: 40, stroke: '#00ff00', strokeWidth: 3, fill: null, opacity: 1 },
    { id: 'l', type: 'line', x1: 0, y1: 0, x2: 10, y2: 10, color: '#000000', width: 2, dashed: true, opacity: 1 },
    { id: 'p', type: 'pen', points: [0, 0, 5, 5, 10, 0, 15, 5], color: '#000000', width: 3, opacity: 1 },
    { id: 'h', type: 'highlighter', points: [0, 0, 50, 0], color: '#facc15', width: 20, opacity: 1 },
    { id: 't', type: 'text', x: 10, y: 10, text: 'Hi\nthere', font: 'sans', size: 20, color: '#111111', bold: true, background: '#ffffff', outline: true, opacity: 1 },
    { id: 'm', type: 'marker', x: 20, y: 20, n: 3, size: 30, fill: '#ef4444', textColor: '#ffffff', opacity: 1 },
    { id: 's', type: 'symbol', x: 20, y: 20, size: 30, symbol: 'check', color: '#22c55e', opacity: 1 },
  ];

  it('draws every annotation type inside save/restore with its opacity', () => {
    for (const o of objs) {
      const { ctx, calls } = recorder();
      drawAnnotation(ctx, o);
      expect(calls[0]).toBe('save()');
      expect(calls[calls.length - 1]).toBe('restore()');
      expect(calls).toContain(`globalAlpha=${Math.round(o.opacity)}`);
    }
  });

  it('draws two arrowheads for double-headed arrows', () => {
    const { ctx, calls } = recorder();
    drawAnnotation(ctx, objs[0]);
    expect(calls.filter((c) => c === 'fill()')).toHaveLength(2);
  });

  it('uses multiply blending for highlights and dashes for dashed lines', () => {
    const h = recorder();
    drawAnnotation(h.ctx, objs[5]);
    expect(h.calls).toContain('globalCompositeOperation=multiply');
    const l = recorder();
    drawAnnotation(l.ctx, objs[3]);
    expect(l.calls.some((c) => c.startsWith('setLineDash('))).toBe(true);
  });

  it('renders multi-line text with background and outline', () => {
    const { ctx, calls } = recorder();
    drawAnnotation(ctx, objs[6]);
    expect(calls.filter((c) => c.startsWith('fillText('))).toHaveLength(2);
    expect(calls.filter((c) => c.startsWith('strokeText('))).toHaveLength(2);
    expect(calls).toContain('fillStyle=#ffffff');
  });

  it('renders numbered markers with their number', () => {
    const { ctx, calls } = recorder();
    drawAnnotation(ctx, objs[7]);
    expect(calls.some((c) => c.startsWith('arc('))).toBe(true);
    expect(calls.some((c) => c.startsWith('fillText(string'))).toBe(true);
  });
});
