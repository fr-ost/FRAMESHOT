import { describe, expect, it } from 'vitest';
import { planPdfLayout } from '../../src/pdf/layout';

const letter = { w: 612, h: 792 };
const limits = { maxDimension: 32767, maxPixels: 100_000_000 };

describe('PDF page layout', () => {
  it('stacks pages at 2× with gaps, centred, in one image when it fits', () => {
    const l = planPdfLayout([letter, letter, letter], { ...limits, oversize: 'split' });
    expect(l.scale).toBe(2);
    expect(l.parts).toHaveLength(1);
    const [part] = l.parts;
    expect(part.width).toBe(1224 + 2 * 24);
    expect(part.pages.map((p) => p.y)).toEqual([24, 24 + 1584 + 24, 24 + 2 * (1584 + 24)]);
    expect(part.height).toBe(24 + 3 * (1584 + 24));
    expect(part.pages.every((p) => p.x === 24 && p.w === 1224 && p.h === 1584)).toBe(true);
  });

  it('splits long documents at page boundaries within the canvas limits', () => {
    const l = planPdfLayout(Array(60).fill(letter), { ...limits, oversize: 'split' });
    expect(l.parts.length).toBeGreaterThan(1);
    for (const part of l.parts) {
      expect(part.height).toBeLessThanOrEqual(32767);
      expect(part.width * part.height).toBeLessThanOrEqual(100_000_000);
    }
    expect(l.parts.reduce((n, p) => n + p.pages.length, 0)).toBe(60);
  });

  it('shrinks to one image in "scale" mode, but not below a readable size', () => {
    const l = planPdfLayout(Array(30).fill(letter), { ...limits, oversize: 'scale' });
    expect(l.parts).toHaveLength(1);
    expect(l.scale).toBeLessThan(2);
    expect(l.parts[0].height).toBeLessThanOrEqual(32767);
    const huge = planPdfLayout(Array(200).fill(letter), { ...limits, oversize: 'scale' });
    expect(huge.scale).toBeGreaterThanOrEqual(0.75);
    expect(huge.parts.length).toBeGreaterThan(1);
  });

  it('centres narrow pages, caps very wide ones and counts skipped pages', () => {
    const l = planPdfLayout([letter, { w: 306, h: 396 }], { ...limits, oversize: 'split' });
    expect(l.parts[0].pages[1].x).toBe(Math.round((l.parts[0].width - 612) / 2));
    const poster = planPdfLayout([{ w: 2400, h: 1700 }], { ...limits, oversize: 'split' });
    expect(poster.parts[0].pages[0].w).toBeLessThanOrEqual(2400);
    expect(planPdfLayout(Array(5).fill(letter), { ...limits, oversize: 'split', maxPages: 3 }).skipped).toBe(2);
  });
});
