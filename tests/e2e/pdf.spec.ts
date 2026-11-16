/**
 * Full-page capture of a PDF open in Chrome's PDF viewer: the pages are
 * rendered from the PDF itself (pdf.js), stacked into one tall image.
 */
import { captureAndWait, columnRuns, expect, setSettings, tabIdFor, test } from './harness';

test('full page on a PDF renders every page into one image', async ({ ext }) => {
  await setSettings(ext.sw, { afterCapture: 'library' });
  const page = await ext.context.newPage();
  const url = `${ext.server}/three-pages.pdf`;
  await page.goto(url).catch(() => {});
  await page.bringToFront();
  await page.waitForTimeout(1500);
  const tabId = await tabIdFor(ext.sw, url);

  const status = await captureAndWait(ext, tabId, 'full');
  expect(status.phase).toBe('done');
  expect(status.warnings).toContain('Rendered from the PDF: 3 pages.');
  expect(status.itemIds).toHaveLength(1);

  // Three letter-size pages at 2× (1224 × 1584) with 24 px gaps.
  const id = status.itemIds![0];
  const col = await columnRuns(ext, id, 40);
  expect(col.width).toBe(1272);
  expect(col.height).toBe(24 + 3 * (1584 + 24));
  // Down the left margin of the pages: white page, grey gap, white page, grey gap, white page.
  const white = col.runs.filter((r) => r.r > 245 && r.g > 245 && r.b > 245 && r.length > 1000);
  expect(white).toHaveLength(3);

  // The renderer tab saved the capture and moved on to the library.
  const pdfTab = ext.context.pages().find((p) => p.url().includes('studio.html'));
  await expect.poll(() => pdfTab?.url() ?? '').not.toContain('#/pdf/');
  for (const p of ext.context.pages()) if (p.url().includes('studio.html#/') && !p.url().includes('__test')) await p.close();
  await page.close();
});
