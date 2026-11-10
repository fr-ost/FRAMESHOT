/**
 * Privacy guarantees, verified in a real browser:
 *  - extension pages cannot make network requests (CSP connect-src)
 *  - capture/edit/export flows issue no requests beyond the page being captured
 *  - FrameShot works fully offline
 */
import type { Request } from '@playwright/test';
import { captureAndWait, expect, openFixture, setSettings, test } from './harness';
import { dragDoc, lastDownloadId, nextDownload, openEditor } from './editor-helpers';

test('extension pages are blocked from making network requests by CSP', async ({ ext }) => {
  const page = await ext.context.newPage();
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/__test`);
  const result = await page.evaluate(async (server) => {
    const out: Record<string, string> = {};
    const violations: string[] = [];
    document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.effectiveDirective} ${e.blockedURI}`));
    for (const url of ['https://example.com/collect', `${server}/long.html`]) {
      try {
        await fetch(url, { mode: 'no-cors' });
        out[url] = 'allowed';
      } catch (e) {
        out[url] = `blocked: ${(e as Error).message}`;
      }
    }
    // Beacons and remote images are blocked too (reported as CSP violations).
    navigator.sendBeacon('https://example.com/beacon', 'x');
    const img = new Image();
    const imgResult = new Promise<string>((res) => {
      img.onload = () => res('allowed');
      img.onerror = () => res('blocked');
    });
    img.src = 'https://example.com/pixel.gif';
    out.image = await imgResult;
    await new Promise((r) => setTimeout(r, 300));
    return { out, violations };
  }, ext.server);
  expect(result.out['https://example.com/collect']).toMatch(/^blocked/);
  expect(result.out[`${ext.server}/long.html`]).toMatch(/^blocked/);
  expect(result.out.image).toBe('blocked');
  expect(result.violations.some((v) => v.startsWith('connect-src https://example.com/beacon'))).toBe(true);
  expect(result.violations.some((v) => v.startsWith('img-src https://example.com/pixel.gif'))).toBe(true);
  // The service worker shares the same CSP.
  const sw = await ext.sw.evaluate(async () => {
    try {
      await fetch('https://example.com/collect', { mode: 'no-cors' });
      return 'allowed';
    } catch {
      return 'blocked';
    }
  });
  expect(sw).toBe('blocked');
  await page.close();
});

test('capture → edit → export makes no requests other than the captured page’s own', async ({ ext }) => {
  await setSettings(ext.sw, { afterCapture: 'library' });
  const requests: string[] = [];
  const onRequest = (r: Request) => requests.push(r.url());
  ext.context.on('request', onRequest);
  const { page, tabId } = await openFixture(ext, 'redact.html');
  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase).toBe('done');
  const editor = await openEditor(ext, status.itemIds![0]);
  await editor.keyboard.press('d');
  await dragDoc(editor, [[40, 40], [560, 240]]);
  const before = await lastDownloadId(ext);
  await editor.getByTestId('download-default').click();
  await nextDownload(ext, before);
  ext.context.off('request', onRequest);
  const foreign = requests.filter((u) => !/^(chrome-extension:|blob:|data:)/.test(u) && !u.startsWith(ext.server));
  expect(foreign).toEqual([]);
  // The only http requests are the fixture page loading its own resources.
  for (const u of requests.filter((x) => x.startsWith('http'))) expect(u.startsWith(ext.server)).toBe(true);
  await editor.close();
  await page.close();
});

test('the Studio works offline: library, editor and export', async ({ ext }) => {
  await setSettings(ext.sw, { afterCapture: 'library' });
  const { page, tabId } = await openFixture(ext, 'long.html');
  const status = await captureAndWait(ext, tabId, 'visible');
  await page.close();
  await ext.context.setOffline(true);
  try {
    const studio = await ext.context.newPage();
    await studio.goto(`chrome-extension://${ext.extId}/studio.html#/`);
    await expect(studio.getByTestId('library-card').first()).toBeVisible();
    await studio.close();
    const editor = await openEditor(ext, status.itemIds![0]);
    await editor.keyboard.press('r');
    await dragDoc(editor, [[100, 100], [300, 300]]);
    const before = await lastDownloadId(ext);
    await editor.getByTestId('download-default').click();
    const dl = await nextDownload(ext, before);
    expect(dl.bytes.length).toBeGreaterThan(1000);
    await editor.close();
  } finally {
    await ext.context.setOffline(false);
  }
});

test('install counts: only the tracker origin is allowed, test builds send nothing, and the Settings switch turns them off', async ({ ext }) => {
  // The one remote origin in the CSP is FrameShot's install-count Worker.
  const csp = await ext.sw.evaluate(() => (chrome.runtime.getManifest() as chrome.runtime.ManifestV3).content_security_policy?.extension_pages ?? '');
  const connect = /connect-src ([^;]*)/.exec(csp)?.[1].trim().split(/\s+/) ?? [];
  expect(connect).toEqual(["'self'", 'blob:', 'data:', 'https://frameshot.shahriarahmed614.workers.dev']);
  // E2E builds never create an install id (nothing is sent).
  expect(await ext.sw.evaluate(() => chrome.storage.local.get('frameshot.telemetry'))).toEqual({});

  const page = await ext.context.newPage();
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/settings`);
  const toggle = page.getByRole('switch', { name: /Share anonymous install counts/ });
  await expect(toggle).toBeChecked();
  await toggle.click({ force: true });
  await expect(toggle).not.toBeChecked();
  await expect
    .poll(() => ext.sw.evaluate(async () => ((await chrome.storage.local.get('frameora.settings'))['frameora.settings'] as { shareStats?: boolean })?.shareStats))
    .toBe(false);
  await toggle.click({ force: true });
  await expect(toggle).toBeChecked();
  await page.close();
});
