/**
 * UX regressions found in review: smooth paging in big libraries, narrow
 * windows, keyboard focus in the editor, typing sizes in the composer, broken
 * addresses, and the shortcut sheet.
 */
import type { Page } from '@playwright/test';
import { captureAndWait, expect, openFixture, setSettings, test, type ExtFixture } from './harness';
import { dragDoc, openEditor, toScreen } from './editor-helpers';

async function openStudio(ext: ExtFixture, route: string, width = 1400): Promise<Page> {
  const page = await ext.context.newPage();
  await page.setViewportSize({ width, height: 860 });
  await page.goto(`chrome-extension://${ext.extId}/studio.html#${route}`);
  return page;
}

async function clearLibrary(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('frameora');
      r.onsuccess = () => res(r.result);
    });
    const stores = ['items', 'blobs', 'docs', 'collections', 'recChunks', 'recSessions'].filter((s) => db.objectStoreNames.contains(s));
    const tx = db.transaction(stores, 'readwrite');
    for (const s of stores) tx.objectStore(s).clear();
    await new Promise((r) => (tx.oncomplete = r));
    db.close();
    new BroadcastChannel('frameshot-library').postMessage({ kind: 'cleared' });
  });
}

/** Adds `count` plain screenshot records straight into the library database. */
async function seedItems(page: Page, count: number): Promise<void> {
  await page.evaluate(async (n) => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('frameora');
      r.onsuccess = () => res(r.result);
    });
    const tx = db.transaction(['items', 'blobs'], 'readwrite');
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      const id = `seed-${i}`;
      tx.objectStore('items').put({
        id,
        name: `A rather long page title for seeded screenshot number ${i} that keeps going`,
        createdAt: now - i * 1000,
        updatedAt: now - i * 1000,
        kind: 'capture',
        mode: 'visible',
        source: { url: `https://example.com/${i}`, title: `Seed ${i}`, domain: 'example.com' },
        width: 1280,
        height: 800,
        byteSize: 1000,
        mimeType: 'image/png',
        favorite: false,
        collectionId: null,
        tags: [],
        hasEdits: false,
        warnings: [],
      });
      tx.objectStore('blobs').put(new Blob([new Uint8Array(10)], { type: 'image/png' }), `${id}:original`);
    }
    await new Promise((r) => (tx.oncomplete = r));
    db.close();
    new BroadcastChannel('frameshot-library').postMessage({ kind: 'items-changed' });
  }, count);
}

test.beforeEach(async ({ ext }) => {
  await setSettings(ext.sw, { afterCapture: 'library', theme: 'light', library: { view: 'grid' } });
});

test('a big library loads one more page per scroll, not everything at once', async ({ ext }) => {
  const page = await openStudio(ext, '/__test');
  await clearLibrary(page);
  await seedItems(page, 150);
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/`);
  const cards = page.getByTestId('library-card');
  await expect(cards).toHaveCount(60);
  await page.getByTestId('library-scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(cards).toHaveCount(120);
  await page.waitForTimeout(800);
  // Still 120: the next page waits for the next scroll.
  await expect(cards).toHaveCount(120);
  await page.getByTestId('library-scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(cards).toHaveCount(150);
  await clearLibrary(page);
  await page.close();
});

test('the library header, bulk bar and list view stay usable in a 900 px window', async ({ ext }) => {
  const page = await openStudio(ext, '/__test', 900);
  await clearLibrary(page);
  await seedItems(page, 6);
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/`);
  await expect(page.getByTestId('library-card')).toHaveCount(6);
  for (const name of ['Import']) {
    const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(900);
  }
  const record = (await page.getByTestId('library-record').boundingBox())!;
  expect(record.x + record.width).toBeLessThanOrEqual(900);
  // Selecting shows a bulk bar whose buttons all fit.
  await page.keyboard.press('Control+a');
  await expect(page.getByText('6 selected')).toBeVisible();
  const clear = (await page.getByRole('button', { name: 'Clear selection' }).boundingBox())!;
  expect(clear.x + clear.width).toBeLessThanOrEqual(900);
  await page.keyboard.press('Escape');
  await expect(page.getByText('6 selected')).toBeHidden();
  // List view: the actions menu of a row with a long name is still on screen.
  await page.getByRole('button', { name: 'List view' }).click();
  const row = page.getByTestId('library-row').first();
  await expect(row).toBeVisible();
  const actions = row.getByRole('button', { name: /^Actions for / });
  await expect(actions).toBeVisible();
  const a = (await actions.boundingBox())!;
  expect(a.x + a.width).toBeLessThanOrEqual(900);
  await page.getByRole('button', { name: 'Grid view' }).click();
  await clearLibrary(page);
  await page.close();
});

test('arrow keys move the selected shape again after using a panel slider', async ({ ext }) => {
  const { page: fx, tabId } = await openFixture(ext, 'long.html');
  const s = await captureAndWait(ext, tabId, 'visible');
  expect(s.phase, s.message).toBe('done');
  await fx.close();
  const page = await openEditor(ext, s.itemIds![0]);
  await page.keyboard.press('r');
  await dragDoc(page, [[200, 200], [400, 320]]);
  const before = await page.evaluate(() => {
    const st = (window as unknown as { __frameshotEditor: { getState(): { doc: { objects: { x: number; opacity: number }[] } } } }).__frameshotEditor.getState();
    return st.doc.objects[0];
  });
  // Use the opacity slider (it keeps keyboard focus), then click the shape on the canvas.
  await page.locator('#fr-opacity').focus();
  const p = await toScreen(page, 300, 260);
  await page.mouse.click(p.x, p.y);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const after = await page.evaluate(() => {
    const st = (window as unknown as { __frameshotEditor: { getState(): { doc: { objects: { x: number; opacity: number }[] } } } }).__frameshotEditor.getState();
    return st.doc.objects[0];
  });
  expect(after.x).toBeCloseTo(before.x + 2, 6);
  expect(after.opacity).toBe(before.opacity);
  await page.close();
});

test('composer width and height can be typed', async ({ ext }) => {
  const { page: fx, tabId } = await openFixture(ext, 'long.html');
  const s = await captureAndWait(ext, tabId, 'visible');
  await fx.close();
  const page = await openStudio(ext, `/compose/${encodeURIComponent(s.itemIds![0])}`);
  const width = page.locator('#fr-cw');
  await expect(width).toBeVisible();
  await width.fill('1200');
  await width.press('Enter');
  await expect(width).toHaveValue('1200');
  const height = Number(await page.locator('#fr-ch').inputValue());
  expect(height).toBeGreaterThanOrEqual(16);
  expect(height).toBeLessThanOrEqual(8192);
  await page.close();
});

test('a broken address shows a message instead of a blank screen, and "?" opens the shortcut sheet', async ({ ext }) => {
  const page = await openStudio(ext, '/edit/%');
  await expect(page.getByText(/no longer in your library|Something went wrong/)).toBeVisible();
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/`);
  await page.locator('body').click({ position: { x: 600, y: 500 } });
  await page.keyboard.press('Shift+Slash');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Capture full page')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  // Page transitions animate only the page layer; the background never covers it.
  const names = await page.evaluate(() => ({
    aurora: getComputedStyle(document.querySelector('.fr-aurora')!).viewTransitionName,
    page: getComputedStyle(document.querySelector('.fr-page-layer')!).viewTransitionName,
  }));
  expect(names).toEqual({ aurora: 'none', page: 'fr-page' });
  await page.close();
});
