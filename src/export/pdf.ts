/**
 * Minimal, dependency-free PDF writer for image documents.
 *
 * Images are embedded either losslessly (RGB, PNG "Up" predictor + Flate —
 * crisp text, no compression artifacts) or as JPEG (smaller files). Long
 * screenshots are sliced across pages; each slice is its own image object so
 * memory use stays bounded.
 */
import type { PdfPageSize } from '../core/settings';

export class PdfWriter {
  private chunks: Uint8Array[] = [];
  private offsets: number[] = [];
  private length = 0;
  private reserved = 0;

  constructor() {
    this.write('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
  }

  private write(data: string | Uint8Array): void {
    const bytes = typeof data === 'string' ? latin1(data) : data;
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  /** Reserves an object number to be written later. */
  reserve(): number {
    this.reserved = Math.max(this.reserved, this.offsets.length);
    this.offsets.push(-1);
    return this.offsets.length;
  }

  /** Writes object `num` (reserved earlier) with a dictionary and optional stream. */
  writeObject(num: number, dict: string, stream?: Uint8Array): void {
    this.offsets[num - 1] = this.length;
    if (stream) {
      this.write(`${num} 0 obj\n${dict.replace(/>>\s*$/, '')} /Length ${stream.length} >>\nstream\n`);
      this.write(stream);
      this.write('\nendstream\nendobj\n');
    } else {
      this.write(`${num} 0 obj\n${dict}\nendobj\n`);
    }
  }

  addObject(dict: string, stream?: Uint8Array): number {
    const num = this.reserve();
    this.writeObject(num, dict, stream);
    return num;
  }

  finish(rootNum: number, infoNum?: number): Uint8Array {
    const xrefOffset = this.length;
    const count = this.offsets.length + 1;
    let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (const off of this.offsets) {
      if (off < 0) throw new Error('PDF object reserved but never written');
      xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    }
    this.write(xref);
    this.write(`trailer\n<< /Size ${count} /Root ${rootNum} 0 R${infoNum ? ` /Info ${infoNum} 0 R` : ''} >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
    const out = new Uint8Array(this.length);
    let pos = 0;
    for (const c of this.chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  }
}

function latin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** PDF text string as UTF-16BE hex (safe for any characters). */
export function pdfTextString(s: string): string {
  let hex = 'FEFF';
  for (const ch of s.slice(0, 200)) {
    const code = ch.codePointAt(0)!;
    if (code > 0xffff) {
      const v = code - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
    } else hex += code.toString(16).padStart(4, '0');
  }
  return `<${hex.toUpperCase()}>`;
}

export function pdfDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `(D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z)`;
}

export async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** RGBA → RGB rows with a PNG "Up" filter byte per row (alpha composited on white). */
export function rgbaToFilteredRgb(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const rowLen = width * 3;
  const out = new Uint8Array((rowLen + 1) * height);
  const prev = new Uint8Array(rowLen);
  const cur = new Uint8Array(rowLen);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = rgba[i + 3] / 255;
      const j = x * 3;
      cur[j] = Math.round(rgba[i] * a + 255 * (1 - a));
      cur[j + 1] = Math.round(rgba[i + 1] * a + 255 * (1 - a));
      cur[j + 2] = Math.round(rgba[i + 2] * a + 255 * (1 - a));
    }
    const base = y * (rowLen + 1);
    out[base] = 2; // Up
    for (let k = 0; k < rowLen; k++) out[base + 1 + k] = (cur[k] - prev[k]) & 0xff;
    prev.set(cur);
  }
  return out;
}

export interface PdfImage {
  width: number;
  height: number;
  /** Already-encoded stream bytes. */
  data: Uint8Array;
  kind: 'flate-rgb' | 'jpeg';
}

export function imageDict(img: PdfImage): string {
  const common = `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8`;
  if (img.kind === 'jpeg') return `${common} /Filter /DCTDecode >>`;
  return `${common} /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${img.width} >> >>`;
}

export interface PlacedImage {
  image: PdfImage;
  /** Placement in PDF points, origin at the page's bottom-left. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PdfPageSpec {
  width: number;
  height: number;
  images: PlacedImage[];
}

/** Assembles a complete PDF from page specs (pure; unit tested). */
export function assemblePdf(pages: PdfPageSpec[], title?: string): Uint8Array {
  const w = new PdfWriter();
  const catalog = w.reserve();
  const pagesNum = w.reserve();
  const info = w.addObject(`<< /Producer ${pdfTextString('Frameora by Unique Labs')} /Creator ${pdfTextString('Frameora')}${title ? ` /Title ${pdfTextString(title)}` : ''} /CreationDate ${pdfDate()} >>`);
  const kids: number[] = [];
  for (const page of pages) {
    const xobjs: string[] = [];
    let content = '';
    page.images.forEach((pi, i) => {
      const num = w.addObject(imageDict(pi.image), pi.image.data);
      xobjs.push(`/Im${i} ${num} 0 R`);
      content += `q ${fmt(pi.w)} 0 0 ${fmt(pi.h)} ${fmt(pi.x)} ${fmt(pi.y)} cm /Im${i} Do Q\n`;
    });
    const contentNum = w.addObject('<< >>', latin1(content));
    kids.push(
      w.addObject(
        `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${fmt(page.width)} ${fmt(page.height)}] /Resources << /XObject << ${xobjs.join(' ')} >> >> /Contents ${contentNum} 0 R >>`,
      ),
    );
  }
  w.writeObject(pagesNum, `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`);
  w.writeObject(catalog, `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);
  return w.finish(catalog, info);
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

// ── Page layout ──

export const PAGE_SIZES: Record<Exclude<PdfPageSize, 'image'>, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

/** Largest page dimension most PDF viewers accept (Acrobat limit). */
export const MAX_PAGE_PT = 14400;

export interface SliceLayout {
  /** Source rows [y, y+h) of the image for this page. */
  y: number;
  h: number;
  pageWidth: number;
  pageHeight: number;
  /** Placement on the page in points (origin bottom-left). */
  x: number;
  drawY: number;
  drawW: number;
  drawH: number;
}

/**
 * Lays out an image across pages. "image" mode creates a single page sized to
 * the image (at 72 dpi for 1x captures, scaled down past the viewer limit);
 * paper sizes fit the width and slice the height across pages.
 */
export function layoutPages(imgW: number, imgH: number, size: PdfPageSize, marginPt: number, pxPerPt = 1): SliceLayout[] {
  if (size === 'image') {
    let pw = imgW / pxPerPt;
    let ph = imgH / pxPerPt;
    const k = Math.min(1, MAX_PAGE_PT / pw, MAX_PAGE_PT / ph);
    pw *= k;
    ph *= k;
    return [{ y: 0, h: imgH, pageWidth: pw, pageHeight: ph, x: 0, drawY: 0, drawW: pw, drawH: ph }];
  }
  const page = PAGE_SIZES[size];
  const m = Math.max(0, Math.min(marginPt, page.width / 4));
  const contentW = page.width - m * 2;
  const contentH = page.height - m * 2;
  // Fit the page width, but never enlarge beyond the image's natural size.
  const scale = Math.min(contentW / imgW, 1 / pxPerPt);
  const drawW = imgW * scale;
  const sliceH = Math.max(1, Math.floor(contentH / scale));
  const out: SliceLayout[] = [];
  for (let y = 0; y < imgH; y += sliceH) {
    const h = Math.min(sliceH, imgH - y);
    const drawH = h * scale;
    out.push({ y, h, pageWidth: page.width, pageHeight: page.height, x: m + (contentW - drawW) / 2, drawY: page.height - m - drawH, drawW, drawH });
  }
  return out;
}

// ── Canvas → PDF ──

export interface PdfExportOptions {
  pageSize: PdfPageSize;
  marginPt: number;
  /** Device pixels per CSS pixel of the capture (keeps physical size sensible). */
  pxPerPt?: number;
  compact?: boolean;
  jpegQuality?: number;
  title?: string;
}

const STRIP = 2048;

async function encodeRegion(canvas: OffscreenCanvas, y: number, h: number, compact: boolean, quality: number): Promise<PdfImage> {
  const w = canvas.width;
  const strip = new OffscreenCanvas(w, h);
  const sctx = strip.getContext('2d', { willReadFrequently: !compact });
  if (!sctx) throw new Error('Could not allocate memory for PDF export.');
  if (compact) {
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, w, h);
    sctx.drawImage(canvas, 0, y, w, h, 0, 0, w, h);
    const blob = await strip.convertToBlob({ type: 'image/jpeg', quality });
    return { width: w, height: h, data: new Uint8Array(await blob.arrayBuffer()), kind: 'jpeg' };
  }
  sctx.drawImage(canvas, 0, y, w, h, 0, 0, w, h);
  const rgba = sctx.getImageData(0, 0, w, h).data;
  return { width: w, height: h, data: await deflate(rgbaToFilteredRgb(rgba, w, h)), kind: 'flate-rgb' };
}

/** Builds the pages for one image (each page may hold several strips). */
export async function pagesForCanvas(canvas: OffscreenCanvas, opts: PdfExportOptions): Promise<PdfPageSpec[]> {
  const layout = layoutPages(canvas.width, canvas.height, opts.pageSize, opts.marginPt, opts.pxPerPt ?? 1);
  const pages: PdfPageSpec[] = [];
  for (const slice of layout) {
    const images: PlacedImage[] = [];
    const k = slice.drawH / slice.h; // points per source row
    for (let y = slice.y; y < slice.y + slice.h; y += STRIP) {
      const h = Math.min(STRIP, slice.y + slice.h - y);
      const img = await encodeRegion(canvas, y, h, !!opts.compact, opts.jpegQuality ?? 0.9);
      // Top of this strip measured from the slice top, flipped to PDF space.
      const topOffset = (y - slice.y) * k;
      images.push({ image: img, x: slice.x, y: slice.drawY + slice.drawH - topOffset - h * k, w: slice.drawW, h: h * k });
    }
    pages.push({ width: slice.pageWidth, height: slice.pageHeight, images });
  }
  return pages;
}

export async function canvasesToPdf(canvases: { canvas: OffscreenCanvas; pxPerPt?: number }[], opts: PdfExportOptions): Promise<Blob> {
  const pages: PdfPageSpec[] = [];
  for (const c of canvases) pages.push(...(await pagesForCanvas(c.canvas, { ...opts, pxPerPt: c.pxPerPt ?? opts.pxPerPt })));
  const bytes = assemblePdf(pages, opts.title);
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}
