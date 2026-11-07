/**
 * High-DPI capture: Chromium is launched with a forced device scale factor of
 * 2, so captureVisibleTab returns 2x frames and the stitcher must map CSS px
 * to device px correctly.
 */
import { test as base } from '@playwright/test';
import { bandIndex, columnRuns, expect, launchExtension, near, startServer, type ExtFixture, getStatus, startCapture, waitForResult, tabIdFor } from './harness';

const test = base.extend<object, { ext: ExtFixture }>({
  ext: [
    async ({}, use) => {
      const server = await startServer();
      const { context, sw, extId } = await launchExtension({ deviceScaleFactor: 2 });
      await sw.evaluate(() => chrome.storage.local.set({ 'frameora.settings': { afterCapture: 'library' } }));
      await use({ context, sw, extId, server: server.url, requests: server.requests });
      await context.close();
      await server.close();
    },
    { scope: 'worker' },
  ],
});

async function capture(ext: ExtFixture, name: string, mode: string) {
  const page = await ext.context.newPage();
  const url = `${ext.server}/${name}`;
  await page.goto(url);
  await page.bringToFront();
  const tabId = await tabIdFor(ext.sw, url);
  const since = ((await getStatus(ext.sw)) as { updatedAt?: number }).updatedAt ?? 0;
  await startCapture(ext.sw, tabId, mode);
  const status = await waitForResult(ext.sw, 90_000, since);
  return { page, status };
}

test('full page capture at 2x device pixels', async ({ ext }) => {
  const { page, status } = await capture(ext, 'long.html', 'full');
  expect(status.phase, status.message).toBe('done');
  const { width, height, runs } = await columnRuns(ext, status.itemIds![0], 8);
  const metrics = await page.evaluate(() => ({ dpr: devicePixelRatio, w: document.documentElement.clientWidth }));
  expect(metrics.dpr).toBe(2);
  expect(width).toBe(metrics.w * 2);
  expect(height).toBe(60 * 120 * 2);
  const seq = runs.filter((r) => r.length > 6).map((r) => ({ i: bandIndex(r), len: r.length }));
  expect(seq.map((s) => s.i)).toEqual(Array.from({ length: 60 }, (_, i) => i));
  for (const s of seq) expect(s.len).toBe(240);
  await page.close();
});

test('sticky handling at 2x device pixels', async ({ ext }) => {
  const { page, status } = await capture(ext, 'sticky.html', 'full');
  expect(status.phase, status.message).toBe('done');
  const { height, runs } = await columnRuns(ext, status.itemIds![0], 8);
  expect(height).toBe((60 + 40 * 120 + 30) * 2);
  const big = runs.filter((r) => r.length > 6);
  expect(big.filter((r) => near(r, [255, 0, 255]))).toHaveLength(1);
  expect(big.filter((r) => near(r, [0, 255, 255]))).toHaveLength(1);
  expect(big.map((r) => bandIndex(r)).filter((i) => i >= 0)).toEqual(Array.from({ length: 40 }, (_, i) => i));
  await page.close();
});
