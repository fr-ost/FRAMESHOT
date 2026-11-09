/**
 * YouTube thumbnails for the showcase video (1280 × 720 JPEG, well under 2 MB),
 * built from the real UI captures in .output/video/raw (run scripts/video/capture.mjs first).
 *
 *   node scripts/video/thumbnails.mjs   → marketing/thumbnails/frameshot-thumb-{a,b,c}.jpg
 *
 * Three versions, for YouTube's "Test & compare". Big words are kept to a few,
 * so they read at phone size, and the bottom-right corner is left clear for the
 * video length badge.
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = path.join(ROOT, '.output/video/raw');
const OUT = path.join(ROOT, 'marketing/thumbnails');
const TMP = path.join(ROOT, '.output/video/thumbs-tmp');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const u = (p) => pathToFileURL(p).href;
const raw = (n) => u(path.join(RAW, `${n}.png`));
const LOGO = u(path.join(ROOT, 'src/assets/logo.svg'));
const FONT = u(path.join(ROOT, 'store-assets/promo/inter.woff2'));
const CURSOR = '<svg viewBox="0 0 24 34" width="54" height="76"><path d="M2.5 2.5v25.5l6.3-6 4.4 10.4 4.3-1.9-4.4-10.2h8.9z" fill="#0b0b14" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';

const base = (body, extraCss = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url('${FONT}') format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1280px;height:720px;overflow:hidden;position:relative;font-family:Inter,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;
background:radial-gradient(60% 75% at 8% 0%,rgba(99,102,241,.75),transparent 62%),radial-gradient(55% 80% at 100% 15%,rgba(217,70,239,.5),transparent 60%),radial-gradient(60% 70% at 55% 115%,rgba(14,165,233,.35),transparent 60%),#0a0a18}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.09) 1.4px,transparent 1.7px);background-size:30px 30px;-webkit-mask:linear-gradient(115deg,#000 10%,transparent 60%)}
.brand{position:absolute;left:52px;top:42px;display:flex;align-items:center;gap:16px;font-size:40px;font-weight:850;letter-spacing:-.03em}
.brand img{width:60px;height:60px;border-radius:16px;box-shadow:0 10px 30px -8px rgba(99,102,241,.9)}
.badge{position:absolute;display:inline-flex;align-items:center;gap:12px;padding:12px 22px;border-radius:999px;font-size:30px;font-weight:800;letter-spacing:.01em;box-shadow:0 14px 34px -12px rgba(0,0,0,.6)}
.green{background:linear-gradient(135deg,#22c55e,#059669);color:#fff}
.h{position:absolute;font-weight:900;letter-spacing:-.05em;line-height:.9;text-shadow:0 8px 30px rgba(0,0,0,.45);text-transform:uppercase}
.grad{background:linear-gradient(100deg,#a5b4fc 0%,#c4b5fd 40%,#f0abfc 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 8px 24px rgba(0,0,0,.4))}
.win{position:absolute;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 60px 120px -30px rgba(0,0,0,.9),0 0 0 2px rgba(255,255,255,.18)}
.win .bar{height:40px;display:flex;align-items:center;gap:9px;padding:0 16px;background:#f1f1f6}
.win .bar i{width:13px;height:13px;border-radius:50%}.win .bar i:nth-child(1){background:#ff5f57}.win .bar i:nth-child(2){background:#febc2e}.win .bar i:nth-child(3){background:#28c840}
.crop{position:relative;overflow:hidden}
.crop img{position:absolute;left:0;top:0}
.chip{position:absolute;display:flex;align-items:center;gap:14px;padding:14px 26px 14px 20px;border-radius:22px;background:#fff;color:#0b0b14;font-weight:850;box-shadow:0 26px 50px -16px rgba(0,0,0,.7)}
${extraCss}</style></head><body><div class="dots"></div><div class="brand"><img src="${LOGO}" alt="">FrameShot</div>${body}</body></html>`;

// A crop of a 2560 × 1600 capture, shown at a given width.
const crop = (name, [x0, y0, x1, y1], width) => {
  const s = width / (x1 - x0);
  return `<div class="crop" style="width:${width}px;height:${Math.round((y1 - y0) * s)}px"><img src="${raw(name)}" style="width:${2560 * s}px;left:${-x0 * s}px;top:${-y0 * s}px" alt=""></div>`;
};

const variants = {
  // A — the screen recorder, with the camera bubble as the face of the thumbnail.
  a: base(`
<div class="badge green" style="left:52px;top:176px">FREE · NO WATERMARK</div>
<div class="h" style="left:48px;top:262px;font-size:114px">Screen<br>recorder</div>
<div class="h grad" style="left:52px;top:482px;font-size:44px;letter-spacing:-.03em">+ full-page screenshots</div>
<div class="win" style="left:700px;top:96px;width:760px;transform:perspective(1600px) rotateY(-14deg) rotateX(3deg);transform-origin:left center"><div class="bar"><i></i><i></i><i></i></div>${crop('rec-live', [30, 150, 2560, 1150], 760).replace('</div>', `<i id="cam" style="position:absolute;left:${(1450 - 30) * (760 / 2530)}px;top:${(928 - 150) * (760 / 2530)}px;width:1px;height:1px"></i></div>`)}</div>
<div id="big" style="position:absolute;left:0;top:0;width:250px;height:250px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 8px #fff,0 30px 60px -10px rgba(0,0,0,.7)"><img src="${raw('rec-live')}" style="position:absolute;width:${2560 * 1.03}px;left:${-1322 * 1.03}px;top:${-800 * 1.03}px" alt=""></div>
<script>const r = document.getElementById('cam').getBoundingClientRect(), b = document.getElementById('big'); b.style.left = (r.left - 125) + 'px'; b.style.top = (r.top - 125) + 'px';</script>
<div class="chip" style="left:668px;top:84px;font-size:44px"><span style="width:26px;height:26px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 8px rgba(239,68,68,.25)"></span>REC</div>
`),
  // B — full-page screenshots: the whole page in one image, and the click that makes it.
  b: base(`
<div class="badge green" style="left:52px;top:150px">FREE CHROME EXTENSION</div>
<div class="h" style="left:48px;top:246px;font-size:114px">The whole<br>page.</div>
<div class="h grad" style="left:50px;top:462px;font-size:114px">One click.</div>
<div style="position:absolute;left:760px;top:40px;width:420px;height:640px;border-radius:16px;overflow:hidden;transform:rotate(-5deg);box-shadow:0 60px 120px -30px rgba(0,0,0,.9),0 0 0 3px rgba(255,255,255,.2)"><img src="${raw('page-full')}" style="width:420px" alt=""><div style="position:absolute;left:0;right:0;top:300px;height:6px;background:linear-gradient(90deg,transparent,#8b5cf6,#e879f9,transparent);box-shadow:0 0 30px 10px rgba(139,92,246,.6)"></div></div>
<div style="position:absolute;left:1000px;top:120px;width:250px;border-radius:16px;overflow:hidden;box-shadow:0 40px 80px -20px rgba(0,0,0,.85),0 0 0 2px rgba(0,0,0,.1)"><img src="${raw('popup')}" style="width:250px;display:block" alt=""></div>
<div style="position:absolute;left:1150px;top:182px">${CURSOR}</div>
`),
  // C — no watermark: an annotated capture, the pain point people search for.
  c: base(`
<div class="badge green" style="left:52px;top:176px">$0 · NO SIGN-UP</div>
<div class="h" style="left:48px;top:268px;font-size:97px">No<br>watermark.</div>
<div class="h grad" style="left:52px;top:466px;font-size:40px;letter-spacing:-.03em">Record · capture · annotate</div>
<div class="win" style="left:760px;top:110px;width:700px;transform:perspective(1600px) rotateY(-12deg) rotateX(3deg);transform-origin:left center"><div class="bar"><i></i><i></i><i></i></div>${crop('ed-4', [180, 380, 1560, 1240], 700)}</div>
`),
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
for (const [k, html] of Object.entries(variants)) {
  const file = path.join(TMP, `thumb-${k}.html`);
  fs.writeFileSync(file, html);
  await page.goto(u(file));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  // Headlines must sit clear of the artwork (the visuals start at the first window or picture).
  const clash = await page.evaluate(() => {
    const art = Math.min(...[...document.querySelectorAll('.win, body > div[style*="overflow:hidden"]')].map((e) => e.getBoundingClientRect().left));
    return [...document.querySelectorAll('.h, .badge')].map((e) => ({ t: e.textContent.trim(), r: e.getBoundingClientRect().right })).filter((x) => x.r > art - 16).map((x) => `${x.t} ends at ${Math.round(x.r)} (art from ${Math.round(art)})`);
  });
  if (clash.length) console.warn(`thumbnail ${k}: text runs into the artwork:\n  ${clash.join('\n  ')}`);
  await page.screenshot({ path: path.join(TMP, `thumb-${k}@2x.png`) });
}
await browser.close();
// Downscale 2× → 1280 × 720 for crisp edges, then save as JPEG.
const py = spawnSync('python3', ['-c', `
from PIL import Image
import sys
for k in 'abc':
    im = Image.open(f'${TMP}/thumb-{k}@2x.png').convert('RGB').resize((1280, 720), Image.LANCZOS)
    im.save(f'${OUT}/frameshot-thumb-{k}.jpg', 'JPEG', quality=92, optimize=True, progressive=True)
`], { encoding: 'utf8' });
if (py.status !== 0) throw new Error(py.stderr);
for (const k of 'abc') console.log(`marketing/thumbnails/frameshot-thumb-${k}.jpg`, (fs.statSync(path.join(OUT, `frameshot-thumb-${k}.jpg`)).size / 1024).toFixed(0), 'KB');
