/** Helpers for driving the editor and inspecting exported files. */
import fs from 'node:fs';
import zlib from 'node:zlib';
import type { Page } from '@playwright/test';
import type { ExtFixture } from './harness';

export async function openEditor(ext: ExtFixture, itemId: string): Promise<Page> {
  const page = await ext.context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/edit/${encodeURIComponent(itemId)}`);
  await page.waitForSelector('[data-testid=editor-canvas]');
  await page.waitForFunction(() => !!(window as unknown as { __frameshotEditor?: unknown }).__frameshotEditor);
  await page.waitForTimeout(200);
  return page;
}

export interface EditorSnapshot {
  objects: { type: string; id: string }[];
  output: { width: number; height: number };
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  tool: string;
  revision: number;
}

export function editorState(page: Page): Promise<EditorSnapshot> {
  return page.evaluate(() => {
    const s = (window as unknown as { __frameshotEditor: { getState(): any } }).__frameshotEditor.getState();
    return {
      objects: s.doc.objects.map((o: { type: string; id: string }) => ({ type: o.type, id: o.id })),
      output: s.doc.output,
      zoom: s.view.zoom,
      canUndo: s.canUndo,
      canRedo: s.canRedo,
      tool: s.tool,
      revision: s.revision,
    };
  });
}

/** Converts document coordinates to page (screen) coordinates. */
export function toScreen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([dx, dy]) => {
      const s = (window as unknown as { __frameshotEditor: { getState(): any } }).__frameshotEditor.getState();
      const r = document.querySelector('[data-testid=editor-canvas]')!.getBoundingClientRect();
      return { x: r.left + dx * s.view.zoom + s.view.panX, y: r.top + dy * s.view.zoom + s.view.panY };
    },
    [x, y] as const,
  );
}

export async function dragDoc(page: Page, points: [number, number][]): Promise<void> {
  const first = await toScreen(page, ...points[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const p of points.slice(1)) {
    const s = await toScreen(page, ...p);
    await page.mouse.move(s.x, s.y, { steps: 6 });
  }
  await page.mouse.up();
}

export async function clickDoc(page: Page, x: number, y: number): Promise<void> {
  const s = await toScreen(page, x, y);
  await page.mouse.click(s.x, s.y);
}

/** Waits for a new completed download and returns its bytes. */
export async function nextDownload(ext: ExtFixture, before: number, timeoutMs = 30000): Promise<{ bytes: Buffer; path: string; mime: string }> {
  const start = Date.now();
  for (;;) {
    const item = await ext.sw.evaluate(async (b) => {
      const items = await chrome.downloads.search({ orderBy: ['-startTime'] });
      const done = items.filter((i) => i.id > b && i.state === 'complete');
      const failed = items.filter((i) => i.id > b && i.state === 'interrupted');
      if (failed.length) return { error: failed[0].error ?? 'interrupted' };
      return done[0] ? { path: done[0].filename, mime: done[0].mime } : null;
    }, before);
    if (item && 'error' in item) throw new Error('Download failed: ' + item.error);
    if (item) return { bytes: fs.readFileSync(item.path), path: item.path, mime: item.mime };
    if (Date.now() - start > timeoutMs) throw new Error('No download arrived');
    await new Promise((r) => setTimeout(r, 200));
  }
}

export function lastDownloadId(ext: ExtFixture): Promise<number> {
  return ext.sw.evaluate(async () => {
    const items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 1 });
    return items[0]?.id ?? 0;
  });
}

export interface RegionStats {
  min: [number, number, number];
  max: [number, number, number];
  mean: [number, number, number];
  unique: number;
  /** Mean absolute difference between horizontally adjacent pixels. */
  edge: number;
}

/** Decodes image bytes in the browser and computes stats for regions. */
export async function imageStats(page: Page, bytes: Buffer, regions: { x: number; y: number; w: number; h: number }[]): Promise<{ width: number; height: number; regions: RegionStats[] }> {
  return page.evaluate(
    async ([b64, regs]) => {
      const bin = atob(b64 as string);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const bmp = await createImageBitmap(new Blob([arr]));
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0);
      const out = (regs as { x: number; y: number; w: number; h: number }[]).map((r) => {
        const d = ctx.getImageData(r.x, r.y, r.w, r.h).data;
        const min = [255, 255, 255];
        const max = [0, 0, 0];
        const sum = [0, 0, 0];
        const set = new Set<number>();
        let edge = 0;
        let edgeN = 0;
        for (let i = 0; i < d.length; i += 4) {
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], d[i + k]);
            max[k] = Math.max(max[k], d[i + k]);
            sum[k] += d[i + k];
          }
          set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
          if ((i / 4) % r.w !== r.w - 1) {
            edge += Math.abs(d[i] - d[i + 4]) + Math.abs(d[i + 1] - d[i + 5]) + Math.abs(d[i + 2] - d[i + 6]);
            edgeN++;
          }
        }
        const n = d.length / 4;
        return { min, max, mean: sum.map((s) => s / n), unique: set.size, edge: edgeN ? edge / edgeN : 0 };
      });
      const res = { width: bmp.width, height: bmp.height, regions: out };
      bmp.close();
      return res;
    },
    [bytes.toString('base64'), regions] as const,
  ) as Promise<{ width: number; height: number; regions: RegionStats[] }>;
}

/** Extracts Flate/PNG-predictor RGB images from a FrameShot PDF (test helper). */
export function extractPdfImages(pdf: Buffer): { width: number; height: number; rgb: Buffer }[] {
  const text = pdf.toString('latin1');
  const out: { width: number; height: number; rgb: Buffer }[] = [];
  const re = /\/Subtype \/Image \/Width (\d+) \/Height (\d+)[^]*?\/Filter \/(\w+)[^]*?\/Length (\d+) >>\nstream\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const width = Number(m[1]);
    const height = Number(m[2]);
    const filter = m[3];
    const length = Number(m[4]);
    const start = m.index + m[0].length;
    const data = pdf.subarray(start, start + length);
    if (filter !== 'FlateDecode') continue;
    const raw = zlib.inflateSync(data);
    const rowLen = width * 3;
    const rgb = Buffer.alloc(rowLen * height);
    const prev = Buffer.alloc(rowLen);
    for (let y = 0; y < height; y++) {
      const f = raw[y * (rowLen + 1)];
      const row = raw.subarray(y * (rowLen + 1) + 1, (y + 1) * (rowLen + 1));
      const cur = Buffer.alloc(rowLen);
      for (let i = 0; i < rowLen; i++) {
        const left = i >= 3 ? cur[i - 3] : 0;
        const up = prev[i];
        const val = f === 0 ? row[i] : f === 1 ? row[i] + left : f === 2 ? row[i] + up : row[i];
        cur[i] = val & 0xff;
      }
      cur.copy(rgb, y * rowLen);
      cur.copy(prev);
    }
    out.push({ width, height, rgb });
  }
  return out;
}
