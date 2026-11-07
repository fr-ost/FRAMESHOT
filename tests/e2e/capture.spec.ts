/**
 * Real-browser tests of the capture engine. Each fixture page paints
 * deterministic color bands, so the stitched output can be verified pixel by
 * pixel for missing, duplicated, or misplaced content.
 */
import {
  bandIndex,
  captureAndWait,
  columnRuns,
  expect,
  getStatus,
  near,
  openFixture,
  pageState,
  rowRuns,
  setSettings,
  startCapture,
  test,
  waitForResult,
  type Run,
} from './harness';

const MAGENTA: [number, number, number] = [255, 0, 255];
const CYAN: [number, number, number] = [0, 255, 255];
const YELLOW: [number, number, number] = [255, 255, 0];

/** Collapses runs into band indexes (ignoring 1-2px anti-aliased edges). */
function bandSequence(runs: Run[]): { index: number; length: number }[] {
  return runs.filter((r) => r.length > 3).map((r) => ({ index: bandIndex(r), length: r.length }));
}

test.beforeEach(async ({ ext }) => {
  await setSettings(ext.sw, {
    afterCapture: 'library',
    capture: { fixedElements: 'smart', preloadLazyContent: true, maxPageHeight: 60000, oversize: 'split', settleDelayMs: 100 },
  });
  await ext.sw.evaluate(() => chrome.storage.local.remove('frameora.e2e.limits'));
});

test('visible capture matches the viewport', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'long.html');
  const status = await captureAndWait(ext, tabId, 'visible');
  expect(status.phase, status.message).toBe('done');
  const { width, height, runs } = await columnRuns(ext, status.itemIds![0], 4);
  expect(width).toBe(1280);
  expect(height).toBe(800);
  const seq = bandSequence(runs);
  expect(seq.slice(0, 6).map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(seq[0].length).toBe(120);
  await page.close();
});

test('full page capture is complete, seamless, and restores the page', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'long.html');
  await page.evaluate(() => window.scrollTo(0, 1234));
  const before = await pageState(page);
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { width, height, runs } = await columnRuns(ext, status.itemIds![0], 4);
  expect(width).toBe(1280);
  expect(height).toBe(60 * 120);
  const seq = bandSequence(runs);
  expect(seq.map((s) => s.index)).toEqual(Array.from({ length: 60 }, (_, i) => i));
  for (const s of seq) expect(s.length).toBe(120);
  const after = await pageState(page);
  expect(after.scrollY).toBe(1234);
  expect(after.html).toBe(before.html);
  await page.close();
});

test('sticky headers, sticky sections, and fixed footers appear exactly once', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'sticky.html');
  await page.evaluate(() => window.scrollTo(0, 500));
  const before = await pageState(page);
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { height, runs } = await columnRuns(ext, status.itemIds![0], 4);
  const big = runs.filter((r) => r.length > 3);
  const magenta = big.filter((r) => near(r, MAGENTA));
  const yellow = big.filter((r) => near(r, YELLOW));
  const cyan = big.filter((r) => near(r, CYAN));
  expect(height).toBe(60 + 40 * 120 + 30);
  expect(magenta).toHaveLength(1);
  expect(magenta[0]).toMatchObject({ start: 0, length: 60 });
  expect(yellow).toHaveLength(1);
  expect(yellow[0]).toMatchObject({ start: 60 + 20 * 120, length: 30 });
  expect(cyan).toHaveLength(1);
  expect(cyan[0].start + cyan[0].length).toBe(height);
  expect(cyan[0].length).toBe(40);
  // All 40 bands in order, none duplicated.
  const bands = big.map((r) => bandIndex(r)).filter((i) => i >= 0);
  expect(bands).toEqual(Array.from({ length: 40 }, (_, i) => i));
  const after = await pageState(page);
  expect(after.html).toBe(before.html);
  expect(after.scrollY).toBe(500);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('header')!).position)).toBe('sticky');
  await page.close();
});

test('long table keeps its sticky header once at the top', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'table.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { runs } = await columnRuns(ext, status.itemIds![0], 4);
  const big = runs.filter((r) => r.length > 3);
  const yellow = big.filter((r) => near(r, YELLOW));
  expect(yellow).toHaveLength(1);
  expect(yellow[0].start).toBe(0);
  const rows = big.map((r) => bandIndex(r)).filter((i) => i >= 0);
  expect(rows).toEqual(Array.from({ length: 120 }, (_, i) => i));
  await page.close();
});

test('lazy-loaded images are loaded before capture', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'lazy.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { runs } = await columnRuns(ext, status.itemIds![0], 200);
  const images = runs.filter((r) => r.length >= 250).map((r) => bandIndex(r));
  expect(images).toEqual(Array.from({ length: 16 }, (_, i) => i));
  await page.close();
});

test('infinite scroll content is captured up to the end', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'infinite.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { runs } = await columnRuns(ext, status.itemIds![0], 4);
  const bands = bandSequence(runs).map((s) => s.index);
  expect(bands).toEqual(Array.from({ length: 45 }, (_, i) => i));
  await page.close();
});

test('app-shell pages capture the full scrolling panel', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'app-shell.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  expect(status.warnings?.join(' ')).toContain('panel');
  const { width, runs } = await columnRuns(ext, status.itemIds![0], 4);
  expect(width).toBe(1080);
  const bands = bandSequence(runs);
  expect(bands.map((b) => b.index)).toEqual(Array.from({ length: 40 }, (_, i) => i));
  for (const b of bands) expect(b.length).toBe(120);
  await page.close();
});

test('horizontal overflow is captured in full', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'wide.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { width, height, runs } = await rowRuns(ext, status.itemIds![0], 100);
  expect(width).toBe(2600);
  expect(height).toBe(1800);
  const cols = runs.filter((r) => r.length > 3);
  expect(cols.map((r) => bandIndex(r))).toEqual(Array.from({ length: 13 }, (_, i) => i));
  for (const c of cols) expect(c.length).toBe(200);
  await page.close();
});

test('element capture via the picker', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'nested.html');
  const before = await pageState(page);
  await startCapture(ext.sw, tabId, 'element');
  const box = await page.locator('#card').boundingBox();
  await page.mouse.move(box!.x + 150, box!.y + 90);
  await page.mouse.click(box!.x + 150, box!.y + 90);
  const status = await waitForResult(ext.sw);
  expect(status.phase, status.message).toBe('done');
  const { width, height, runs } = await columnRuns(ext, status.itemIds![0], 150);
  expect(width).toBe(300);
  expect(height).toBe(180);
  expect(near(runs[0], MAGENTA)).toBe(true);
  expect(runs.some((r) => near(r, CYAN) && r.length > 150)).toBe(true);
  expect((await pageState(page)).html).toBe(before.html);
  await page.close();
});

test('area capture via drag selection', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'long.html');
  await startCapture(ext.sw, tabId, 'area');
  await page.mouse.move(100, 200);
  await page.mouse.down();
  await page.mouse.move(300, 300, { steps: 4 });
  await page.mouse.move(500, 400, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.press('Enter');
  const status = await waitForResult(ext.sw);
  expect(status.phase, status.message).toBe('done');
  const { width, height, runs } = await columnRuns(ext, status.itemIds![0], 4);
  expect(width).toBe(400);
  expect(height).toBe(200);
  // y=200..400 covers band 1 (120-240) and band 2 (240-360) and band 3.
  expect(bandSequence(runs).map((s) => s.index)).toEqual([1, 2, 3]);
  await page.close();
});

test('area selection can be extended by scrolling (multi-frame)', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'long.html');
  await startCapture(ext.sw, tabId, 'area');
  await page.mouse.move(50, 100);
  await page.mouse.down();
  await page.mouse.move(300, 700, { steps: 6 });
  await page.mouse.up();
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  // Bottom-right handle is now at viewport y ≈ 100 (700 - 600).
  await page.mouse.move(301, 101);
  await page.mouse.down();
  await page.mouse.move(301, 400, { steps: 6 });
  await page.mouse.move(301, 700, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.press('Enter');
  const status = await waitForResult(ext.sw);
  expect(status.phase, status.message).toBe('done');
  const { height, runs } = await columnRuns(ext, status.itemIds![0], 200);
  expect(Math.abs(height - 1200)).toBeLessThanOrEqual(2);
  const seq = bandSequence(runs);
  // Content y 100..1300 spans bands 0..10 in order with no duplicates.
  expect(seq.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  await page.close();
});

test('scrolling-area capture captures the whole inner panel', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'nested.html');
  await startCapture(ext.sw, tabId, 'scrollable');
  const box = await page.locator('#panel').boundingBox();
  await page.mouse.move(box!.x + 100, box!.y + 100);
  await page.mouse.click(box!.x + 100, box!.y + 100);
  const status = await waitForResult(ext.sw);
  expect(status.phase, status.message).toBe('done');
  const { height, runs } = await columnRuns(ext, status.itemIds![0], 4);
  expect(height).toBe(3000);
  const seq = bandSequence(runs);
  expect(seq.map((s) => s.index)).toEqual(Array.from({ length: 30 }, (_, i) => i));
  expect(await page.evaluate(() => document.getElementById('panel')!.scrollTop)).toBe(0);
  await page.close();
});

test('maximum height limit is applied and reported honestly', async ({ ext }) => {
  await setSettings(ext.sw, { capture: { maxPageHeight: 3000 } });
  const { page, tabId } = await openFixture(ext, 'long.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  expect(status.warnings?.join(' ')).toContain('maximum capture height');
  const { height } = await columnRuns(ext, status.itemIds![0], 4);
  expect(height).toBe(3000);
  await page.close();
});

test('pages beyond canvas limits are split into parts at full resolution', async ({ ext }) => {
  await ext.sw.evaluate(() => chrome.storage.local.set({ 'frameora.e2e.limits': { maxPixels: 1280 * 3000 } }));
  const { page, tabId } = await openFixture(ext, 'long.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  expect(status.itemIds).toHaveLength(3);
  expect(status.warnings?.join(' ')).toContain('3 parts');
  let total = 0;
  const all: number[] = [];
  for (const id of status.itemIds!) {
    const { height, runs } = await columnRuns(ext, id, 4);
    total += height;
    for (const r of runs.filter((x) => x.length > 3)) {
      const idx = bandIndex(r);
      if (all[all.length - 1] !== idx) all.push(idx);
    }
  }
  expect(total).toBe(7200);
  expect(all).toEqual(Array.from({ length: 60 }, (_, i) => i));
  await page.close();
});

test('oversize "scale" mode produces one scaled image', async ({ ext }) => {
  await ext.sw.evaluate(() => chrome.storage.local.set({ 'frameora.e2e.limits': { maxPixels: 1280 * 3000 } }));
  await setSettings(ext.sw, { capture: { oversize: 'scale' } });
  const { page, tabId } = await openFixture(ext, 'long.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  expect(status.itemIds).toHaveLength(1);
  expect(status.warnings?.join(' ')).toContain('scaled');
  const { width, height } = await columnRuns(ext, status.itemIds![0], 4);
  expect(width * height).toBeLessThanOrEqual(1280 * 3000);
  expect(Math.abs(width / height - 1280 / 7200)).toBeLessThan(0.01);
  await page.close();
});

test('cancel restores the page and saves nothing', async ({ ext }) => {
  await setSettings(ext.sw, { capture: { settleDelayMs: 400, preloadLazyContent: false } });
  const { page, tabId } = await openFixture(ext, 'long.html');
  await page.evaluate(() => window.scrollTo(0, 777));
  const before = await pageState(page);
  await startCapture(ext.sw, tabId, 'full');
  await page.waitForTimeout(1500);
  await ext.sw.evaluate(() => (globalThis as unknown as { __frameoraTest: { cancel(): void } }).__frameoraTest.cancel());
  const status = await waitForResult(ext.sw);
  expect(status.phase).toBe('cancelled');
  await page.waitForTimeout(300);
  const after = await pageState(page);
  expect(after.scrollY).toBe(777);
  expect(after.html).toBe(before.html);
  await page.close();
});

test('pressing Escape in the page cancels a capture', async ({ ext }) => {
  await setSettings(ext.sw, { capture: { settleDelayMs: 400, preloadLazyContent: false } });
  const { page, tabId } = await openFixture(ext, 'long.html');
  await startCapture(ext.sw, tabId, 'full');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  const status = await waitForResult(ext.sw);
  expect(status.phase).toBe('cancelled');
  await page.close();
});

test('stop & save keeps what was captured and labels it partial', async ({ ext }) => {
  await setSettings(ext.sw, { capture: { settleDelayMs: 300, preloadLazyContent: false } });
  const { page, tabId } = await openFixture(ext, 'long.html');
  await startCapture(ext.sw, tabId, 'full');
  for (let i = 0; i < 100; i++) {
    const s = await getStatus(ext.sw);
    if ((s as { frame?: number }).frame && (s as { frame?: number }).frame! >= 3) break;
    await page.waitForTimeout(100);
  }
  await ext.sw.evaluate(() => (globalThis as unknown as { __frameoraTest: { stop(): void } }).__frameoraTest.stop());
  const status = await waitForResult(ext.sw);
  expect(status.phase, status.message).toBe('done');
  expect(status.warnings?.join(' ')).toContain('stopped the capture early');
  const { height, runs } = await columnRuns(ext, status.itemIds![0], 4);
  expect(height).toBeLessThan(7200);
  expect(height).toBeGreaterThanOrEqual(800 * 2);
  const seq = bandSequence(runs).map((s) => s.index);
  expect(seq).toEqual(Array.from({ length: seq.length }, (_, i) => i));
  await page.close();
});

test('dynamic pages with reveal animations and timers are captured', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'dynamic.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { runs } = await columnRuns(ext, status.itemIds![0], 600);
  const seq = bandSequence(runs).map((s) => s.index).filter((i) => i >= 0);
  expect(seq).toEqual(Array.from({ length: 30 }, (_, i) => i));
  await page.close();
});

test('image-heavy pages are captured with every image loaded', async ({ ext }) => {
  const { page, tabId } = await openFixture(ext, 'images.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase, status.message).toBe('done');
  const { runs } = await columnRuns(ext, status.itemIds![0], 100);
  const imgs = runs.filter((r) => r.length >= 200).map((r) => bandIndex(r));
  expect(imgs).toEqual(Array.from({ length: 12 }, (_, i) => i * 4));
  await page.close();
});

test('browser pages are refused with a clear message', async ({ ext }) => {
  const page = await ext.context.newPage();
  await page.goto('chrome://version');
  await page.bringToFront();
  // Chrome hides chrome:// URLs from extensions; the newest tab is ours.
  const tabId = await ext.sw.evaluate(async () => Math.max(...(await chrome.tabs.query({})).map((t) => t.id ?? -1)));
  const since = ((await getStatus(ext.sw)) as { updatedAt?: number }).updatedAt ?? 0;
  let message = '';
  try {
    await startCapture(ext.sw, tabId, 'visible');
    const status = await waitForResult(ext.sw, 20_000, since);
    expect(status.phase).toBe('error');
    message = status.message ?? '';
  } catch (err) {
    message = String((err as Error).message);
  }
  expect(message).toContain('does not allow');
  await page.close();
});
