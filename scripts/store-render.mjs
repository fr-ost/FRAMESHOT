/**
 * Step 2 of the store images: lays out the real UI captures in store-assets/raw/
 * (made by scripts/store-assets.mjs) as marketing screenshots with headlines,
 * callouts and stat chips, and renders them at the exact store sizes as 24-bit
 * PNGs: five 1280×800 screenshots, the 1400×560 marquee and the 440×280 tile.
 *
 *   node scripts/store-render.mjs            (all)
 *   node scripts/store-render.mjs 2 marquee  (some)
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Icons from 'lucide-react';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'store-assets/raw');
const SHOTS = path.join(ROOT, 'store-assets/screenshots');
const PROMO = path.join(ROOT, 'store-assets/promo');
const FONT = pathToFileURL(path.join(ROOT, 'store-assets/promo/inter.woff2')).href;
const LOGO = pathToFileURL(path.join(ROOT, 'src/assets/logo.svg')).href;
const PHOTO = pathToFileURL(path.join(ROOT, 'public/developer.webp')).href;
const only = process.argv.slice(2);

const icon = (name, size = 22, color = '#fff', stroke = 2.2) => renderToStaticMarkup(createElement(Icons[name], { size, color, strokeWidth: stroke }));
const rawUrl = (f) => pathToFileURL(path.join(RAW, f)).href;
/** Raw captures are 2× of these CSS sizes. */
const RAW_SIZE = { popup: [360, 560], default: [1280, 800] };
function rawSize(file) {
  return file.startsWith('popup') ? RAW_SIZE.popup : RAW_SIZE.default;
}

/** A crop of a capture (in CSS px of the capture), shown `w` px wide. */
function crop(file, { x = 0, y = 0, cw, ch }, w) {
  const [rw, rh] = rawSize(file);
  cw ??= rw - x;
  ch ??= rh - y;
  const k = w / cw;
  return `<div class="crop" style="width:${w}px;height:${Math.round(ch * k)}px"><img src="${rawUrl(file)}" style="width:${rw * k}px;height:${rh * k}px;margin-left:${-x * k}px;margin-top:${-y * k}px"></div>`;
}
/** A capture inside a browser window frame. */
function win(file, cropBox, w, title = 'FrameShot', style = '') {
  return `<div class="win" style="${style}"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span class="url"><img src="${LOGO}">${title}</span></div>${crop(file, cropBox, w)}</div>`;
}
const chip = (ic, big, small, style = '', grad = 'var(--g1)') =>
  `<div class="chip" style="${style}"><span class="ci" style="background:${grad}">${icon(ic, 26)}</span><span><b>${big}</b><small>${small}</small></span></div>`;
const callout = (ic, big, small, style = '', grad = 'var(--g1)') =>
  `<div class="callout" style="${style}"><span class="ci" style="background:${grad}">${icon(ic, 24)}</span><span><b>${big}</b><small>${small}</small></span></div>`;
const bullets = (items) => `<ul class="bul">${items.map(([ic, t]) => `<li><span class="bi">${icon(ic, 18)}</span>${t}</li>`).join('')}</ul>`;
const kicker = (n, text) => `<div class="kicker">${n ? `<span class="kn">${n}</span>` : `<span class="kn">${icon('Heart', 15)}</span>`}${text}</div>`;

const CSS = `
@font-face{font-family:Inter;src:url('${FONT}') format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#0b0b14;--muted:#4b4b63;--g1:linear-gradient(135deg,#6366f1,#8b5cf6);--g2:linear-gradient(135deg,#f43f5e,#e11d48 55%,#c026d3);--g3:linear-gradient(135deg,#10b981,#059669);--g4:linear-gradient(135deg,#f59e0b,#ea580c);--g5:linear-gradient(135deg,#0ea5e9,#6366f1)}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);position:relative;background:#f6f6fb;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:radial-gradient(900px 620px at 100% 0%,rgba(139,92,246,.22),transparent 62%),radial-gradient(760px 560px at 0% 100%,rgba(236,72,153,.13),transparent 60%),radial-gradient(700px 520px at 88% 100%,rgba(56,189,248,.16),transparent 60%)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(15,15,35,.09) 1.2px,transparent 1.4px);background-size:22px 22px;-webkit-mask:linear-gradient(115deg,#000 0%,transparent 45%)}
.abs{position:absolute}
.kicker{display:inline-flex;align-items:center;gap:10px;padding:7px 18px 7px 7px;border-radius:999px;background:#fff;border:1px solid rgba(99,102,241,.22);box-shadow:0 6px 18px -8px rgba(67,56,202,.35);font-size:14px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:#4338ca}
.kn{display:flex;width:28px;height:28px;border-radius:50%;align-items:center;justify-content:center;background:var(--g1);color:#fff;font-size:14px;letter-spacing:0}
h1{font-weight:820;letter-spacing:-.045em;line-height:1.02}
.gt{background:linear-gradient(100deg,#4f46e5 0%,#7c3aed 45%,#db2777 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--muted);line-height:1.5}
.bul{list-style:none;display:grid;gap:14px}
.bul li{display:flex;align-items:center;gap:14px;font-size:19px;font-weight:620;color:#1d1d2e;letter-spacing:-.01em}
.bi{display:flex;flex:none;width:36px;height:36px;border-radius:11px;align-items:center;justify-content:center;background:var(--g1);box-shadow:0 6px 14px -6px rgba(99,102,241,.7)}
.win{position:absolute;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 44px 90px -28px rgba(30,27,75,.42),0 0 0 1px rgba(15,15,35,.08)}
.bar{height:36px;display:flex;align-items:center;gap:8px;padding:0 14px;background:#f3f3f8;border-bottom:1px solid rgba(15,15,35,.06)}
.bar i{width:12px;height:12px;border-radius:50%}
.url{margin-left:14px;display:flex;align-items:center;gap:8px;height:22px;padding:0 12px;min-width:300px;border-radius:7px;background:#fff;font-size:12.5px;font-weight:550;color:#55556a;border:1px solid rgba(15,15,35,.06)}
.url img{width:14px;height:14px;border-radius:4px}
.crop{overflow:hidden;position:relative}
.crop img{display:block}
.chip,.callout{position:absolute;display:flex;align-items:center;gap:14px;background:#fff;border-radius:20px;box-shadow:0 22px 50px -18px rgba(30,27,75,.38),0 0 0 1px rgba(15,15,35,.06);z-index:5}
.chip{padding:14px 22px 14px 14px}
.callout{padding:14px 24px 14px 14px}
.ci{display:flex;flex:none;width:54px;height:54px;border-radius:16px;align-items:center;justify-content:center;box-shadow:0 8px 18px -8px rgba(30,27,75,.5)}
.chip b{display:block;font-size:29px;font-weight:820;letter-spacing:-.03em;line-height:1.05}
.callout b{display:block;font-size:24px;font-weight:800;letter-spacing:-.025em;line-height:1.1}
.chip small,.callout small{display:block;margin-top:2px;font-size:15px;color:#5b5b72;font-weight:500}
.popup{position:absolute;border-radius:20px;overflow:hidden;box-shadow:0 44px 90px -26px rgba(30,27,75,.45),0 0 0 1px rgba(15,15,35,.08);background:#fff}
.tool{position:absolute;display:flex;align-items:center;gap:10px;height:58px;padding:0 14px;border-radius:16px;background:#fff;box-shadow:0 18px 40px -20px rgba(30,27,75,.4),0 0 0 1px rgba(15,15,35,.07)}
.tool .addr{display:flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:999px;background:#f1f1f6;font-size:15px;color:#3b3b4f;flex:1}
.tool .ext{display:flex;width:40px;height:40px;border-radius:11px;align-items:center;justify-content:center;background:rgba(99,102,241,.14);box-shadow:inset 0 0 0 2px rgba(99,102,241,.55)}
.tool .ext img{width:24px;height:24px;border-radius:6px}
.brand{display:flex;align-items:center;gap:14px}
.brand img{width:54px;height:54px;border-radius:15px;box-shadow:0 10px 24px -10px rgba(67,56,202,.6)}
.brand b{display:block;font-size:28px;font-weight:800;letter-spacing:-.03em}
.brand small{display:block;font-size:15px;font-weight:650;color:#4f46e5}
`;

function page(body, w = 1280, h = 800, extra = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extra}</style></head><body style="width:${w}px;height:${h}px">${body}</body></html>`;
}

// ── The five screenshots ──
const SLIDES = {
  1: () =>
    page(`<div class="bg"></div><div class="dots"></div>
      <div class="abs" style="left:72px;top:62px;width:640px">
        <div class="brand"><img src="${LOGO}"><span><b>FrameShot</b><small>Free forever · no watermark</small></span></div>
        <h1 style="font-size:66px;margin-top:44px">Record your screen.<br><span class="gt">Capture full pages.</span></h1>
        <p class="sub" style="font-size:21px;margin-top:22px;max-width:560px">The free all-in-one screen recorder and screenshot tool for Chrome. No sign-up, no limits, nothing uploaded.</p>
        <div style="margin-top:34px">${bullets([
          ['Video', 'Record tab, window or desktop with sound'],
          ['ScrollText', 'Full page, area &amp; element screenshots'],
          ['PenLine', 'Annotate, blur and beautify in seconds'],
          ['Download', 'Export MP4, GIF, PNG, JPG and PDF'],
        ])}</div>
      </div>
      <div class="tool" style="left:744px;top:46px;width:480px"><span style="display:flex;gap:10px;color:#77778a">${icon('ArrowLeft', 18, '#77778a')}${icon('RotateCw', 18, '#77778a')}</span><span class="addr">${icon('Lock', 14, '#77778a')} app.example.com</span><span class="ext"><img src="${LOGO}"></span></div>
      <div class="popup" style="left:832px;top:122px;width:360px">${crop('popup.png', { cw: 360, ch: 560 }, 360)}</div>
      ${chip('Infinity', 'Unlimited', 'screenshots &amp; recordings', 'left:618px;top:560px')}
      ${chip('BadgeCheck', 'No watermark', 'no account, no time limit', 'left:930px;top:690px', 'var(--g3)')}`),

  2: () =>
    page(`<div class="bg"></div><div class="dots"></div>
      <div class="abs" style="left:64px;top:52px">${kicker('2', 'Screen recorder')}</div>
      <h1 class="abs" style="left:64px;top:116px;font-size:58px">Record your screen<br><span class="gt">with sound &amp; camera</span></h1>
      <p class="abs sub" style="right:64px;top:92px;width:440px;font-size:19px;text-align:right">Tab, window or entire screen. Tab or system audio, your microphone and a webcam bubble. MP4 up to 4K.</p>
      ${win('recorder.png', { x: 0, y: 0, cw: 1280, ch: 760 }, 880, 'FrameShot · Screen recorder', 'left:64px;top:272px')}
      ${callout('Volume2', 'System audio + mic', 'tab, window or screen', 'left:880px;top:300px', 'var(--g5)')}
      ${callout('Webcam', 'Camera bubble', 'any corner, three sizes', 'left:918px;top:430px', 'var(--g2)')}
      ${callout('Clapperboard', 'MP4 · 4K · 60 fps', 'pause, resume, no limit', 'left:896px;top:560px', 'var(--g1)')}
      ${chip('ShieldCheck', 'Crash-safe', 'saved while you record', 'left:96px;top:682px', 'var(--g3)')}`),

  3: () =>
    page(`<div class="bg"></div><div class="dots"></div>
      <div class="abs" style="left:64px;top:52px">${kicker('3', 'Full page screenshot &amp; editor')}</div>
      <h1 class="abs" style="left:64px;top:116px;font-size:58px">Capture whole pages.<br><span class="gt">Annotate in seconds.</span></h1>
      <p class="abs sub" style="right:64px;top:92px;width:430px;font-size:19px;text-align:right">Full page, visible area, selected area, element or scrolling panel. Sticky headers appear once. Then mark it up.</p>
      ${win('editor.png', { x: 0, y: 0, cw: 1280, ch: 760 }, 900, 'FrameShot · Editor', 'left:64px;top:272px')}
      ${callout('ScrollText', 'One-click full page', 'long pages stitched cleanly', 'left:900px;top:300px', 'var(--g1)')}
      ${callout('MoveUpRight', 'Arrows, text, steps', 'shapes, pen, highlighter', 'left:940px;top:430px', 'var(--g4)')}
      ${callout('Crop', 'Crop, resize, rotate', 'undo &amp; redo everything', 'left:918px;top:560px', 'var(--g5)')}
      ${chip('SquareDashedMousePointer', '5 capture modes', 'page, area, element, panel, view', 'left:96px;top:682px', 'var(--g2)')}`),

  4: () =>
    page(`<div class="bg"></div><div class="dots"></div>
      <div class="abs" style="left:64px;top:52px">${kicker('4', 'Blur · GIF · Export')}</div>
      <h1 class="abs" style="left:64px;top:116px;font-size:58px">Hide private details.<br><span class="gt">Share it anywhere.</span></h1>
      <p class="abs sub" style="right:64px;top:92px;width:440px;font-size:19px;text-align:right">Blur, pixelate or redact sensitive info. Turn any clip into a GIF. Copy, or save as PNG, JPG, WebP, PDF or MP4.</p>
      ${win('redact.png', { x: 80, y: 120, cw: 905, ch: 600 }, 700, 'FrameShot · Editor', 'left:64px;top:280px')}
      ${win('gif.png', { x: 340, y: 40, cw: 600, ch: 720 }, 400, 'FrameShot · Export as GIF', 'left:812px;top:236px;transform:rotate(1.5deg)')}
      ${chip('EyeOff', 'Redact = gone', 'pixels replaced in every export', 'left:470px;top:648px', 'var(--g2)')}
      ${chip('ImagePlay', 'GIF from any clip', 'trim, size, frame rate, loop', 'left:836px;top:690px', 'var(--g4)')}`),

  5: () =>
    page(`<div class="abs" style="inset:0;background:linear-gradient(135deg,#3730a3 0%,#4f46e5 35%,#7c3aed 70%,#a21caf 120%)"></div>
      <div class="abs" style="inset:0;background-image:radial-gradient(rgba(255,255,255,.12) 1.2px,transparent 1.4px);background-size:22px 22px;-webkit-mask:linear-gradient(120deg,#000,transparent 60%)"></div>
      <div class="abs" style="right:-160px;top:-160px;width:560px;height:560px;border-radius:50%;border:1px solid rgba(255,255,255,.14)"></div>
      <div class="abs" style="left:72px;top:58px"><div class="kicker" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.3);box-shadow:none">${`<span class="kn" style="background:#fff">${icon('Heart', 15, '#6d28d9')}</span>`}100% free · no sign-up</div></div>
      <h1 class="abs" style="left:72px;top:122px;font-size:68px;color:#fff">Free. Unlimited. Private.</h1>
      <p class="abs" style="left:72px;top:212px;font-size:20px;color:rgba(255,255,255,.85);width:720px;line-height:1.5">No ads, no watermark, no account. Your screenshots and recordings never leave your device.</p>
      <div class="abs" style="left:72px;top:300px;width:744px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${[
          ['Images', 'Private library', 'Search, favourites, collections and tags'],
          ['LayoutTemplate', 'Beautify', 'Gradients, browser frames, social sizes'],
          ['Archive', 'Bulk ZIP &amp; PDF', 'Export many captures at once'],
          ['Columns2', 'Find duplicates', 'Spot copies and compare side by side'],
          ['Keyboard', 'Shortcuts &amp; sounds', 'Every capture mode on your keyboard'],
          ['WifiOff', 'Works offline', 'Light and dark themes, no uploads'],
        ]
          .map(
            ([ic, t, d]) =>
              `<div style="padding:20px;border-radius:20px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.24);color:#fff"><span style="display:flex;width:46px;height:46px;border-radius:13px;align-items:center;justify-content:center;background:#fff">${icon(ic, 22, '#5b21b6')}</span><b style="display:block;margin-top:14px;font-size:20px;letter-spacing:-.02em">${t}</b><span style="display:block;margin-top:6px;font-size:15px;line-height:1.4;color:rgba(255,255,255,.82)">${d}</span></div>`,
          )
          .join('')}
      </div>
      ${win('library-dark.png', { x: 0, y: 0, cw: 880, ch: 800 }, 440, 'FrameShot · Library', 'left:840px;top:150px')}
      ${chip('Lock', 'Private', 'stays on your device', 'left:872px;top:560px', 'var(--g3)')}
      <div class="abs" style="left:72px;top:736px;display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.85);font-size:14px"><img src="${PHOTO}" style="width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.6)">A product of Unique Labs · Developed by Shahriar Ahmed · www.shahriarahmed.net</div>`),
};

const PROMOS = {
  marquee: () =>
    page(
      `<div class="abs" style="inset:0;background:radial-gradient(70% 90% at 0% 0%,#6d6af7 0%,transparent 60%),radial-gradient(60% 90% at 100% 100%,#d946ef 0%,transparent 55%),linear-gradient(135deg,#3730a3 0%,#5b21b6 55%,#9d174d 120%)"></div>
      <div class="abs" style="inset:0;background-image:radial-gradient(rgba(255,255,255,.1) 1.2px,transparent 1.4px);background-size:22px 22px;-webkit-mask:linear-gradient(110deg,transparent 40%,#000)"></div>
      <div class="abs" style="left:80px;top:74px;width:620px;color:#fff">
        <div class="brand"><img src="${LOGO}" style="background:#fff;padding:6px"><b style="font-size:32px">FrameShot</b></div>
        <h1 style="font-size:58px;margin-top:34px">Free Screen Recorder<br>&amp; Full Page Screenshot</h1>
        <p style="font-size:20px;line-height:1.5;margin-top:18px;color:rgba(255,255,255,.88);max-width:560px">Record your screen with sound and camera. Capture, annotate and blur whole pages. No watermark.</p>
        <div style="display:flex;gap:10px;margin-top:26px">${[['Video', 'Screen recorder'], ['ScrollText', 'Full page'], ['ImagePlay', 'GIF &amp; PDF']].map(([ic, t]) => `<span style="display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);font-size:16px;font-weight:650">${icon(ic, 17)}${t}</span>`).join('')}</div>
      </div>
      ${win('editor.png', { x: 0, y: 0, cw: 1280, ch: 800 }, 720, 'FrameShot · Editor', 'left:744px;top:64px;transform:perspective(1600px) rotateY(-14deg) rotateX(3deg)')}
      <div class="popup" style="left:1150px;top:250px;width:230px">${crop('popup.png', { cw: 360, ch: 470 }, 230)}</div>
      ${chip('BadgeCheck', 'Free forever', 'no watermark, no sign-up', 'left:690px;top:400px', 'var(--g3)')}`,
      1400,
      560,
    ),
  small: () =>
    page(
      `<div class="abs" style="inset:0;background:radial-gradient(70% 90% at 0% 0%,#6d6af7 0%,transparent 60%),radial-gradient(60% 90% at 100% 100%,#d946ef 0%,transparent 55%),linear-gradient(135deg,#3730a3 0%,#5b21b6 55%,#9d174d 120%)"></div>
      <div class="abs" style="left:24px;top:22px;color:#fff;width:260px">
        <div class="brand" style="gap:10px"><img src="${LOGO}" style="width:36px;height:36px;border-radius:10px;background:#fff;padding:4px"><b style="font-size:21px">FrameShot</b></div>
        <h1 style="font-size:28px;margin-top:22px;line-height:1.08">Screen recorder &amp; full page screenshots</h1>
        <div style="display:flex;gap:6px;margin-top:20px">${['Free', 'No watermark'].map((t) => `<span style="padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);font-size:12px;font-weight:700">${t}</span>`).join('')}</div>
      </div>
      <div class="popup" style="left:286px;top:30px;width:170px;transform:rotate(-4deg)">${crop('popup.png', { cw: 360, ch: 470 }, 170)}</div>`,
      440,
      280,
    ),
};

fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(PROMO, { recursive: true });
for (const f of ['popup.png', 'recorder.png', 'editor.png', 'redact.png', 'gif.png', 'library-dark.png']) {
  if (!fs.existsSync(path.join(RAW, f))) throw new Error(`Missing store-assets/raw/${f}. Run \`npm run store:assets\` (it captures, then renders).`);
}
const NAMES = { 1: '01-overview.png', 2: '02-screen-recorder.png', 3: '03-full-page-editor.png', 4: '04-blur-gif-export.png', 5: '05-free-private.png' };
const browser = await chromium.launch();
async function render(html, w, h, file) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  // A file page, so it may load the captures (file:// images) next to it.
  const tmp = path.join(RAW, '_render.html');
  fs.writeFileSync(tmp, html);
  await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: file });
  await p.close();
  console.log('rendered', path.relative(ROOT, file));
}
for (const n of Object.keys(SLIDES)) if (!only.length || only.includes(n)) await render(SLIDES[n](), 1280, 800, path.join(SHOTS, NAMES[n]));
if (!only.length || only.includes('marquee')) await render(PROMOS.marquee(), 1400, 560, path.join(PROMO, 'marquee-1400x560.png'));
if (!only.length || only.includes('small')) await render(PROMOS.small(), 440, 280, path.join(PROMO, 'small-440x280.png'));
await browser.close();
fs.rmSync(path.join(RAW, '_render.html'), { force: true });
