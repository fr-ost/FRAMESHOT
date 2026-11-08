/**
 * The review prompt: shown only when earned (enough captures/recordings and
 * days since install), rarely, never mid-task; opens the store reviews page
 * on click; respects "Not now" and "Don't ask again".
 */
import type { Page } from '@playwright/test';
import { captureAndWait, expect, getStatus, openFixture, setSettings, test, waitForResult, type ExtFixture } from './harness';

const DAY = 24 * 60 * 60 * 1000;

interface ReviewState {
  installedAt: number;
  successes: number;
  asks: number;
  lastAskedAt: number;
  snoozeUntil: number;
  done: boolean;
}

const eligible = (patch: Partial<ReviewState> = {}): ReviewState => ({ installedAt: Date.now() - 10 * DAY, successes: 10, asks: 0, lastAskedAt: 0, snoozeUntil: 0, done: false, ...patch });

async function setReview(ext: ExtFixture, state: ReviewState): Promise<void> {
  await ext.sw.evaluate(async (s) => {
    await chrome.storage.local.set({ 'frameshot.review': s });
  }, state);
}

function getReview(ext: ExtFixture): Promise<ReviewState> {
  return ext.sw.evaluate(async () => (await chrome.storage.local.get('frameshot.review'))['frameshot.review'] as ReviewState);
}

async function openLibrary(ext: ExtFixture): Promise<Page> {
  const page = await ext.context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/`);
  await expect(page.getByTestId('library-card').first()).toBeVisible();
  return page;
}

test.beforeAll(async ({ ext }) => {
  await setSettings(ext.sw, { afterCapture: 'library', theme: 'light' });
  // The library prompt needs something in the library.
  const { page, tabId } = await openFixture(ext, 'long.html');
  const s = await captureAndWait(ext, tabId, 'visible');
  expect(s.phase, s.message).toBe('done');
  await page.close();
});

test('a new install is not asked, however much it is used', async ({ ext }) => {
  await setReview(ext, eligible({ installedAt: Date.now() - 2 * DAY, successes: 50 }));
  const page = await openLibrary(ext);
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('review-card')).toHaveCount(0);
  expect((await getReview(ext)).asks).toBe(0);
  await page.close();
});

test('the prompt appears once earned, then pauses for 30 days after "Not now"', async ({ ext }) => {
  await setReview(ext, eligible());
  const page = await openLibrary(ext);
  await expect(page.getByTestId('review-card')).toBeVisible({ timeout: 6000 });
  // The same choices for everyone: rate, not now, or don't ask again.
  await expect(page.getByTestId('review-rate')).toBeVisible();
  await expect(page.getByTestId('review-never')).toBeVisible();
  const shown = await getReview(ext);
  expect(shown.asks).toBe(1);
  expect(shown.snoozeUntil - Date.now()).toBeGreaterThan(29 * DAY);
  await page.getByTestId('review-later').click();
  await expect(page.getByTestId('review-card')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('library-card').first()).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('review-card')).toHaveCount(0);
  await page.close();
});

test('“Rate FrameShot” opens this extension’s Chrome Web Store reviews and ends the prompts', async ({ ext }) => {
  await setReview(ext, eligible());
  const page = await openLibrary(ext);
  await expect(page.getByTestId('review-card')).toBeVisible({ timeout: 6000 });
  await page.getByTestId('review-rate').click();
  // Read the new tab's address through the tabs API (Chrome treats the Web Store
  // specially, so the automation cannot always attach to that page).
  const storeTab = async () =>
    ext.sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const t = tabs.find((x) => (x.pendingUrl ?? x.url ?? '').startsWith('https://chromewebstore.google.com/'));
      return t ? { id: t.id!, url: t.pendingUrl ?? t.url! } : null;
    });
  await expect.poll(async () => (await storeTab())?.url).toBe(`https://chromewebstore.google.com/detail/frameshot/${ext.extId}/reviews`);
  const tab = await storeTab();
  await ext.sw.evaluate((id) => chrome.tabs.remove(id), tab!.id);
  expect((await getReview(ext)).done).toBe(true);
  await page.reload();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('review-card')).toHaveCount(0);
  await page.close();
});

test('“Don’t ask again” is respected', async ({ ext }) => {
  await setReview(ext, eligible());
  const page = await openLibrary(ext);
  await expect(page.getByTestId('review-card')).toBeVisible({ timeout: 6000 });
  await page.getByTestId('review-never').click();
  await expect(page.getByTestId('review-card')).toHaveCount(0);
  const s = await getReview(ext);
  expect(s.done).toBe(true);
  await page.close();
});

test('the popup asks right after a successful capture, which also counts toward asking', async ({ ext }) => {
  // One success short of the threshold: this capture tips it over.
  await setReview(ext, eligible({ successes: 4 }));
  const { page: fx, tabId } = await openFixture(ext, 'long.html');
  await ext.sw.evaluate(async ([id, url]) => {
    await chrome.windows.create({ url: `${url}?tabId=${id}`, type: 'popup', width: 360, height: 640, focused: false });
  }, [tabId, `chrome-extension://${ext.extId}/popup.html`] as const);
  let popup: Page | undefined;
  for (let i = 0; i < 50 && !popup; i++) {
    popup = ext.context.pages().find((p) => p.url().includes('/popup.html'));
    if (!popup) await new Promise((r) => setTimeout(r, 100));
  }
  expect(popup).toBeTruthy();
  // No prompt before the capture.
  await expect(popup!.getByTestId('review-card')).toHaveCount(0);
  const since = ((await getStatus(ext.sw)) as { updatedAt?: number }).updatedAt ?? 0;
  await popup!.getByTestId('capture-visible').click();
  const status = await waitForResult(ext.sw, 60_000, since);
  expect(status.phase, status.message).toBe('done');
  await expect(popup!.getByText('Capture saved')).toBeVisible();
  await expect(popup!.getByTestId('review-card')).toBeVisible({ timeout: 6000 });
  const s = await getReview(ext);
  expect(s.successes).toBe(5);
  expect(s.asks).toBe(1);
  await popup!.close();
  await fx.close();
});
