import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { assemblePdf, deflate, layoutPages, pdfTextString, rgbaToFilteredRgb, type PdfImage } from '../../src/export/pdf';
import { crc32, createZip } from '../../src/export/zip';

async function flateImage(w: number, h: number, rgba: (x: number, y: number) => [number, number, number, number]): Promise<PdfImage> {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set(rgba(x, y), (y * w + x) * 4);
  return { width: w, height: h, data: await deflate(rgbaToFilteredRgb(px, w, h)), kind: 'flate-rgb' };
}

describe('PDF writer', () => {
  it('produces a structurally valid PDF that pdf-lib can parse', async () => {
    const img = await flateImage(40, 30, (x) => [x * 6, 100, 200, 255]);
    const bytes = assemblePdf(
      [
        { width: 400, height: 300, images: [{ image: img, x: 0, y: 0, w: 400, h: 300 }] },
        { width: 595.28, height: 841.89, images: [{ image: img, x: 24, y: 500, w: 200, h: 150 }] },
      ],
      'Frameora — test ✓',
    );
    const text = Buffer.from(bytes).toString('latin1');
    expect(text.startsWith('%PDF-1.7')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(1).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe('Frameora — test ✓');
    expect(doc.getProducer()).toBe('Frameora by Unique Labs');
  });

  it('has a correct cross-reference table', async () => {
    const img = await flateImage(2, 2, () => [0, 0, 0, 255]);
    const bytes = Buffer.from(assemblePdf([{ width: 10, height: 10, images: [{ image: img, x: 0, y: 0, w: 10, h: 10 }] }]));
    const text = bytes.toString('latin1');
    const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = [...text.slice(startxref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    entries.forEach((off, i) => expect(text.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it('encodes pixels losslessly (Up predictor round-trip, alpha on white)', async () => {
    const img = await flateImage(3, 2, (x, y) => (x === 2 ? [0, 0, 0, 0] : [10 * x, 20 * y, 30, 255]));
    const raw = zlib.inflateSync(Buffer.from(img.data));
    const rowLen = 3 * 3;
    const rows: number[][] = [];
    let prev = new Array(rowLen).fill(0);
    for (let y = 0; y < 2; y++) {
      expect(raw[y * (rowLen + 1)]).toBe(2);
      const row = [...raw.subarray(y * (rowLen + 1) + 1, (y + 1) * (rowLen + 1))].map((v, i) => (v + prev[i]) & 0xff);
      rows.push(row);
      prev = row;
    }
    expect(rows[0]).toEqual([0, 0, 30, 10, 0, 30, 255, 255, 255]);
    expect(rows[1]).toEqual([0, 20, 30, 10, 20, 30, 255, 255, 255]);
  });

  it('lays long images across A4 pages and caps single-page size', () => {
    const slices = layoutPages(1280, 7200, 'a4', 24, 1);
    const contentW = 595.28 - 48;
    const scale = contentW / 1280;
    expect(slices[0].drawW).toBeCloseTo(contentW);
    expect(slices.reduce((s, x) => s + x.h, 0)).toBe(7200);
    expect(slices.length).toBe(Math.ceil(7200 / Math.floor((841.89 - 48) / scale)));
    const single = layoutPages(2000, 40000, 'image', 0, 1);
    expect(single).toHaveLength(1);
    expect(single[0].pageHeight).toBeLessThanOrEqual(14400);
    // Small images are not enlarged.
    expect(layoutPages(300, 200, 'letter', 24, 1)[0].drawW).toBe(300);
    // 2x captures keep their physical size (half the pixels in points).
    expect(layoutPages(400, 200, 'letter', 24, 2)[0].drawW).toBe(200);
  });

  it('encodes text strings as UTF-16BE hex', () => {
    expect(pdfTextString('Hi')).toBe('<FEFF00480069>');
    expect(pdfTextString('😀')).toBe('<FEFFD83DDE00>');
  });
});

describe('ZIP writer', () => {
  it('computes standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('creates archives that standard tools can read', () => {
    const zip = createZip([
      { name: 'a.png', data: new Uint8Array([1, 2, 3]) },
      { name: 'folder/ünïcode (2).txt', data: new TextEncoder().encode('hello') },
    ]);
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'frameora-zip-')), 'test.zip');
    fs.writeFileSync(file, zip);
    const out = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("|".join(z.namelist())); print(z.read("folder/ünïcode (2).txt").decode())', file]).toString();
    expect(out).toContain('a.png|folder/ünïcode (2).txt');
    expect(out).toContain('hello');
  });
});
