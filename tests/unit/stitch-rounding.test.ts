/**
 * Realistic sub-pixel simulation of Chrome at fractional device scales
 * (Windows 125%/150%/175% display scaling, page zoom 110%/90%, …).
 *
 * Chrome reports integer CSS sizes (clientHeight, scrollHeight) that are
 * rounded from fractional layout values, snaps scroll offsets to device
 * pixels, and captures frames at the physical viewport size. These
 * independent roundings must never make a full-page capture fail.
 */
import { describe, expect, it } from 'vitest';
import { frameScale, overlapFor, planScrollSteps, retryScrollTarget, StitchPlanner } from '../../src/core/capture-plan';
import type { Rect } from '../../src/core/types';

type Round = (n: number) => number;
const ROUNDINGS: Record<string, Round> = { round: Math.round, floor: Math.floor, ceil: Math.ceil };

interface Browser {
  dpr: number;
  physW: number;
  physH: number;
  /** True (fractional) document height in CSS px. */
  contentH: number;
  /**
   * How the agent reports the visible height: 'exact' models Frameora's agent
   * (visualViewport, float32 like Chrome); a rounding function models the
   * fallback to the integer clientHeight.
   */
  viewReport: 'exact' | Round;
  scrollHeightRound: Round;
  snapRound: Round;
}

/** Simulates a full-page capture exactly like the orchestrator does. */
function captureFullPage(b: Browser) {
  const trueViewH = b.physH / b.dpr;
  const clientW = Math.round(b.physW / b.dpr);
  const clientH = b.viewReport === 'exact' ? Math.fround(trueViewH) : b.viewReport(trueViewH);
  const scrollHeight = Math.max(clientH, b.scrollHeightRound(b.contentH));
  // Max scroll offset the browser allows, snapped to device pixels.
  const trueMax = Math.max(0, Math.floor((b.contentH - trueViewH) * b.dpr + 1e-9) / b.dpr);
  const plannedMax = Math.max(0, scrollHeight - clientH);
  // The content agent: requests at (or past) the planned end scroll "as far as
  // the browser allows", which reaches the true fractional maximum.
  const scrollTo = (y: number) => {
    const target = y >= plannedMax - 1 ? Number.MAX_SAFE_INTEGER : y;
    return Math.min(trueMax, Math.max(0, b.snapRound(target * b.dpr) / b.dpr));
  };
  const image = { width: b.physW, height: b.physH };
  const innerWidth = Math.round(b.physW / b.dpr);
  const scale = b.physW / innerWidth;
  const region: Rect = { x: 0, y: 0, w: clientW, h: scrollHeight };
  const view = { w: clientW, h: clientH };
  const planner = new StitchPlanner(region, scale);
  const ov = overlapFor(scale);
  const steps = planScrollSteps(region, view, { x: 0, y: plannedMax }, { x: ov, y: ov });
  const frameAt = (y: number) => {
    const sy = scrollTo(y);
    return { content: { x: 0, y: sy, w: clientW, h: clientH }, viewport: { x: 0, y: 0, w: clientW, h: clientH } };
  };
  for (const s of steps) planner.addFrame({ row: s.row, col: s.col, ...frameAt(s.y), isLastRow: s.row === s.rows - 1 }, image);
  for (let round = 0; round < 2 && planner.gaps().length; round++) {
    for (const gap of planner.gaps()) {
      const t = retryScrollTarget(gap, view);
      planner.addGapFill({ row: 0, col: 0, ...frameAt(t.y) }, image);
    }
  }
  return { planner, scrollHeight };
}

describe('full-page stitching under real browser rounding', () => {
  const dprs = [1, 1.1, 1.25, 4 / 3, 1.5, 1.75, 2, 2.2, 2.5, 3];
  const heights = [797, 1013, 1080, 1333];
  const contents = [5000, 5000.4, 4999.6, 7203.33, 2160.5];
  const scenarios = (viewReports: Browser['viewReport'][], scrollHeightRounds: string[]) => {
    const cases: Browser[] = [];
    for (const dpr of dprs)
      for (const physH of heights)
        for (const contentH of contents)
          for (const viewReport of viewReports)
            for (const sr of scrollHeightRounds)
              for (const snap of ['round', 'floor'])
                cases.push({ dpr, physW: 1919, physH, contentH, viewReport, scrollHeightRound: ROUNDINGS[sr], snapRound: ROUNDINGS[snap] });
    return cases;
  };
  const failuresOf = (cases: Browser[]) => {
    const failures: string[] = [];
    for (const b of cases) {
      const gaps = captureFullPage(b).planner.gaps();
      if (gaps.length) failures.push(`dpr=${b.dpr.toFixed(3)} physH=${b.physH} content=${b.contentH} gaps=${JSON.stringify(gaps.map((g) => [+g.y.toFixed(2), +g.h.toFixed(2)]))}`);
    }
    return failures;
  };

  it('never reports missing pixels when the true viewport size is known (Frameora agent)', () => {
    const cases = scenarios(['exact'], ['round', 'ceil', 'floor']);
    expect(cases.length).toBe(1200);
    const failures = failuresOf(cases);
    expect(failures.slice(0, 10), `${failures.length} failing scenarios`).toEqual([]);
  });

  it('also copes with Chrome’s integer clientHeight when visualViewport is unavailable', () => {
    // Observed Chrome behavior: clientHeight rounds down, scrollHeight rounds.
    const failures = failuresOf(scenarios([Math.floor, Math.round], ['round']));
    expect(failures.slice(0, 10), `${failures.length} failing scenarios`).toEqual([]);
  });

  it('still refuses to stitch over real missing content', () => {
    const region: Rect = { x: 0, y: 0, w: 100, h: 3000 };
    const p = new StitchPlanner(region, 1.25);
    const img = { width: 125, height: 1000 };
    p.addFrame({ row: 0, col: 0, content: { x: 0, y: 0, w: 100, h: 800 }, viewport: { x: 0, y: 0, w: 100, h: 800 } }, img);
    // The page jumped 40 CSS px further than the overlap allows: a real hole.
    p.addFrame({ row: 1, col: 0, content: { x: 0, y: 840, w: 100, h: 800 }, viewport: { x: 0, y: 0, w: 100, h: 800 } }, img);
    p.addFrame({ row: 2, col: 0, content: { x: 0, y: 1640, w: 100, h: 800 }, viewport: { x: 0, y: 0, w: 100, h: 800 } }, img);
    p.addFrame({ row: 3, col: 0, content: { x: 0, y: 2200, w: 100, h: 800 }, viewport: { x: 0, y: 0, w: 100, h: 800 }, isLastRow: true }, img);
    const gaps = p.gaps();
    expect(gaps).toHaveLength(1);
    expect(gaps[0].y).toBeCloseTo(800, 0);
    expect(gaps[0].h).toBeCloseTo(40, 0);
  });

  it('aims retries so the gap lands well inside the viewport', () => {
    expect(retryScrollTarget({ x: 0, y: 2000, w: 100, h: 1 }, { w: 1000, h: 900 })).toEqual({ x: 0, y: 1700 });
    expect(retryScrollTarget({ x: 50, y: 10, w: 1, h: 1 }, { w: 900, h: 900 })).toEqual({ x: 0, y: 0 });
  });

  it('uses the exact device pixel ratio when it agrees with the captured frame', () => {
    expect(frameScale(2244, 1282, 1.75)).toBe(1.75); // measured 1.7504
    expect(frameScale(1920, 1280, 1.5)).toBe(1.5);
    // Emulated metrics (DPR 2, frames captured at 1x): trust the pixels.
    expect(frameScale(1280, 1280, 2)).toBe(1);
    expect(frameScale(1280, 0, 2)).toBe(1);
  });

  it('fills only rounding slivers and leaves larger gaps for the completeness check', () => {
    const p = new StitchPlanner({ x: 0, y: 0, w: 100, h: 1000 }, 1.5);
    expect(p.sliver).toBe(3);
    const img = { width: 150, height: 1076 };
    // Two frames whose rounding leaves a 1px sliver between them and at the end.
    p.addFrame({ row: 0, col: 0, content: { x: 0, y: 0, w: 100, h: 500 }, viewport: { x: 0, y: 0, w: 100, h: 500 } }, img);
    const op = p.addFrame({ row: 1, col: 0, content: { x: 0, y: 500.6667, w: 100, h: 498.9 }, viewport: { x: 0, y: 0, w: 100, h: 498.9 }, isLastRow: true }, img);
    expect(op?.extra?.length).toBe(2); // above and below
    expect(p.gaps()).toEqual([]);
  });
});

