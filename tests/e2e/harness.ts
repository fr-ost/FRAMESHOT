/**
 * Shared E2E harness: launches Chromium with the unpacked E2E build of
 * Frameora (identical to production except for host permissions and a test
 * hook), serves fixture pages from a local HTTP server, and provides helpers
 * to drive captures and inspect results stored in IndexedDB.
 */
import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EXT_DIR = path.join(ROOT, '.output/chrome-mv3-e2e');
const FIXTURES = path.join(ROOT, 'tests/fixtures');

function svgFor(i: number): string {
  const c = `rgb(${((i * 37) % 200) + 20},${((i * 61) % 200) + 20},${((i * 23) % 200) + 20})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${c}"/></svg>`;
}

export function startServer(): Promise<{ url: string; close: () => Promise<void>; requests: string[] }> {
  const requests: string[] = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    requests.push(url.pathname);
    const img = /^\/img\/(\d+)\.svg$/.exec(url.pathname);
    if (img) {
      // Small artificial latency makes lazy-loading realistic.
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' });
        res.end(svgFor(Number(img[1])));
      }, 80);
      return;
    }
    const file = path.join(FIXTURES, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(FIXTURES) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8` });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        requests,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

export interface ExtFixture {
  context: BrowserContext;
  sw: Worker;
  extId: string;
  server: string;
  requests: string[];
}

export async function launchExtension(opts: { deviceScaleFactor?: number; windowHeight?: number } = {}): Promise<{ context: BrowserContext; sw: Worker; extId: string }> {
  if (!fs.existsSync(path.join(EXT_DIR, 'manifest.json'))) {
    throw new Error('E2E build missing. Run `npm run build:e2e` first.');
  }
  const args = [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`];
  if (opts.deviceScaleFactor) {
    // Real (non-emulated) high-DPI: let the forced scale factor reach the page.
    args.push(`--force-device-scale-factor=${opts.deviceScaleFactor}`, `--window-size=1280,${opts.windowHeight ?? 800}`);
  }
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args,
    viewport: opts.deviceScaleFactor ? null : { width: 1280, height: 800 },
    acceptDownloads: true,
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  return { context, sw, extId };
}

export const test = base.extend<object, { ext: ExtFixture }>({
  ext: [
    async ({}, use) => {
      const server = await startServer();
      const { context, sw, extId } = await launchExtension();
      // Keep the fixture tab focused between captures: save to library only.
      await sw.evaluate(async () => {
        await chrome.storage.local.set({ 'frameora.settings': { afterCapture: 'library' } });
      });
      await use({ context, sw, extId, server: server.url, requests: server.requests });
      await context.close();
      await server.close();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';

export async function setSettings(sw: Worker, patch: Record<string, unknown>): Promise<void> {
  await sw.evaluate(async (p) => {
    const cur = ((await chrome.storage.local.get('frameora.settings'))['frameora.settings'] ?? {}) as { capture?: object };
    const next = { ...cur, ...p, capture: { ...(cur.capture ?? {}), ...((p as { capture?: object }).capture ?? {}) } };
    await chrome.storage.local.set({ 'frameora.settings': next });
  }, patch);
}

export async function tabIdFor(sw: Worker, url: string): Promise<number> {
  return sw.evaluate(async (u) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url === u);
    if (!tab?.id) throw new Error('tab not found for ' + u);
    return tab.id;
  }, url);
}

export interface Status {
  phase: string;
  message?: string;
  itemIds?: string[];
  warnings?: string[];
  errorCode?: string;
  progress?: number;
}

export async function getStatus(sw: Worker): Promise<Status> {
  return sw.evaluate(() => (globalThis as unknown as { __frameoraTest: { status(): Status } }).__frameoraTest.status());
}

export async function startCapture(sw: Worker, tabId: number, mode: string, delayMs?: number): Promise<void> {
  await sw.evaluate(
    ([id, m, d]) =>
      (globalThis as unknown as { __frameoraTest: { start(a: number, b: string, c?: number): Promise<void> } }).__frameoraTest.start(
        id as number,
        m as string,
        d as number | undefined,
      ),
    [tabId, mode, delayMs] as const,
  );
}

/** Waits for a terminal capture phase newer than `since`. */
export async function waitForResult(sw: Worker, timeoutMs = 90_000, since = 0): Promise<Status> {
  const start = Date.now();
  for (;;) {
    const s = await getStatus(sw);
    if (['done', 'error', 'cancelled'].includes(s.phase) && ((s as { updatedAt?: number }).updatedAt ?? 0) > since) return s;
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for capture; last status: ' + JSON.stringify(s));
    await new Promise((r) => setTimeout(r, 200));
  }
}

/** Opens a fixture page in a fresh tab and makes sure it is the active tab. */
export async function openFixture(ext: ExtFixture, name: string): Promise<{ page: Page; tabId: number; url: string }> {
  const page = await ext.context.newPage();
  const url = `${ext.server}/${name}`;
  await page.goto(url);
  await page.bringToFront();
  await page.waitForLoadState('load');
  const tabId = await tabIdFor(ext.sw, url);
  return { page, tabId, url };
}

/** Captures and returns the finished status (asserting success). */
export async function captureAndWait(ext: ExtFixture, tabId: number, mode: string): Promise<Status> {
  const since = ((await getStatus(ext.sw)) as { updatedAt?: number }).updatedAt ?? 0;
  await startCapture(ext.sw, tabId, mode);
  return waitForResult(ext.sw, 90_000, since);
}

let studioPage: Page | null = null;

/** An extension page used to read IndexedDB results. */
export async function studio(ext: ExtFixture): Promise<Page> {
  if (studioPage && !studioPage.isClosed()) return studioPage;
  // Opened in a separate window so fixture tabs stay active in theirs.
  const url = `chrome-extension://${ext.extId}/studio.html#/__test`;
  const before = ext.context.pages().length;
  await ext.sw.evaluate(async (u) => {
    await chrome.windows.create({ url: u, focused: false });
  }, url);
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const p = ext.context.pages().find((pg) => pg.url().startsWith(url.split('#')[0]));
    if (p) {
      studioPage = p;
      await p.waitForLoadState('domcontentloaded');
      return p;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('studio page did not open (pages before: ' + before + ')');
}

export interface Run {
  r: number;
  g: number;
  b: number;
  start: number;
  length: number;
}

/**
 * Reads a stored capture and returns runs of (near-)identical colors along a
 * pixel column, plus the image size.
 */
export async function columnRuns(ext: ExtFixture, itemId: string, x: number, tolerance = 10): Promise<{ width: number; height: number; runs: Run[] }> {
  const page = await studio(ext);
  return page.evaluate(
    async ([id, col, tol]) => {
      const db: IDBDatabase = await new Promise((res, rej) => {
        const r = indexedDB.open('frameora');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const blob: Blob = await new Promise((res, rej) => {
        const r = db.transaction('blobs').objectStore('blobs').get(`${id}:original`);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      db.close();
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(1, bmp.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bmp, col as number, 0, 1, bmp.height, 0, 0, 1, bmp.height);
      const data = ctx.getImageData(0, 0, 1, bmp.height).data;
      const runs: { r: number; g: number; b: number; start: number; length: number }[] = [];
      for (let y = 0; y < bmp.height; y++) {
        const r = data[y * 4], g = data[y * 4 + 1], b = data[y * 4 + 2];
        const last = runs[runs.length - 1];
        if (last && Math.abs(last.r - r) <= (tol as number) && Math.abs(last.g - g) <= (tol as number) && Math.abs(last.b - b) <= (tol as number)) last.length++;
        else runs.push({ r, g, b, start: y, length: 1 });
      }
      const result = { width: bmp.width, height: bmp.height, runs };
      bmp.close();
      return result;
    },
    [itemId, x, tolerance] as const,
  );
}

/** Same as columnRuns but along a row. */
export async function rowRuns(ext: ExtFixture, itemId: string, y: number, tolerance = 10): Promise<{ width: number; height: number; runs: Run[] }> {
  const page = await studio(ext);
  return page.evaluate(
    async ([id, row, tol]) => {
      const db: IDBDatabase = await new Promise((res, rej) => {
        const r = indexedDB.open('frameora');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const blob: Blob = await new Promise((res, rej) => {
        const r = db.transaction('blobs').objectStore('blobs').get(`${id}:original`);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      db.close();
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, 1);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bmp, 0, row as number, bmp.width, 1, 0, 0, bmp.width, 1);
      const data = ctx.getImageData(0, 0, bmp.width, 1).data;
      const runs: { r: number; g: number; b: number; start: number; length: number }[] = [];
      for (let x = 0; x < bmp.width; x++) {
        const r = data[x * 4], g = data[x * 4 + 1], b = data[x * 4 + 2];
        const last = runs[runs.length - 1];
        if (last && Math.abs(last.r - r) <= (tol as number) && Math.abs(last.g - g) <= (tol as number) && Math.abs(last.b - b) <= (tol as number)) last.length++;
        else runs.push({ r, g, b, start: x, length: 1 });
      }
      const result = { width: bmp.width, height: bmp.height, runs };
      bmp.close();
      return result;
    },
    [itemId, y, tolerance] as const,
  );
}

export function bandColor(i: number): [number, number, number] {
  return [((i * 37) % 200) + 20, ((i * 61) % 200) + 20, ((i * 23) % 200) + 20];
}

export function near(run: { r: number; g: number; b: number }, rgb: [number, number, number], tol = 12): boolean {
  return Math.abs(run.r - rgb[0]) <= tol && Math.abs(run.g - rgb[1]) <= tol && Math.abs(run.b - rgb[2]) <= tol;
}

/** Index of the band color matching a run, or -1. */
export function bandIndex(run: { r: number; g: number; b: number }, max = 200): number {
  for (let i = 0; i < max; i++) if (near(run, bandColor(i), 6)) return i;
  return -1;
}

/** Snapshot of page state that must be identical before and after capture. */
export async function pageState(page: Page): Promise<{ html: string; scrollX: number; scrollY: number; inner: Record<string, number> }> {
  return page.evaluate(() => {
    const inner: Record<string, number> = {};
    document.querySelectorAll('[id]').forEach((el) => {
      if ((el as HTMLElement).scrollTop) inner[el.id] = (el as HTMLElement).scrollTop;
    });
    // Strip dynamic text (e.g. clocks) but keep structure and attributes.
    return { html: document.documentElement.outerHTML, scrollX: window.scrollX, scrollY: window.scrollY, inner };
  });
}
