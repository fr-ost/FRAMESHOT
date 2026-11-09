/**
 * Showcase video, step 3: renders scripts/video/stage.html frame by frame and
 * encodes the MP4 with the soundtrack.
 *
 *   node scripts/video/render.mjs                     → .output/video/frameshot-showcase.mp4
 *   node scripts/video/render.mjs --preview 3,10.6,35 → stills in .output/video/preview/
 *   node scripts/video/render.mjs --from 30 --to 40   → only that part (no audio), for checks
 *
 * Every frame is a pure function of time (window.seek(t)), so the frames can be
 * rendered in parallel and in any order.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Icons from 'lucide-react';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, '.output/video');
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/video/timeline.json'), 'utf8'));
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const FPS = TL.fps;
const WORKERS = Number(arg('workers', 4));

// Icons used by the stage, rendered once.
const ICON_NAMES = ['ArrowLeft', 'ArrowRight', 'RotateCw', 'Lock', 'Puzzle', 'Check', 'Timer', 'TriangleAlert', 'Film', 'Monitor', 'Mic', 'Camera', 'Sparkles', 'Pause', 'ShieldCheck', 'Download', 'Search', 'FolderOpen', 'Copy', 'CloudOff', 'UserX', 'BadgeCheck', 'EyeOff', 'WifiOff', 'Gift'];
const ICONS = Object.fromEntries(ICON_NAMES.map((n) => {
  if (!Icons[n]) throw new Error(`Unknown icon ${n}`);
  return [n, renderToStaticMarkup(createElement(Icons[n], { size: 24, strokeWidth: 2.2 }))];
}));

const TYPES = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.join(ROOT, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const STAGE = `http://127.0.0.1:${server.address().port}/scripts/video/stage.html`;

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
async function openStage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('stage error:', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('stage console:', m.text()));
  await page.addInitScript((icons) => (window.ICONS = icons), ICONS);
  await page.goto(STAGE);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp };
}
async function frame({ page, cdp }, t) {
  await page.evaluate((tt) => window.seek(tt), t);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  return Buffer.from(data, 'base64');
}

const preview = arg('preview');
if (preview) {
  const dir = path.join(OUT, 'preview');
  fs.mkdirSync(dir, { recursive: true });
  const st = await openStage();
  for (const t of preview.split(',').map(Number)) {
    fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`), await frame(st, t));
    console.log('preview', t);
  }
  await browser.close();
  server.close();
  process.exit(0);
}

// ── Full render: split the frames between workers, one x264 segment each ──
const from = Number(arg('from', 0)), to = Number(arg('to', TL.duration));
const first = Math.round(from * FPS), last = Math.round(to * FPS);
const total = last - first;
const segDir = path.join(OUT, 'segments');
fs.rmSync(segDir, { recursive: true, force: true });
fs.mkdirSync(segDir, { recursive: true });
const chunk = Math.ceil(total / WORKERS);
const t0 = Date.now();
let done = 0;
function encoder(file) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-x264-params', 'aq-mode=3', '-g', String(FPS * 2), '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  return {
    write: (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res))),
    end: async () => { ff.stdin.end(); await closed; },
  };
}
const segments = [];
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const a = first + w * chunk, b = Math.min(last, a + chunk);
  if (a >= b) return;
  const file = path.join(segDir, `seg-${String(w).padStart(2, '0')}.mp4`);
  segments[w] = file;
  const st = await openStage();
  const enc = encoder(file);
  for (let f = a; f < b; f++) {
    await enc.write(await frame(st, f / FPS));
    if (++done % 150 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`${done}/${total} frames  ${(done / el).toFixed(1)} fps  ~${Math.round((total - done) / (done / el))} s left`);
    }
  }
  await enc.end();
  await st.page.close();
}));
await browser.close();
server.close();

const list = path.join(segDir, 'list.txt');
fs.writeFileSync(list, segments.filter(Boolean).map((f) => `file '${f}'`).join('\n'));
const run = (args) => new Promise((res, rej) => spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
const partial = from > 0 || to < TL.duration;
const outFile = arg('out', path.join(OUT, partial ? `part-${from}-${to}.mp4` : 'frameshot-showcase.mp4'));
// The narrated mix (scripts/video/voice.py) when there is one, else the music on its own.
const music = [path.join(OUT, 'mix.wav'), path.join(OUT, 'music.wav')].find((f) => fs.existsSync(f));
if (!partial && music) {
  console.log(`audio: ${path.relative(ROOT, music)}`);
  await run(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', music, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', outFile]);
} else {
  await run(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', outFile]);
}
console.log(`wrote ${path.relative(ROOT, outFile)} in ${Math.round((Date.now() - t0) / 1000)} s`);
