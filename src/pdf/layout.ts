/**
 * Lays the pages of a PDF out as one tall image (or several, when a canvas
 * would be too big), the way a full-page screenshot of the PDF should look:
 * pages stacked top to bottom on a light grey backdrop, centred, with a gap.
 * Pure functions, so the layout is unit-tested.
 */

export interface PdfPageSize {
  /** Width and height in PDF points (1/72 inch), after the page's own rotation. */
  w: number;
  h: number;
}

export interface PlacedPage {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PdfPart {
  width: number;
  height: number;
  pages: PlacedPage[];
}

export interface PdfLayout {
  /** Pixels per PDF point. */
  scale: number;
  parts: PdfPart[];
  /** Pages left out (more than maxPages). */
  skipped: number;
}

export interface PdfLayoutOptions {
  /** Pixels per point to aim for (2 ≈ 144 dpi, sharp on high-resolution screens). */
  targetScale?: number;
  /** The widest page is never rendered wider than this. */
  maxWidth?: number;
  /** Canvas limits: longest side and total pixels. */
  maxDimension: number;
  maxPixels: number;
  /** 'split' makes several images at page boundaries; 'scale' shrinks everything to fit one image. */
  oversize: 'split' | 'scale';
  /** Gap between pages and around them, in pixels at scale 1 (multiplied by the scale). */
  gap?: number;
  maxPages?: number;
}

export const PDF_BACKDROP = '#e9eaee';
export const MIN_PDF_SCALE = 0.75;

export function planPdfLayout(sizes: PdfPageSize[], opts: PdfLayoutOptions): PdfLayout {
  const maxPages = opts.maxPages ?? 300;
  const pages = sizes.slice(0, maxPages);
  const skipped = Math.max(0, sizes.length - pages.length);
  if (!pages.length) return { scale: 1, parts: [], skipped };
  const widest = Math.max(...pages.map((p) => p.w));
  let scale = Math.min(opts.targetScale ?? 2, (opts.maxWidth ?? 2400) / widest);
  const gapAt = (s: number) => Math.round((opts.gap ?? 12) * s);
  const widthAt = (s: number) => Math.ceil(widest * s) + 2 * gapAt(s);
  const partLimit = (s: number) => Math.max(1, Math.min(opts.maxDimension, Math.floor(opts.maxPixels / widthAt(s))));
  const totalAt = (s: number) => pages.reduce((n, p) => n + Math.ceil(p.h * s) + gapAt(s), gapAt(s));

  if (opts.oversize === 'scale' && totalAt(scale) > partLimit(scale)) {
    // Shrink until everything fits in one image, but never below a readable size.
    let lo = MIN_PDF_SCALE / 4;
    let hi = scale;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (totalAt(mid) <= partLimit(mid)) lo = mid;
      else hi = mid;
    }
    scale = Math.max(Math.min(scale, lo), Math.min(scale, MIN_PDF_SCALE));
  }
  // A single page taller than the limit is shrunk so it still fits one image.
  const tallest = Math.max(...pages.map((p) => p.h));
  while (Math.ceil(tallest * scale) + 2 * gapAt(scale) > partLimit(scale) && scale > 0.05) scale *= 0.9;

  const gap = gapAt(scale);
  const width = widthAt(scale);
  const limit = partLimit(scale);
  const parts: PdfPart[] = [];
  let current: PdfPart = { width, height: gap, pages: [] };
  pages.forEach((p, index) => {
    const w = Math.ceil(p.w * scale);
    const h = Math.ceil(p.h * scale);
    if (current.pages.length && current.height + h + gap > limit) {
      parts.push(current);
      current = { width, height: gap, pages: [] };
    }
    current.pages.push({ index, x: Math.round((width - w) / 2), y: current.height, w, h });
    current.height += h + gap;
  });
  parts.push(current);
  return { scale, parts, skipped };
}
