import { describe, expect, it } from 'vitest';
import { fitScale, overlapFor, planScrollSteps, planSegments, segmentHeightLimit, StitchPlanner } from '../../src/core/capture-plan';
import { uncovered } from '../../src/core/geometry';

describe('planScrollSteps', () => {
  it('returns a single step when the region fits', () => {
    const steps = planScrollSteps({ x: 0, y: 0, w: 800, h: 600 }, { w: 1280, h: 800 }, { x: 0, y: 0 });
    expect(steps).toEqual([{ row: 0, col: 0, rows: 1, cols: 1, x: 0, y: 0 }]);
  });

  it('covers a tall page with viewport-sized steps and aligns the last step to the end', () => {
    const steps = planScrollSteps({ x: 0, y: 0, w: 1280, h: 7200 }, { w: 1280, h: 800 }, { x: 0, y: 6400 });
    expect(steps.map((s) => s.y)).toEqual([0, 800, 1600, 2400, 3200, 4000, 4800, 5600, 6400]);
    expect(steps.every((s) => s.rows === 9 && s.cols === 1)).toBe(true);
  });

  it('aligns a non-multiple page height so the last frame ends exactly at the bottom', () => {
    const steps = planScrollSteps({ x: 0, y: 0, w: 1280, h: 2000 }, { w: 1280, h: 800 }, { x: 0, y: 1200 });
    expect(steps.map((s) => s.y)).toEqual([0, 800, 1200]);
  });

  it('plans a 2D grid for horizontal overflow', () => {
    const steps = planScrollSteps({ x: 0, y: 0, w: 2600, h: 1800 }, { w: 1280, h: 800 }, { x: 1320, y: 1000 });
    expect(steps.length).toBe(9); // 3 cols × 3 rows
    expect(new Set(steps.map((s) => s.x))).toEqual(new Set([0, 1280, 1320]));
  });

  it('applies overlap for fractional scales', () => {
    expect(overlapFor(2)).toBe(0);
    expect(overlapFor(1.25)).toBe(2);
    const steps = planScrollSteps({ x: 0, y: 0, w: 100, h: 2000 }, { w: 100, h: 800 }, { x: 0, y: 1200 }, { x: 0, y: 2 });
    expect(steps.map((s) => s.y)).toEqual([0, 798, 1200]);
  });

  it('starts steps at the region origin for regions in the middle of a page', () => {
    const steps = planScrollSteps({ x: 0, y: 1000, w: 300, h: 1200 }, { w: 1280, h: 800 }, { x: 0, y: 5000 });
    expect(steps.map((s) => s.y)).toEqual([1000, 1400]);
  });
});

/** Simulates captured frames for a scroll plan and runs them through the planner. */
function simulate(regionH: number, viewH: number, scale: number, opts: { clampMax?: number } = {}) {
  const region = { x: 0, y: 0, w: 1000, h: regionH };
  const maxY = opts.clampMax ?? regionH - viewH;
  const steps = planScrollSteps(region, { w: 1000, h: viewH }, { x: 0, y: maxY }, { x: 0, y: overlapFor(scale) });
  const planner = new StitchPlanner(region, scale);
  const ops = steps.map((s) => {
    const y = Math.min(s.y, maxY);
    return planner.addFrame(
      { row: s.row, col: s.col, content: { x: 0, y, w: 1000, h: viewH }, viewport: { x: 0, y: 0, w: 1000, h: viewH }, isLastRow: s.row === s.rows - 1 },
      { width: Math.round(1000 * scale), height: Math.round(viewH * scale) },
    );
  });
  return { planner, ops: ops.filter((o): o is NonNullable<typeof o> => !!o) };
}

describe('StitchPlanner', () => {
  it.each([1, 2, 1.25, 1.5, 3])('produces seamless, non-overlapping destination rows at scale %s', (scale) => {
    const { planner, ops } = simulate(5432, 777, scale);
    expect(planner.gaps()).toEqual([]);
    const sorted = [...ops].sort((a, b) => a.dest.y - b.dest.y);
    expect(sorted[0].dest.y).toBe(0);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].dest.y).toBe(sorted[i - 1].dest.y + sorted[i - 1].dest.h);
    const last = sorted[sorted.length - 1];
    expect(last.dest.y + last.dest.h).toBe(planner.outputHeight);
    expect(planner.outputHeight).toBe(Math.round(5432 * scale));
    // Same scale: source and destination sizes always match (no resampling).
    for (const op of ops) {
      expect(op.src.h).toBe(op.dest.h);
      expect(op.src.w).toBe(op.dest.w);
    }
  });

  it('crops source rects to the new part of a clamped last frame', () => {
    const { ops } = simulate(2000, 800, 1);
    expect(ops.map((o) => [o.src.y, o.src.h, o.dest.y])).toEqual([
      [0, 800, 0],
      [0, 800, 800],
      [400, 400, 1600], // last frame scrolled to 1200; only rows 1600–2000 are new
    ]);
  });

  it('re-paints the strip under a bottom-anchored fixed footer in the last row', () => {
    const region = { x: 0, y: 0, w: 100, h: 2000 };
    const p = new StitchPlanner(region, 1);
    const img = { width: 100, height: 800 };
    p.addFrame({ row: 0, col: 0, content: { x: 0, y: 0, w: 100, h: 800 }, viewport: { x: 0, y: 0, w: 100, h: 800 } }, img);
    p.addFrame({ row: 1, col: 0, content: { x: 0, y: 800, w: 100, h: 800 }, viewport: { x: 0, y: 0, w: 100, h: 800 } }, img);
    const op = p.addFrame(
      { row: 2, col: 0, content: { x: 0, y: 1200, w: 100, h: 800 }, viewport: { x: 0, y: 0, w: 100, h: 800 }, isLastRow: true, bottomFixedHeight: 500 },
      img,
    );
    // Footer is 500px tall but only 400px are new; the strip starts at 2000-500.
    expect(op!.dest.y).toBe(1500);
    expect(op!.src.y).toBe(300);
  });

  it('maps element-scroller frames using the viewport offset', () => {
    const p = new StitchPlanner({ x: 0, y: 0, w: 600, h: 1000 }, 2);
    const op = p.addFrame(
      { row: 0, col: 0, content: { x: 0, y: 300, w: 600, h: 400 }, viewport: { x: 22, y: 142, w: 600, h: 400 } },
      { width: 2560, height: 1600 },
    );
    expect(op).toEqual({ src: { x: 44, y: 284, w: 1200, h: 800 }, dest: { x: 0, y: 600, w: 1200, h: 800 }, content: { x: 0, y: 300, w: 600, h: 400 } });
  });

  it('detects gaps when the page scrolled less than requested, and fills them on retry', () => {
    const region = { x: 0, y: 0, w: 100, h: 1600 };
    const p = new StitchPlanner(region, 1);
    const img = { width: 100, height: 600 };
    p.addFrame({ row: 0, col: 0, content: { x: 0, y: 0, w: 100, h: 600 }, viewport: { x: 0, y: 0, w: 100, h: 600 } }, img);
    // Page jumped further than asked (e.g. scroll snapping): rows 600–700 missing.
    p.addFrame({ row: 1, col: 0, content: { x: 0, y: 700, w: 100, h: 600 }, viewport: { x: 0, y: 0, w: 100, h: 600 } }, img);
    p.addFrame({ row: 2, col: 0, content: { x: 0, y: 1000, w: 100, h: 600 }, viewport: { x: 0, y: 0, w: 100, h: 600 } }, img);
    expect(p.gaps()).toEqual([{ x: 0, y: 600, w: 100, h: 100 }]);
    expect(p.contiguousHeight()).toBe(600);
    const fills = p.addGapFill({ row: 0, col: 0, content: { x: 0, y: 500, w: 100, h: 600 }, viewport: { x: 0, y: 0, w: 100, h: 600 } }, img);
    expect(fills).toHaveLength(1);
    expect(fills[0].dest).toEqual({ x: 0, y: 600, w: 100, h: 100 });
    expect(fills[0].src.y).toBe(100);
    expect(p.gaps()).toEqual([]);
  });

  it('supports scaled output (outputScale < captureScale)', () => {
    const p = new StitchPlanner({ x: 0, y: 0, w: 1000, h: 1000 }, 2, 1);
    const op = p.addFrame({ row: 0, col: 0, content: { x: 0, y: 0, w: 1000, h: 500 }, viewport: { x: 0, y: 0, w: 1000, h: 500 } }, { width: 2000, height: 1000 });
    expect(op!.src).toEqual({ x: 0, y: 0, w: 2000, h: 1000 });
    expect(op!.dest).toEqual({ x: 0, y: 0, w: 1000, h: 500 });
    expect(p.outputWidth).toBe(1000);
  });
});

describe('segments and limits', () => {
  it('splits tall output into balanced segments within the limits', () => {
    const segs = planSegments(1280, 100000, { maxDimension: 32767, maxPixels: 100_000_000 });
    expect(segs.length).toBe(4);
    expect(segs.reduce((s, x) => s + x.height, 0)).toBe(100000);
    for (const s of segs) expect(s.height).toBeLessThanOrEqual(32767);
  });

  it('respects the pixel budget for wide images', () => {
    expect(segmentHeightLimit(5000, { maxDimension: 32767, maxPixels: 100_000_000 })).toBe(20000);
  });

  it('computes a fit scale that keeps one image inside the limits', () => {
    const s = fitScale(1280, 100000, { maxDimension: 32767, maxPixels: 100_000_000 });
    expect(1280 * s * 100000 * s).toBeLessThanOrEqual(100_000_000);
    expect(100000 * s).toBeLessThanOrEqual(32767);
    expect(fitScale(800, 600)).toBe(1);
  });
});

describe('uncovered', () => {
  it('finds gaps in a union of rectangles', () => {
    const gaps = uncovered({ x: 0, y: 0, w: 10, h: 10 }, [
      { x: 0, y: 0, w: 10, h: 4 },
      { x: 0, y: 6, w: 5, h: 4 },
    ]);
    expect(gaps).toEqual([
      { x: 0, y: 4, w: 10, h: 2 },
      { x: 5, y: 6, w: 5, h: 4 },
    ]);
  });
});
