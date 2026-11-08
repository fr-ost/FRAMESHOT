/**
 * UI performance harness. Run after `npm run build:e2e`:
 *
 *   npm run perf:ui -- [label]
 *
 * Seeds a 240-item library with real thumbnails, then measures: library load
 * time, idle main-thread time over 5 s, frame intervals while wheel-scrolling,
 * interaction latency of common actions (Event Timing, the data behind Chrome's
 * INP metric) and popup open time. Headless Chromium renders in software, so
 * absolute numbers are pessimistic; compare runs on the same machine.
 * PERF_CSS="..." injects CSS, to measure what a single effect costs.
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.output/chrome-mv3-e2e');
const label = process.argv[2] ?? 'run';
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
await sw.evaluate(async () => {
  const cur = (await chrome.storage.local.get('frameora.settings'))['frameora.settings'] ?? {};
  await chrome.storage.local.set({ 'frameora.settings': { ...cur, theme: 'dark', library: { view: 'grid' }, sounds: { enabled: false, volume: 0.5 } } });
  await chrome.storage.local.set({ 'frameshot.review': { installedAt: Date.now(), successes: 0, asks: 0, lastAskedAt: 0, snoozeUntil: 0, done: true } });
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await ctx.newPage();
await page.goto(`chrome-extension://${id}/studio.html#/__test`);
await wait(500);
// Seed 240 items with real thumbnails.
await page.evaluate(async (n) => {
  const db = await new Promise((res) => { const r = indexedDB.open('frameora'); r.onsuccess = () => res(r.result); });
  const blobs = [];
  for (let k = 0; k < 12; k++) {
    const c = new OffscreenCanvas(480, 300); const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 480, 300); g.addColorStop(0, `hsl(${k * 30},70%,60%)`); g.addColorStop(1, `hsl(${k * 30 + 60},70%,40%)`);
    x.fillStyle = g; x.fillRect(0, 0, 480, 300);
    x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) x.fillRect(20, 20 + i * 30, 200 + (i * 37) % 220, 14);
    blobs.push(await c.convertToBlob({ type: 'image/webp', quality: 0.8 }));
  }
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const id = `perf-${i}`;
    tx.objectStore('items').put({ id, name: `Captured page number ${i} — a reasonably long title`, createdAt: now - i * 60000, updatedAt: now - i * 60000, kind: 'capture', mode: 'full', source: { url: `https://site${i % 7}.example.com/p/${i}`, title: `Page ${i}`, domain: `site${i % 7}.example.com` }, width: 1280, height: 800 + (i % 5) * 400, byteSize: 200000 + i, mimeType: 'image/png', favorite: i % 9 === 0, collectionId: null, tags: [], hasEdits: i % 4 === 0, warnings: [] });
    tx.objectStore('blobs').put(blobs[i % 12], `${id}:original`);
    tx.objectStore('blobs').put(blobs[i % 12], `${id}:thumb`);
  }
  await new Promise((r) => (tx.oncomplete = r));
  db.close();
}, 240);

const CSS = process.env.PERF_CSS || '';
if (CSS) await page.addInitScript((css) => { const add = () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }; if (document.head) add(); else document.addEventListener('DOMContentLoaded', add); }, CSS);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

// 1. Load
const t0 = Date.now();
await page.goto(`chrome-extension://${id}/studio.html#/`);
await page.reload();
await page.getByTestId('library-card').nth(59).waitFor({ state: 'attached' });
await page.waitForFunction(() => [...document.querySelectorAll('[data-testid=library-card] img')].slice(0, 12).every((i) => i.complete && i.naturalWidth));
const loadMs = Date.now() - t0;
await wait(1200);

await page.evaluate(() => {
  window.__ev = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__ev.push({ name: e.name, d: e.duration, id: e.interactionId }); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  window.__lt = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt += e.duration; }).observe({ type: 'longtask', buffered: false });
});

// 2. Idle cost (5 s)
let m0 = await metrics(); await wait(5000); let m1 = await metrics();
const idle = { taskMs: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000), styleMs: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000), layoutMs: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000) };

// 3. Scroll with the wheel while recording frame intervals.
await page.mouse.move(800, 500);
await page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = (t) => { window.__frames.push(t - last); last = t; if (!window.__stopFrames) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
m0 = await metrics();
for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, 260); await wait(50); }
for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, -400); await wait(50); }
m1 = await metrics();
const frames = await page.evaluate(() => { window.__stopFrames = true; return window.__frames.slice(2); });
frames.sort((a, b) => a - b);
const pct = (p) => Math.round(frames[Math.floor(frames.length * p)] * 10) / 10;
const scroll = { frames: frames.length, p50: pct(0.5), p95: pct(0.95), max: Math.round(frames[frames.length - 1]), over33: frames.filter((f) => f > 33.4).length, taskMs: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000), cards: await page.getByTestId('library-card').count() };
await page.getByTestId('library-scroll').evaluate((el) => el.scrollTo(0, 0));
await wait(600);

// 4. Interactions
const inter = {};
async function measure(name, fn) {
  await page.evaluate(() => (window.__ev = []));
  await fn();
  await wait(700);
  const ev = await page.evaluate(() => window.__ev);
  inter[name] = Math.round(Math.max(0, ...ev.map((e) => e.d)));
}
const card = page.getByTestId('library-card').nth(2);
await measure('selectCard', async () => { await card.hover(); await card.getByRole('button', { name: /^Select / }).click(); });
await measure('selectAll', () => page.keyboard.press('Control+a'));
await measure('clearSel', () => page.keyboard.press('Escape'));
await measure('listView', () => page.getByRole('button', { name: 'List view' }).click());
await measure('gridView', () => page.getByRole('button', { name: 'Grid view' }).click());
await measure('search', async () => { await page.getByPlaceholder(/Search/).click(); await page.keyboard.type('number 1', { delay: 60 }); });
await measure('clearSearch', async () => { await page.getByPlaceholder(/Search/).fill(''); });
await page.locator('body').click({ position: { x: 1000, y: 20 } });
await measure('openMenu', async () => { await page.getByTestId('library-card').first().hover(); await page.getByRole('button', { name: /^Actions for / }).first().click(); });
await page.keyboard.press('Escape');
await measure('favorites', () => page.getByRole('button', { name: /^Favorites/ }).click());
await measure('allCaptures', () => page.getByRole('button', { name: /^All captures/ }).click());
await measure('openSettings', async () => { await page.getByRole('button', { name: 'Settings' }).first().click(); await page.waitForURL(/settings/); });

// 5. Popup open
const popup = await ctx.newPage();
const tp = Date.now();
await popup.goto(`chrome-extension://${id}/popup.html`);
await popup.getByTestId('capture-visible').waitFor();
const popupMs = Date.now() - tp;
const lt = await page.evaluate(() => Math.round(window.__lt));
console.log(JSON.stringify({ label, loadMs, popupMs, idle, scroll, inter, longTaskMsDuringInteractions: lt }));
await ctx.close();
