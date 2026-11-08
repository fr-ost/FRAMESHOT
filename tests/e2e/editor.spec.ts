/**
 * Editor end-to-end tests: real pointer interactions with every tool, and
 * verification of the *exported files themselves* (PNG, JPEG, WebP, PDF,
 * clipboard) — in particular that redacted pixels are gone.
 */
import type { Page } from '@playwright/test';
import { captureAndWait, expect, openFixture, setSettings, test, type ExtFixture } from './harness';
import { clickDoc, dragDoc, editorState, extractPdfImages, imageStats, lastDownloadId, nextDownload, openEditor } from './editor-helpers';

// Fixture geometry (CSS px == image px at 1x).
const SECRET = { x: 40, y: 40, w: 520, h: 200 }; // black/white 4px stripes
const SECRET2 = { x: 640, y: 40, w: 520, h: 200 }; // blue/yellow 3px stripes
const CARD = { x: 40, y: 300, w: 560, h: 40 }; // "Card: 4242 …" text
const inset = (r: { x: number; y: number; w: number; h: number }, d: number) => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });

let captured = '';

async function sensitiveCapture(ext: ExtFixture): Promise<string> {
  if (captured) return captured;
  await setSettings(ext.sw, { afterCapture: 'library', defaultFormat: 'png', pdf: { pageSize: 'image', marginPt: 0 } });
  const { page, tabId } = await openFixture(ext, 'redact.html');
  const s = await captureAndWait(ext, tabId, 'visible');
  expect(s.phase, s.message).toBe('done');
  await page.close();
  captured = s.itemIds![0];
  return captured;
}

async function annotate(page: Page) {
  await page.keyboard.press('d');
  await dragDoc(page, [[SECRET.x, SECRET.y], [SECRET.x + SECRET.w, SECRET.y + SECRET.h]]);
  await page.keyboard.press('b');
  await dragDoc(page, [[CARD.x - 10, CARD.y - 10], [CARD.x + CARD.w, CARD.y + CARD.h + 10]]);
  await page.keyboard.press('x');
  await dragDoc(page, [[SECRET2.x, SECRET2.y], [SECRET2.x + SECRET2.w, SECRET2.y + SECRET2.h]]);
  await page.keyboard.press('a');
  await dragDoc(page, [[700, 400], [900, 520]]);
  await page.keyboard.press('r');
  await dragDoc(page, [[100, 420], [300, 560]]);
  await page.keyboard.press('o');
  await dragDoc(page, [[350, 420], [500, 560]]);
  await page.keyboard.press('t');
  await clickDoc(page, 100, 650);
  await page.keyboard.type('Hello FrameShot');
  await page.keyboard.press('Escape');
  await page.keyboard.press('n');
  await clickDoc(page, 600, 650);
  await page.keyboard.press('p');
  await dragDoc(page, [[900, 600], [1000, 650], [1100, 600]]);
  await page.keyboard.press('h');
  await dragDoc(page, [[100, 740], [400, 740]]);
  await page.keyboard.press('s');
  await clickDoc(page, 1150, 450);
  await page.keyboard.press('l');
  await dragDoc(page, [[1000, 700], [1200, 760]]);
  await page.keyboard.press('v');
}

test.beforeEach(async ({ ext }) => {
  await setSettings(ext.sw, { afterCapture: 'library', defaultFormat: 'png', pdf: { pageSize: 'image', marginPt: 0 } });
});

test('every annotation tool creates editable objects; undo/redo works', async ({ ext }) => {
  const id = await sensitiveCapture(ext);
  const page = await openEditor(ext, id);
  await annotate(page);
  const st = await editorState(page);
  expect(st.objects.map((o) => o.type).sort()).toEqual(
    ['arrow', 'blur', 'ellipse', 'highlighter', 'line', 'marker', 'pen', 'pixelate', 'rect', 'redact', 'symbol', 'text'].sort(),
  );
  await page.keyboard.press('Control+z');
  expect((await editorState(page)).objects).toHaveLength(11);
  await page.keyboard.press('Control+Shift+z');
  expect((await editorState(page)).objects).toHaveLength(12);

  // Select the rectangle, move it with the keyboard, duplicate, delete.
  await clickDoc(page, 100, 490);
  await page.keyboard.press('Control+d');
  expect((await editorState(page)).objects).toHaveLength(13);
  await page.keyboard.press('Delete');
  expect((await editorState(page)).objects).toHaveLength(12);
  // Layer panel lists every object.
  await expect(page.getByRole('list', { name: 'Layers' }).getByRole('listitem')).toHaveCount(12);
  await page.close();
});

test('PNG export flattens redaction, blur and pixelation into the pixels', async ({ ext }) => {
  const id = await sensitiveCapture(ext);
  const page = await openEditor(ext, id);
  await annotate(page);
  const before = await lastDownloadId(ext);
  await page.getByTestId('download-default').click();
  const dl = await nextDownload(ext, before);
  expect(dl.bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  await expect(page.getByText(/^Saved /)).toBeVisible();

  const { width, height, regions } = await imageStats(page, dl.bytes, [inset(SECRET, 1), inset(CARD, 4), inset(SECRET2, 1), { x: 795, y: 455, w: 10, h: 10 }]);
  expect(width).toBe(1280);
  expect(height).toBe(800);
  const [redacted, blurred, pixelated, arrow] = regions;
  // Redaction: every pixel is exactly the redaction color — no original stripes remain.
  expect(redacted.unique).toBe(1);
  expect(redacted.max).toEqual([0, 0, 0]);
  // Blur: the black-on-white text is gone (no near-black or pure-white pixels; low local contrast).
  expect(blurred.min[0]).toBeGreaterThan(70);
  expect(blurred.edge).toBeLessThan(8);
  // Pixelation: 3px stripes replaced by flat blocks (very few horizontal transitions).
  expect(pixelated.edge).toBeLessThan(15);
  // Annotation drawn on top (red arrow through its midpoint).
  expect(arrow.max[0]).toBeGreaterThan(200);
  expect(arrow.min[1]).toBeLessThan(110);

  // Sanity check: the stored original still has the stripes (non-destructive editing).
  const orig = await page.evaluate(async (itemId) => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('frameora');
      r.onsuccess = () => res(r.result);
    });
    const blob: Blob = await new Promise((res) => {
      const r = db.transaction('blobs').objectStore('blobs').get(`${itemId}:original`);
      r.onsuccess = () => res(r.result);
    });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, id);
  const origStats = await imageStats(page, Buffer.from(orig), [inset(SECRET, 1)]);
  expect(origStats.regions[0].unique).toBeGreaterThan(1);
  expect(origStats.regions[0].edge).toBeGreaterThan(100);
  await page.close();
});

test('JPEG, WebP and PDF exports are valid and keep redactions', async ({ ext }) => {
  const id = await sensitiveCapture(ext);
  const page = await openEditor(ext, id);
  await page.keyboard.press('d');
  await dragDoc(page, [[SECRET.x, SECRET.y], [SECRET.x + SECRET.w, SECRET.y + SECRET.h]]);

  for (const [label, magic] of [
    ['Download JPEG', 'jpeg'],
    ['Download WEBP', 'webp'],
    ['Download PDF', 'pdf'],
  ] as const) {
    const before = await lastDownloadId(ext);
    await page.getByRole('button', { name: 'More export options' }).click();
    await page.getByRole('menuitem', { name: label }).click();
    const dl = await nextDownload(ext, before);
    if (magic === 'jpeg') {
      expect([...dl.bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
      const { width, regions } = await imageStats(page, dl.bytes, [inset(SECRET, 4)]);
      expect(width).toBe(1280);
      expect(Math.max(...regions[0].max)).toBeLessThan(24); // lossy, but solid black
    } else if (magic === 'webp') {
      expect(dl.bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
      expect(dl.bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
      const { regions } = await imageStats(page, dl.bytes, [inset(SECRET, 4)]);
      expect(Math.max(...regions[0].max)).toBeLessThan(24);
    } else {
      expect(dl.bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(dl.bytes.subarray(-6).toString('latin1')).toContain('%%EOF');
      const images = extractPdfImages(dl.bytes);
      expect(images).toHaveLength(1);
      const img = images[0];
      expect([img.width, img.height]).toEqual([1280, 800]);
      // Lossless PDF: redacted pixels are exactly black.
      for (const [x, y] of [[50, 50], [300, 140], [550, 230]]) {
        const i = (y * img.width + x) * 3;
        expect([img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]]).toEqual([0, 0, 0]);
      }
      // And non-redacted content survived (white background at 600,280).
      const j = (280 * img.width + 600) * 3;
      expect([img.rgb[j], img.rgb[j + 1], img.rgb[j + 2]]).toEqual([255, 255, 255]);
    }
  }
  await page.close();
});

test('copy to clipboard puts the flattened PNG on the clipboard', async ({ ext }) => {
  const id = await sensitiveCapture(ext);
  await ext.context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await openEditor(ext, id);
  await page.keyboard.press('d');
  await dragDoc(page, [[SECRET.x, SECRET.y], [SECRET.x + SECRET.w, SECRET.y + SECRET.h]]);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByText('Copied to clipboard.')).toBeVisible();
  const bytes = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const blob = await items[0].getType('image/png');
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const { width, height, regions } = await imageStats(page, Buffer.from(bytes), [inset(SECRET, 1)]);
  expect([width, height]).toEqual([1280, 800]);
  expect(regions[0].max).toEqual([0, 0, 0]);
  await page.close();
});

test('crop, rotate, flip and resize produce the expected output', async ({ ext }) => {
  const { page: fx, tabId } = await openFixture(ext, 'long.html');
  const s = await captureAndWait(ext, tabId, 'visible');
  await fx.close();
  const page = await openEditor(ext, s.itemIds![0]);
  await page.keyboard.press('c');
  await dragDoc(page, [[0, 0], [100, 100]]);
  await dragDoc(page, [[1280, 800], [600, 500]]);
  await page.getByTestId('apply-crop').click();
  expect((await editorState(page)).output).toEqual({ width: 500, height: 400 });

  await page.getByRole('button', { name: 'Rotate right' }).click();
  expect((await editorState(page)).output).toEqual({ width: 400, height: 500 });

  await page.getByRole('button', { name: 'Flip horizontally' }).click();
  await page.getByRole('button', { name: 'Flip horizontally' }).click();

  await page.getByRole('button', { name: 'Resize image' }).click();
  await page.getByLabel('Width (px)').fill('200');
  await expect(page.getByLabel('Height (px)')).toHaveValue('250');
  await page.getByRole('button', { name: 'Resize', exact: true }).click();
  expect((await editorState(page)).output).toEqual({ width: 200, height: 250 });

  const before = await lastDownloadId(ext);
  await page.getByTestId('download-default').click();
  const dl = await nextDownload(ext, before);
  // Rotated clockwise: output column x maps to crop row (H-1-x). Left edge shows
  // the crop's bottom (band 4, y≈489), right edge its top (band 0, y≈109).
  const { width, height, regions } = await imageStats(page, dl.bytes, [{ x: 4, y: 125, w: 2, h: 2 }, { x: 194, y: 125, w: 2, h: 2 }]);
  expect([width, height]).toEqual([200, 250]);
  const band = (i: number) => [((i * 37) % 200) + 20, ((i * 61) % 200) + 20, ((i * 23) % 200) + 20];
  const close = (a: number[], b: number[]) => a.every((v, k) => Math.abs(v - b[k]) <= 8);
  expect(close(regions[0].mean, band(4))).toBe(true);
  expect(close(regions[1].mean, band(0))).toBe(true);
  await page.close();
});

test('edits autosave and reopen; library thumbnail reflects edits', async ({ ext }) => {
  const id = await sensitiveCapture(ext);
  const page = await openEditor(ext, id);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.press('r');
  await dragDoc(page, [[100, 420], [300, 560]]);
  await page.keyboard.press('a');
  await dragDoc(page, [[700, 400], [900, 520]]);
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __frameshotEditor?: unknown }).__frameshotEditor);
  const st = await editorState(page);
  expect(st.objects.map((o) => o.type)).toEqual(['rect', 'arrow']);
  const item = await page.evaluate(async (itemId) => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('frameora');
      r.onsuccess = () => res(r.result);
    });
    return new Promise<{ hasEdits: boolean }>((res) => {
      const r = db.transaction('items').objectStore('items').get(itemId);
      r.onsuccess = () => res(r.result);
    });
  }, id);
  expect(item.hasEdits).toBe(true);
  await page.close();
});

test('text can be edited by double-clicking it', async ({ ext }) => {
  const id = await sensitiveCapture(ext);
  const page = await openEditor(ext, id);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.press('t');
  await clickDoc(page, 200, 500);
  await page.keyboard.type('First');
  await page.keyboard.press('Escape');
  await page.keyboard.press('v');
  await page.waitForTimeout(100);
  const box = await page.evaluate(() => {
    const s = (window as unknown as { __frameshotEditor: { getState(): any } }).__frameshotEditor.getState();
    const t = s.doc.objects.find((o: { type: string }) => o.type === 'text');
    return { x: t.x + 10, y: t.y + 10, text: t.text };
  });
  expect(box.text).toBe('First');
  const p = await page.evaluate(([x, y]) => {
    const s = (window as unknown as { __frameshotEditor: { getState(): any } }).__frameshotEditor.getState();
    const r = document.querySelector('[data-testid=editor-canvas]')!.getBoundingClientRect();
    return { x: r.left + x * s.view.zoom + s.view.panX, y: r.top + y * s.view.zoom + s.view.panY };
  }, [box.x, box.y] as const);
  await page.mouse.dblclick(p.x, p.y);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Second line');
  await page.keyboard.press('Escape');
  const text = await page.evaluate(() => {
    const s = (window as unknown as { __frameshotEditor: { getState(): any } }).__frameshotEditor.getState();
    return s.doc.objects.find((o: { type: string }) => o.type === 'text')?.text;
  });
  expect(text).toBe('Second line');
  await page.close();
});
