/**
 * Real fractional device scales (Windows 125% / 150% / 175% display scaling)
 * with fractional page heights. Every full-page capture must succeed, cover
 * the whole page, and keep content in order.
 */
import { test as base } from '@playwright/test';
import { bandIndex, columnRuns, expect, getStatus, launchExtension, startCapture, startServer, tabIdFor, waitForResult, type ExtFixture } from './harness';

for (const [scale, winH] of [
  [1.25, 797],
  [1.5, 803],
  [1.75, 811],
] as const) {
  const test = base.extend<object, { ext: ExtFixture }>({
    ext: [
      async ({}, use) => {
        const server = await startServer();
        const { context, sw, extId } = await launchExtension({ deviceScaleFactor: scale, windowHeight: winH });
        await sw.evaluate(() => chrome.storage.local.set({ 'frameora.settings': { afterCapture: 'library' } }));
        await use({ context, sw, extId, server: server.url, requests: server.requests });
        await context.close();
        await server.close();
      },
      { scope: 'worker' },
    ],
  });

  test.describe(`device scale ${scale}`, () => {
    for (const name of ['fractional.html', 'long.html', 'sticky.html']) {
      test(`full page capture of ${name} succeeds and is complete`, async ({ ext }) => {
        const page = await ext.context.newPage();
        const url = `${ext.server}/${name}`;
        await page.goto(url);
        await page.bringToFront();
        const tabId = await tabIdFor(ext.sw, url);
        const metrics = await page.evaluate(() => ({ dpr: devicePixelRatio, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
        expect(metrics.dpr).toBeCloseTo(scale, 2);
        const since = ((await getStatus(ext.sw)) as { updatedAt?: number }).updatedAt ?? 0;
        await startCapture(ext.sw, tabId, 'full');
        const status = await waitForResult(ext.sw, 90_000, since);
        expect(status.phase, `${status.message} (metrics ${JSON.stringify(metrics)})`).toBe('done');
        const { height, runs } = await columnRuns(ext, status.itemIds![0], 8);
        // Height matches the page within one device pixel.
        expect(Math.abs(height - metrics.sh * scale)).toBeLessThanOrEqual(Math.ceil(scale) + 1);
        const bands = runs.filter((r) => r.length > 8).map((r) => bandIndex(r)).filter((i) => i >= 0);
        const expected = name === 'sticky.html' ? 40 : 60;
        expect(bands).toEqual(Array.from({ length: expected }, (_, i) => i));
        await page.close();
      });
    }
  });
}
