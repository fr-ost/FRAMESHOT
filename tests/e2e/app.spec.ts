/**
 * Library, composer, popup, settings, shortcuts — driven through the real UI.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import type { Page } from '@playwright/test';
import { captureAndWait, expect, getStatus, openFixture, setSettings, test, waitForResult, type ExtFixture } from './harness';
import { dragDoc, imageStats, lastDownloadId, nextDownload, openEditor } from './editor-helpers';

async function openStudio(ext: ExtFixture, route = '/'): Promise<Page> {
  const page = await ext.context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`chrome-extension://${ext.extId}/studio.html#${route}`);
  return page;
}

async function clearLibrary(ext: ExtFixture) {
  const page = await openStudio(ext, '/__test');
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('frameora');
      r.onsuccess = () => res(r.result);
    });
    const tx = db.transaction(['items', 'blobs', 'docs', 'collections'], 'readwrite');
    for (const s of ['items', 'blobs', 'docs', 'collections']) tx.objectStore(s).clear();
    await new Promise((r) => (tx.oncomplete = r));
    new BroadcastChannel('frameora-library').postMessage({ kind: 'cleared' });
  });
  await page.close();
}

async function captureFixture(ext: ExtFixture, name: string, mode = 'visible'): Promise<string> {
  const { page, tabId } = await openFixture(ext, name);
  const s = await captureAndWait(ext, tabId, mode);
  expect(s.phase, s.message).toBe('done');
  await page.close();
  return s.itemIds![0];
}

test.beforeEach(async ({ ext }) => {
  await setSettings(ext.sw, { afterCapture: 'library', defaultFormat: 'png', theme: 'light', filenameTemplate: 'frameora-{domain}-{date}-{time}', pdf: { pageSize: 'a4', marginPt: 24 } });
});

test('library: search, filter, favorite, rename, tags, collections, delete', async ({ ext }) => {
  await clearLibrary(ext);
  await captureFixture(ext, 'long.html');
  await captureFixture(ext, 'sticky.html');
  await captureFixture(ext, 'table.html');
  const page = await openStudio(ext);
  const cards = page.getByTestId('library-card');
  await expect(cards).toHaveCount(3);

  // Search by page title.
  await page.getByLabel('Search screenshots').fill('sticky');
  await expect(cards).toHaveCount(1);
  await page.getByLabel('Search screenshots').fill('');
  // Domain filter.
  await page.getByLabel('Filter by website').selectOption('127.0.0.1');
  await expect(cards).toHaveCount(3);
  await page.getByLabel('Filter by website').selectOption('');

  // Favorite the table capture and filter by favorites.
  const tableCard = cards.filter({ hasText: 'Long table' });
  await tableCard.hover();
  await tableCard.getByRole('button', { name: 'Add to favorites' }).click();
  await page.getByRole('button', { name: /^Favorites/ }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole('button', { name: /^All screenshots/ }).click();

  // Rename + tags via details.
  await tableCard.getByRole('button', { name: /Actions for/ }).click();
  await page.getByRole('menuitem', { name: /Details/ }).click();
  await page.getByLabel('Name', { exact: true }).fill('Quarterly table');
  await page.getByLabel('Tags').fill('finance, Q3');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(cards.filter({ hasText: 'Quarterly table' })).toHaveCount(1);
  await page.getByLabel('Search screenshots').fill('q3');
  await expect(cards).toHaveCount(1);
  await page.getByLabel('Search screenshots').fill('');

  // Collections: create and move two items into it.
  await page.getByRole('button', { name: 'New collection' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Reports');
  await page.getByRole('button', { name: 'Create' }).click();
  await cards.nth(0).hover();
  await cards.nth(0).getByRole('button', { name: /^Select / }).click();
  await cards.nth(1).getByRole('button', { name: /^Select / }).click();
  await expect(page.getByText('2 selected')).toBeVisible();
  await page.getByRole('button', { name: 'Move to…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reports' }).click();
  await page.getByRole('navigation', { name: 'Collections' }).getByRole('button', { name: /Reports/ }).click();
  await expect(cards).toHaveCount(2);
  await page.getByRole('button', { name: /^All screenshots/ }).click();

  // Sort oldest first puts the first capture first.
  await page.getByLabel('Sort').selectOption('oldest');
  await expect(cards.first()).toContainText('Long article');

  // Delete with confirmation.
  await cards.first().getByRole('button', { name: /Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('dialog')).toContainText('Delete screenshot?');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(cards).toHaveCount(2);

  // List view.
  await page.getByRole('button', { name: 'List view' }).click();
  await expect(page.getByTestId('library-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Grid view' }).click();
  await page.close();
});

test('library: reopen in editor, bulk export ZIP and combined PDF', async ({ ext }) => {
  await clearLibrary(ext);
  await captureFixture(ext, 'long.html');
  await captureFixture(ext, 'redact.html');
  const page = await openStudio(ext);
  const cards = page.getByTestId('library-card');
  await expect(cards).toHaveCount(2);

  // Reopen in the editor.
  await cards.first().getByRole('button', { name: /^Open / }).click();
  await expect(page.getByTestId('editor-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(cards).toHaveCount(2);

  await cards.nth(0).hover();
  await cards.nth(0).getByRole('button', { name: /^Select / }).click();
  await cards.nth(1).getByRole('button', { name: /^Select / }).click();

  // ZIP of PNGs.
  let before = await lastDownloadId(ext);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'PNG' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }).click();
  const zip = await nextDownload(ext, before);
  expect(zip.bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const listing = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("\\n".join(z.namelist()))', zip.path]).toString().trim().split('\n');
  expect(listing).toHaveLength(2);
  for (const n of listing) expect(n).toMatch(/^frameora-127\.0\.0\.1-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}( \(2\))?\.png$/);

  // One combined PDF.
  before = await lastDownloadId(ext);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'PDF' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }).click();
  const pdf = await nextDownload(ext, before);
  expect(pdf.bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  fs.copyFileSync(pdf.path, test.info().outputPath('combined.pdf'));
  const out = execFileSync('node', ['-e', `require('pdf-lib').PDFDocument.load(require('fs').readFileSync(process.argv[1])).then(d=>console.log('RESULT ' + d.getPageCount() + ' ' + JSON.stringify(d.getPage(0).getSize())))`, pdf.path], { cwd: process.cwd() }).toString();
  const m = /RESULT (\d+) (\{.*\})/.exec(out);
  expect(m, out).toBeTruthy();
  const [count, size] = [Number(m![1]), JSON.parse(m![2]) as { width: number }];
  expect(count).toBe(2); // two A4 pages (each 1280×800 capture fits one page)
  expect(Math.round(size.width)).toBe(595);
  await page.close();
});

test('library thumbnail updates when leaving the editor right after an edit', async ({ ext }) => {
  await clearLibrary(ext);
  const id = await captureFixture(ext, 'redact.html');
  const readThumb = (page: Page) =>
    page.evaluate(async (itemId) => {
      const db: IDBDatabase = await new Promise((res) => {
        const r = indexedDB.open('frameora');
        r.onsuccess = () => res(r.result);
      });
      const blob: Blob = await new Promise((res) => {
        const r = db.transaction('blobs').objectStore('blobs').get(`${itemId}:thumb`);
        r.onsuccess = () => res(r.result);
      });
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, id);
  const page = await openEditor(ext, id);
  const before = await readThumb(page);
  await page.keyboard.press('d');
  await dragDoc(page, [[0, 0], [1280, 800]]);
  await page.waitForTimeout(700); // autosave fires; thumbnail timer still pending
  await page.getByRole('button', { name: 'Back to library' }).click();
  await page.waitForTimeout(800);
  const after = await readThumb(page);
  expect(Buffer.from(after).equals(Buffer.from(before))).toBe(false);
  const stats = await imageStats(page, Buffer.from(after), [{ x: 10, y: 10, w: 100, h: 50 }]);
  expect(stats.regions[0].max).toEqual([0, 0, 0]);
  await page.close();
});

test('composer exports a 1200×630 social card with background and shadow', async ({ ext }) => {
  await clearLibrary(ext);
  const id = await captureFixture(ext, 'long.html');
  const page = await openStudio(ext, `/compose/${id}`);
  await expect(page.getByTestId('composer-preview')).toBeVisible();
  await page.getByLabel('Size preset').selectOption('og');
  await page.getByRole('radio', { name: 'Solid' }).click();
  await page.getByRole('button', { name: 'Black' }).click();
  const before = await lastDownloadId(ext);
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: /^PNG/ }).click();
  const dl = await nextDownload(ext, before);
  const { width, height, regions } = await imageStats(page, dl.bytes, [{ x: 2, y: 2, w: 4, h: 4 }, { x: 600, y: 315, w: 4, h: 4 }]);
  expect([width, height]).toEqual([1200, 630]);
  expect(regions[0].mean.map(Math.round)).toEqual([17, 24, 39]); // #111827 background
  expect(regions[1].mean[0]).not.toBe(17); // screenshot in the middle
  // Save to library adds a composition item.
  await page.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.getByText('Composition saved to your library.')).toBeVisible();
  await page.close();
});

test('popup: capture full page with live progress, then open recent', async ({ ext }) => {
  await setSettings(ext.sw, { capture: { settleDelayMs: 200 } });
  const { page: fx, tabId } = await openFixture(ext, 'long.html');
  // Open the popup UI in its own window so the fixture tab stays active.
  await ext.sw.evaluate(async ([id, url]) => {
    await chrome.windows.create({ url: `${url}?tabId=${id}`, type: 'popup', width: 360, height: 600, focused: false });
  }, [tabId, `chrome-extension://${ext.extId}/popup.html`] as const);
  let popup: Page | undefined;
  for (let i = 0; i < 50 && !popup; i++) {
    popup = ext.context.pages().find((p) => p.url().includes('/popup.html'));
    if (!popup) await new Promise((r) => setTimeout(r, 100));
  }
  expect(popup).toBeTruthy();
  const since = ((await getStatus(ext.sw)) as { updatedAt?: number }).updatedAt ?? 0;
  await popup!.getByTestId('capture-full').click();
  await expect(popup!.getByRole('progressbar', { name: 'Capture progress' })).toBeVisible({ timeout: 15000 });
  await expect(popup!.getByTestId('stop-capture')).toBeVisible();
  const status = await waitForResult(ext.sw, 90_000, since);
  expect(status.phase, status.message).toBe('done');
  await expect(popup!.getByText('Capture saved')).toBeVisible();
  await popup!.getByRole('button', { name: 'New capture' }).click();
  await expect(popup!.getByRole('region', { name: 'Recent captures' }).getByRole('button').first()).toBeVisible();
  await popup!.close();
  await fx.close();
});

test('keyboard shortcut commands start captures and are declared in the manifest', async ({ ext }) => {
  const commands = await ext.sw.evaluate(() => chrome.commands.getAll());
  const byName = Object.fromEntries(commands.map((c) => [c.name, c]));
  for (const name of ['capture-visible', 'capture-full', 'capture-area', 'capture-element', 'open-studio', 'open-library', 'cancel-capture']) {
    expect(byName[name], name).toBeTruthy();
  }
  expect(byName['capture-visible'].shortcut).toBe('Alt+Shift+V');
  expect(byName['capture-full'].shortcut).toBe('Alt+Shift+F');

  const { page, tabId } = await openFixture(ext, 'long.html');
  const since = ((await getStatus(ext.sw)) as { updatedAt?: number }).updatedAt ?? 0;
  await ext.sw.evaluate((id) => (globalThis as unknown as { __frameoraTest: { command(c: string, t?: number): Promise<void> } }).__frameoraTest.command('capture-visible', id), tabId);
  const status = await waitForResult(ext.sw, 30_000, since);
  expect(status.phase, status.message).toBe('done');

  // open-library opens (or focuses) the Studio.
  await ext.sw.evaluate(() => (globalThis as unknown as { __frameoraTest: { command(c: string): Promise<void> } }).__frameoraTest.command('open-library'));
  await expect.poll(() => ext.context.pages().some((p) => p.url().includes('studio.html#/'))).toBe(true);
  await page.close();
});

test('settings: theme, default format, filename template and clear data', async ({ ext }) => {
  await clearLibrary(ext);
  const id = await captureFixture(ext, 'long.html');
  const page = await openStudio(ext, '/settings');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('radiogroup', { name: 'Default format' }).getByRole('radio', { name: 'JPEG' }).click();
  await page.getByLabel('File name template').fill('shot-{mode}-{width}x{height}');
  await page.getByLabel('File name template').blur();
  await expect(page.getByText('Preview:')).toContainText('shot-full-1440x6200.jpg');

  // The editor picks up the new default format and filename.
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/edit/${id}`);
  await expect(page.getByTestId('download-default')).toHaveText(/Download JPEG/);
  await page.evaluate(() => {
    const orig = chrome.downloads.download.bind(chrome.downloads);
    (window as unknown as { __names: string[] }).__names = [];
    (chrome.downloads as unknown as { download: typeof orig }).download = ((opts: chrome.downloads.DownloadOptions) => {
      (window as unknown as { __names: string[] }).__names.push(opts.filename ?? '');
      return orig(opts);
    }) as typeof orig;
  });
  const before = await lastDownloadId(ext);
  await page.getByTestId('download-default').click();
  const dl = await nextDownload(ext, before);
  expect([...dl.bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  const names = await page.evaluate(() => (window as unknown as { __names: string[] }).__names);
  expect(names[0]).toBe('shot-visible-1280x800.jpg');

  // Clear all local data.
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/settings`);
  await page.getByRole('button', { name: 'Clear all local data' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByText('All local data deleted.')).toBeVisible();
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/`);
  await expect(page.getByText('No screenshots yet')).toBeVisible();
  // Settings persist across reloads.
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await setSettings(ext.sw, { theme: 'light', defaultFormat: 'png', filenameTemplate: 'frameora-{domain}-{date}-{time}' });
  await page.close();
});

test('import an image file into the library', async ({ ext }, testInfo) => {
  await clearLibrary(ext);
  const file = testInfo.outputPath('import.png');
  fs.mkdirSync(testInfo.outputDir, { recursive: true });
  fs.writeFileSync(file, Buffer.from(fs.readFileSync(new URL('../../public/icon/128.png', import.meta.url))));
  const page = await openStudio(ext);
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByTestId('library-card')).toHaveCount(1);
  await expect(page.getByTestId('library-card')).toContainText('import');
  await page.close();
});
