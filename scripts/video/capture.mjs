/**
 * Showcase video, step 1: captures the real extension UI, step by step, into
 * .output/video/raw/ (2× for sharp downscaling). Uses the E2E build only so
 * captures can start without a toolbar click; its UI is the production UI.
 * The page being captured is the fictional demo in store-assets/demo/, served
 * as app.example.com (a reserved documentation domain).
 *
 *   npm run build:e2e && node scripts/video/capture.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXT = path.join(ROOT, '.output/chrome-mv3-e2e');
const ASSETS = path.join(ROOT, 'store-assets');
const RAW = path.join(ROOT, '.output/video/raw');
const DEMO_HOST = 'app.example.com';
if (!fs.existsSync(path.join(EXT, 'manifest.json'))) throw new Error('E2E build missing. Run `npm run build:e2e` first.');
fs.mkdirSync(RAW, { recursive: true });

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const target = path.join(ASSETS, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(ASSETS) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return res.writeHead(404).end();
  const type = { '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(target)] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  fs.createReadStream(target).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const DEMO_URL = `http://${DEMO_HOST}:${PORT}/demo/board.html`;

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  args: [
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    `--host-resolver-rules=MAP ${DEMO_HOST} 127.0.0.1`,
    '--no-proxy-server',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--hide-scrollbars',
  ],
});
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const extId = new URL(sw.url()).host;
const studio = (route) => `chrome-extension://${extId}/studio.html#${route}`;
const settings = (patch) =>
  sw.evaluate(async (p) => {
    const cur = (await chrome.storage.local.get('frameora.settings'))['frameora.settings'] ?? {};
    await chrome.storage.local.set({ 'frameora.settings': { ...cur, ...p } });
  }, patch);
const REC = { surface: 'browser', systemAudio: true, mic: true, micDeviceId: '', camera: true, cameraDeviceId: '', cameraPosition: 'bottom-right', cameraSize: 'medium', format: 'mp4', quality: '1080p', fps: 30, countdown: 3 };
await settings({ theme: 'light', afterCapture: 'library', sounds: { enabled: false, volume: 0.6 }, library: { view: 'grid' }, recorder: REC });
await sw.evaluate(() => chrome.storage.local.set({ 'frameshot.review': { installedAt: Date.now(), successes: 0, asks: 0, lastAskedAt: 0, snoozeUntil: 0, done: true } }));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => sw.evaluate(() => globalThis.__frameshotTest.status());
async function capture(page, tabId, mode) {
  await page.bringToFront();
  await wait(250);
  const since = (await status()).updatedAt;
  await sw.evaluate(([id, m]) => globalThis.__frameshotTest.start(id, m), [tabId, mode]);
  for (let i = 0; i < 300; i++) {
    const s = await status();
    if (s.updatedAt > since && ['done', 'error', 'cancelled'].includes(s.phase)) {
      if (s.phase !== 'done') throw new Error(`capture failed: ${s.message}`);
      return s.itemIds[0];
    }
    await wait(200);
  }
  throw new Error('capture timed out');
}
async function shot(page, name, { keepPointer = false } = {}) {
  if (!keepPointer) {
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.mouse.move(1279, 799);
  }
  await wait(600);
  await page.screenshot({ path: path.join(RAW, name) });
  console.log('captured', name);
}

// ── The demo page: full length, and the selection tools on it ──
const demo = await context.newPage();
await demo.goto(DEMO_URL);
await demo.evaluate(() => document.fonts.ready);
await wait(400);
const tabId = await sw.evaluate(async (u) => (await chrome.tabs.query({})).find((t) => t.url === u).id, DEMO_URL);
await demo.screenshot({ path: path.join(RAW, 'page-full.png'), fullPage: true });
console.log('captured page-full.png');

const box = (sel) => demo.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
// Selected area: the real overlay, mid-drag.
{
  await demo.bringToFront();
  const since = (await status()).updatedAt;
  await sw.evaluate(([id]) => globalThis.__frameshotTest.start(id, 'area'), [tabId]);
  await wait(900);
  const k = await box('.kpi');
  await demo.mouse.move(k.x - 14, k.y - 14);
  await demo.mouse.down();
  const end = await box('.grid2 > .card');
  await demo.mouse.move(end.x + end.width * 0.62, end.y - 24, { steps: 12 });
  await wait(500);
  await shot(demo, 'area.png', { keepPointer: true });
  await demo.mouse.up();
  await wait(400);
  await demo.keyboard.press('Escape');
  for (let i = 0; i < 50; i++) {
    const s = await status();
    if (s.updatedAt > since && ['done', 'error', 'cancelled'].includes(s.phase)) break;
    await wait(150);
  }
  await wait(600);
}
// Element: the hover highlight on a card.
{
  await demo.bringToFront();
  const since = (await status()).updatedAt;
  await sw.evaluate(([id]) => globalThis.__frameshotTest.start(id, 'element'), [tabId]);
  await wait(900);
  const c = await box('.grid2 > .card');
  await demo.mouse.move(c.x + 40, c.y + 60, { steps: 6 });
  await demo.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 6 });
  await wait(600);
  await shot(demo, 'element.png', { keepPointer: true });
  await demo.keyboard.press('Escape');
  for (let i = 0; i < 50; i++) {
    const s = await status();
    if (s.updatedAt > since && ['done', 'error', 'cancelled'].includes(s.phase)) break;
    await wait(150);
  }
  await wait(600);
}

// ── Captures used by the editor scenes (as in the store screenshots) ──
await demo.setViewportSize({ width: 1040, height: 650 });
await demo.evaluate(() => document.getElementById('billing').scrollIntoView({ block: 'center' }));
await wait(300);
const formRects = await demo.evaluate(() => ['email', 'card'].map((id) => document.getElementById(id).getBoundingClientRect().toJSON()));
const billingId = await capture(demo, tabId, 'visible');
await demo.setViewportSize({ width: 1280, height: 800 });
await demo.evaluate(() => document.querySelector('.timeline').scrollIntoView({ block: 'start' }));
await wait(300);
await capture(demo, tabId, 'visible');
await demo.evaluate(() => document.querySelectorAll('.section')[0].scrollIntoView({ block: 'start' }));
await wait(300);
await capture(demo, tabId, 'visible');
await demo.evaluate(() => window.scrollTo(0, 0));
await wait(300);
const heroId = await capture(demo, tabId, 'visible');
const demoPng = await demo.screenshot({ type: 'png' });
const L = await demo.evaluate(() => {
  const doc = (b) => ({ x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height });
  const h1 = document.querySelector('h1');
  const node = [...h1.childNodes].find((n) => n.nodeType === 3 && n.textContent.includes('September'));
  const at = node.textContent.indexOf('September 30');
  const range = document.createRange();
  range.setStart(node, at);
  range.setEnd(node, at + 'September 30'.length);
  const leadRange = document.createRange();
  leadRange.selectNodeContents(document.querySelector('.lead'));
  return {
    date: doc(range.getBoundingClientRect()),
    leadLines: [...leadRange.getClientRects()].map(doc),
    kpis: [...document.querySelectorAll('.kpi')].map((e) => doc(e.getBoundingClientRect())),
    cards: [...document.querySelectorAll('.grid2 > .card')].map((e) => doc(e.getBoundingClientRect())),
    roadmap: doc(document.querySelector('.timeline .card').getBoundingClientRect()),
  };
});
const fullId = await capture(demo, tabId, 'full');

async function openEditor(id) {
  const page = await context.newPage();
  await page.goto(studio(`/edit/${encodeURIComponent(id)}`));
  await page.waitForSelector('[data-testid=editor-canvas]');
  await page.waitForFunction(() => !!window.__frameshotEditor);
  await wait(500);
  return page;
}
const toScreen = (page, x, y) =>
  page.evaluate(([dx, dy]) => {
    const s = window.__frameshotEditor.getState();
    const r = document.querySelector('[data-testid=editor-canvas]').getBoundingClientRect();
    return { x: r.left + dx * s.view.zoom + s.view.panX, y: r.top + dy * s.view.zoom + s.view.panY };
  }, [x, y]);
async function drag(page, a, b) {
  const p = await toScreen(page, ...a);
  const q = await toScreen(page, ...b);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 10 });
  await page.mouse.up();
}
async function click(page, x, y) {
  const p = await toScreen(page, x, y);
  await page.mouse.click(p.x, p.y);
}
async function deselect(page) {
  await page.keyboard.press('v');
  await click(page, 1260, 2000);
  await page.keyboard.press('Escape');
}

// Editor, one step at a time.
{
  const page = await openEditor(fullId);
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid=editor-canvas]').getBoundingClientRect();
    const zoom = 0.62;
    window.__frameshotEditor.setView({ zoom, panX: (el.width - 1280 * zoom) / 2, panY: 18 });
  });
  await wait(300);
  await shot(page, 'ed-0.png');
  const { date, leadLines, kpis, cards, roadmap } = L;
  await page.keyboard.press('h');
  const hy = date.y + date.h * 0.6;
  await drag(page, [date.x - 4, hy], [date.x + date.w + 4, hy]);
  await deselect(page);
  await shot(page, 'ed-1.png');
  const k = kpis[0];
  await page.keyboard.press('r');
  await drag(page, [k.x - 8, k.y - 8], [k.x + k.w + 8, k.y + k.h + 8]);
  await deselect(page);
  await shot(page, 'ed-2.png');
  const noteX = Math.max(...leadLines.map((l) => l.x + l.w)) + 70;
  const noteY = k.y - 50;
  await page.keyboard.press('t');
  await click(page, noteX, noteY);
  await page.keyboard.type('New record this week!');
  await page.keyboard.press('Escape');
  await page.keyboard.press('a');
  await drag(page, [noteX - 14, noteY + 6], [k.x + k.w - 26, k.y - 14]);
  await deselect(page);
  await shot(page, 'ed-3.png');
  await page.keyboard.press('n');
  for (const c of [cards[0], cards[1], roadmap]) await click(page, c.x + 2, c.y + 2);
  await deselect(page);
  await shot(page, 'ed-4.png');
  await wait(1500);
  await page.close();
}

// Redaction, one step at a time.
{
  const page = await openEditor(billingId);
  await shot(page, 'rd-0.png');
  const [email, card] = formRects;
  await page.keyboard.press('b');
  await drag(page, [email.x - 4, email.y - 4], [email.x + email.width + 4, email.y + email.height + 4]);
  await shot(page, 'rd-1.png');
  await page.keyboard.press('d');
  await drag(page, [card.x - 2, card.y - 2], [card.x + card.width + 2, card.y + card.height + 2]);
  await shot(page, 'rd-2.png');
  await wait(1500);
  await page.close();
}

// Composer: three looks.
{
  const page = await context.newPage();
  await page.goto(studio(`/compose/${encodeURIComponent(heroId)}`));
  await page.waitForSelector('[aria-label="Composition preview"]');
  await page.getByRole('radio', { name: 'Gradient', exact: true }).click();
  const presets = page.getByRole('radiogroup', { name: 'Gradient presets' }).getByRole('radio');
  const top = () =>
    page.getByRole('radio', { name: 'Gradient', exact: true }).evaluate((el) => {
      for (let n = el.parentElement; n; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) n.scrollTop = 0;
    });
  const n = await presets.count();
  const looks = [
    [Math.min(2, n - 1), 'Light'],
    [Math.min(5, n - 1), 'Dark'],
    [Math.min(0, n - 1), 'Light'],
  ];
  for (const [i, [preset, frame]] of looks.entries()) {
    await presets.nth(preset).click();
    await page.getByRole('radiogroup', { name: 'Window frame' }).getByRole('radio', { name: frame }).click();
    await top();
    await shot(page, `cp-${i + 1}.png`);
  }
  await page.getByRole('button', { name: 'Save to library' }).click();
  await page.getByText('Composition saved to your library.').waitFor();
  await page.close();
}

// Recorder: before starting, the countdown, recording, then the player and Export as GIF.
const player = await context.newPage();
{
  const page = player;
  await page.addInitScript((b64) => {
    const md = navigator.mediaDevices;
    if (!md) return;
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    md.getDisplayMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 800;
      const x = c.getContext('2d');
      let t = 0;
      const draw = () => {
        t += 1;
        x.drawImage(img, 0, 0, 1280, 800);
        const px = 420 + Math.sin(t / 40) * 140;
        const py = 330 + Math.cos(t / 50) * 60;
        x.fillStyle = '#111';
        x.strokeStyle = '#fff';
        x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px, py + 22);
        x.lineTo(px + 6, py + 17);
        x.lineTo(px + 11, py + 27);
        x.lineTo(px + 15, py + 25);
        x.lineTo(px + 10, py + 15);
        x.lineTo(px + 17, py + 15);
        x.closePath();
        x.fill();
        x.stroke();
        requestAnimationFrame(draw);
      };
      await img.decode().catch(() => {});
      draw();
      const stream = c.captureStream(30);
      const ac = new AudioContext();
      const dest = ac.createMediaStreamDestination();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      g.gain.value = 0.25;
      osc.connect(g).connect(dest);
      osc.start();
      stream.addTrack(dest.stream.getAudioTracks()[0]);
      return stream;
    };
    const original = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => {
      if (!c || !c.video) return original(c);
      const cv = document.createElement('canvas');
      cv.width = 480;
      cv.height = 480;
      const x = cv.getContext('2d');
      let t = 0;
      const draw = () => {
        t += 1;
        const g = x.createLinearGradient(0, 0, 480, 480);
        g.addColorStop(0, '#c7d2fe');
        g.addColorStop(1, '#fbcfe8');
        x.fillStyle = g;
        x.fillRect(0, 0, 480, 480);
        const bob = Math.sin(t / 30) * 4;
        x.fillStyle = '#4338ca';
        x.beginPath();
        x.ellipse(240, 470 + bob, 170, 130, 0, Math.PI, 0);
        x.fill();
        x.fillStyle = '#f1c7a8';
        x.beginPath();
        x.arc(240, 205 + bob, 92, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = '#3f2a1d';
        x.beginPath();
        x.arc(240, 175 + bob, 96, Math.PI * 1.05, Math.PI * 1.95);
        x.fill();
        x.fillStyle = '#2b1d14';
        x.beginPath();
        x.arc(208, 212 + bob, 7, 0, Math.PI * 2);
        x.arc(272, 212 + bob, 7, 0, Math.PI * 2);
        x.fill();
        x.strokeStyle = '#a3543b';
        x.lineWidth = 6;
        x.lineCap = 'round';
        x.beginPath();
        x.arc(240, 238 + bob, 30, 0.2 * Math.PI, 0.8 * Math.PI);
        x.stroke();
        requestAnimationFrame(draw);
      };
      draw();
      return cv.captureStream(30);
    };
  }, demoPng.toString('base64'));
  await page.goto(studio('/record'));
  await page.getByTestId('record-start').waitFor();
  await wait(1800);
  await shot(page, 'rec-setup.png');
  await page.getByTestId('record-start').click();
  await wait(700);
  await shot(page, 'rec-count.png', { keepPointer: true });
  await page.getByTestId('record-status').filter({ hasText: /^Recording$/ }).waitFor({ timeout: 20000 });
  await wait(4300);
  await shot(page, 'rec-live.png');
  await wait(3600);
  await page.getByTestId('record-stop').click();
  await page.waitForURL(/#\/play\//, { timeout: 30000 });
  await page.getByTestId('player-video').waitFor();
  await wait(1800);
  await shot(page, 'player.png');
}
{
  const page = player;
  await settings({ theme: 'dark' });
  await wait(800);
  await page.getByTestId('player-gif').click();
  await page.getByRole('dialog', { name: 'Export as GIF' }).waitFor();
  await wait(1500);
  const setRange = (id, v) =>
    page.getByTestId(id).evaluate((el, val) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(val));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, v);
  await setRange('gif-start', 1);
  await setRange('gif-end', 5);
  await wait(1500);
  await shot(page, 'gif.png');
  await page.keyboard.press('Escape');
  await page.close();
}

// Library (dark, then light), settings and the shortcuts sheet.
{
  const page = await context.newPage();
  await page.goto(studio('/'));
  await page.getByTestId('library-card').nth(5).waitFor();
  await wait(1200);
  const fav = page.locator(`[data-testid=library-card][data-id="${fullId}"]`);
  await fav.hover();
  await fav.getByRole('button', { name: 'Add to favorites' }).click();
  await wait(1200);
  await shot(page, 'lib-dark.png');
  await settings({ theme: 'light' });
  await wait(1200);
  await shot(page, 'lib-light.png');
  await page.keyboard.press('?');
  await wait(900);
  await shot(page, 'shortcuts.png');
  await page.keyboard.press('Escape');
  await page.close();
}
{
  const page = await context.newPage();
  await page.goto(studio('/settings'));
  await wait(1500);
  await shot(page, 'settings.png');
  await page.close();
}
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 360, height: 560 });
  await page.goto(`chrome-extension://${extId}/popup.html`);
  await page.getByTestId('capture-full').waitFor();
  await wait(1500);
  await shot(page, 'popup.png');
  await page.close();
}

await context.close();
server.close();
console.log('video captures done');
