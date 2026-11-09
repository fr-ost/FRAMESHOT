/**
 * LinkedIn images for the FrameShot project, from the real UI screenshots on the website:
 *
 *   node scripts/marketing/linkedin-images.mjs
 *
 * - marketing/linkedin/frameshot-linkedin-1200x627.jpg: the project's media image, and the
 *   image for a post (LinkedIn's link and image size, 1.91:1)
 * - marketing/linkedin/frameshot-linkedin-cover-1584x396.jpg: a profile background. The
 *   left part stays free of text, because the profile photo covers the bottom left.
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'marketing/linkedin');
const TMP = path.join(ROOT, '.output/linkedin-tmp');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const u = (p) => pathToFileURL(path.join(ROOT, p)).href;
const IMG = (n) => u(`website/assets/img/${n}-1440.webp`);
const LOGO = u('src/assets/logo.svg');
const FONT = u('store-assets/promo/inter.woff2');
const DEV = u('public/developer.webp');
const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const GLOBE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

const page = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url('${FONT}') format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${w}px;height:${h}px;overflow:hidden;position:relative;font-family:Inter,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;
background:radial-gradient(55% 85% at 5% 0%,rgba(99,102,241,.7),transparent 62%),radial-gradient(50% 90% at 100% 10%,rgba(217,70,239,.45),transparent 60%),radial-gradient(60% 80% at 60% 120%,rgba(14,165,233,.32),transparent 60%),#0a0a18}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.085) 1.3px,transparent 1.6px);background-size:28px 28px;-webkit-mask:linear-gradient(110deg,#000 10%,transparent 65%)}
.brand{position:absolute;display:flex;align-items:center;gap:14px;font-weight:850;letter-spacing:-.03em}
.brand img{border-radius:14px;box-shadow:0 10px 26px -8px rgba(99,102,241,.9)}
.by{margin-left:4px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);font-size:15px;font-weight:650;letter-spacing:0;color:rgba(235,235,255,.85)}
.h{position:absolute;font-weight:850;letter-spacing:-.045em;line-height:1.04}
.grad{background:linear-gradient(100deg,#a5b4fc 0%,#c4b5fd 40%,#f0abfc 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.chips{position:absolute;display:flex;gap:10px}
.chip{display:inline-flex;align-items:center;gap:8px;padding:9px 16px 9px 11px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);font-weight:650;color:#ecebff;white-space:nowrap}
.chip i{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#059669);color:#fff}
.url{position:absolute;display:flex;align-items:center;gap:10px;font-weight:750;color:#fff}
.url svg{color:#a5b4fc}
.stack{position:absolute;font-weight:600;color:rgba(235,235,255,.6);letter-spacing:.01em}
.win{position:absolute;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 50px 100px -30px rgba(0,0,0,.9),0 0 0 2px rgba(255,255,255,.16)}
.win .bar{height:30px;display:flex;align-items:center;gap:7px;padding:0 13px;background:#f1f1f6}
.win .bar i{width:10px;height:10px;border-radius:50%}.win .bar i:nth-child(1){background:#ff5f57}.win .bar i:nth-child(2){background:#febc2e}.win .bar i:nth-child(3){background:#28c840}
.win img{display:block;width:100%}
.rec{position:absolute;display:flex;align-items:center;gap:10px;padding:10px 18px 10px 14px;border-radius:16px;background:#fff;color:#0b0b14;font-weight:850;box-shadow:0 20px 40px -14px rgba(0,0,0,.7)}
.rec b{width:16px;height:16px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 6px rgba(239,68,68,.22)}
.dev{position:absolute;display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:rgba(235,235,255,.75)}
.dev img{width:34px;height:34px;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.3)}
</style></head><body><div class="dots"></div>${body}</body></html>`;
const win = (img, style) => `<div class="win" style="${style}"><div class="bar"><i></i><i></i><i></i></div><img src="${IMG(img)}" alt=""></div>`;
const chips = (list, size) => list.map((t) => `<span class="chip" style="font-size:${size}px"><i>${CHECK}</i>${t}</span>`).join('');

const images = {
  'frameshot-linkedin-1200x627': {
    w: 1200,
    h: 627,
    html: page(1200, 627, `
<div class="brand" style="left:56px;top:48px;font-size:38px"><img src="${LOGO}" style="width:52px;height:52px" alt="">FrameShot<span class="by">by Unique Labs</span></div>
<div class="h" style="left:56px;top:146px;font-size:47px">Record your screen.<br>Capture the whole page.<br><span class="grad">Free forever.</span></div>
<div class="chips" style="left:56px;top:322px">${chips(['No watermark', 'No sign-up', 'Nothing uploaded'], 17)}</div>
<div class="url" style="left:56px;top:404px;font-size:24px">${GLOBE}frameshot.uniquelabs.org</div>
<div class="stack" style="left:56px;top:462px;font-size:16px">Chrome extension · TypeScript · React · Manifest V3</div>
<div class="dev" style="left:56px;top:534px"><img src="${DEV}" alt="">Developed by Shahriar Ahmed</div>
${win('editor', 'left:660px;top:70px;width:600px;transform:perspective(1500px) rotateY(-12deg) rotateX(2deg);transform-origin:left center')}
${win('recorder', 'left:690px;top:352px;width:360px;transform:perspective(1500px) rotateY(-8deg);transform-origin:left center')}
<div class="rec" style="left:968px;top:326px;font-size:24px"><b></b>REC</div>
`),
  },
  'frameshot-linkedin-cover-1584x396': {
    w: 1584,
    h: 396,
    html: page(1584, 396, `
<div class="brand" style="left:560px;top:58px;font-size:36px"><img src="${LOGO}" style="width:48px;height:48px" alt="">FrameShot<span class="by">by Unique Labs</span></div>
<div class="h" style="left:560px;top:132px;font-size:34px">Free screen recorder &amp;<br><span class="grad">full-page screenshots for Chrome</span></div>
<div class="chips" style="left:560px;top:236px">${chips(['No watermark', 'No sign-up', 'Nothing uploaded'], 15)}</div>
<div class="url" style="left:560px;top:300px;font-size:21px">${GLOBE}frameshot.uniquelabs.org</div>
${win('editor', 'left:1180px;top:44px;width:430px;transform:perspective(1300px) rotateY(-14deg) rotateX(2deg);transform-origin:left center')}
${win('recorder', 'left:1150px;top:212px;width:250px;transform:perspective(1300px) rotateY(-10deg);transform-origin:left center')}
`),
  },
};

const browser = await chromium.launch();
for (const [name, { w, h, html }] of Object.entries(images)) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const file = path.join(TMP, `${name}.html`);
  fs.writeFileSync(file, html);
  await p.goto(pathToFileURL(file).href);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  const clash = await p.evaluate(() => {
    const art = Math.min(...[...document.querySelectorAll('.win, .rec')].map((e) => e.getBoundingClientRect().left));
    return [...document.querySelectorAll('.brand, .h, .chips, .url, .stack, .dev')].map((e) => ({ t: e.textContent.trim().slice(0, 30), r: e.getBoundingClientRect().right })).filter((x) => x.r > art - 14).map((x) => `"${x.t}" ends at ${Math.round(x.r)}, art starts at ${Math.round(art)}`);
  });
  if (clash.length) console.warn(`${name}: text runs into the artwork:\n  ${clash.join('\n  ')}`);
  await p.screenshot({ path: path.join(TMP, `${name}@2x.png`) });
  await p.close();
}
await browser.close();
const py = spawnSync('python3', ['-c', `
from PIL import Image
for name, size in ${JSON.stringify(Object.entries(images).map(([n, v]) => [n, [v.w, v.h]]))}:
    im = Image.open(f'${TMP}/{name}@2x.png').convert('RGB').resize(tuple(size), Image.LANCZOS)
    im.save(f'${OUT}/{name}.jpg', 'JPEG', quality=92, optimize=True, progressive=True)
`], { encoding: 'utf8' });
if (py.status !== 0) throw new Error(py.stderr);
for (const name of Object.keys(images)) console.log(`marketing/linkedin/${name}.jpg`, (fs.statSync(path.join(OUT, `${name}.jpg`)).size / 1024).toFixed(0), 'KB');
