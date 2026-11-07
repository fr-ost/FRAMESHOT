// Renders the Frameora SVG logo into the PNG icon sizes Chrome requires.
// Usage: node scripts/render-icons.mjs  (uses the locally installed Chromium)
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const big = await readFile(path.join(root, 'src/assets/logo.svg'), 'utf8');
const small = await readFile(path.join(root, 'src/assets/logo-small.svg'), 'utf8');
const outDir = path.join(root, 'public/icon');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const size of [16, 32, 48, 96, 128]) {
  const svg = size <= 32 ? small : big;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: path.join(outDir, `${size}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('icon', size);
}
// Store-listing promo icon (440x280 small tile is created separately in docs/store).
await browser.close();
