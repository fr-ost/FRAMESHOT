/**
 * Website assets (run when the UI captures or page titles change):
 *   node scripts/website/assets.mjs
 * - responsive AVIF + WebP screenshots from store-assets/raw (made by `npm run store:assets`)
 * - a full-length render of the demo page for the "full page" animation
 * - 1200×630 social preview images (og/*.jpg) for every page
 * - favicons and app icons
 * Writes into website/ and records image sizes in scripts/website/images.json.
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OG_PAGES } from './meta.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'website');
const IMG = path.join(OUT, 'assets/img');
const RAW = path.join(ROOT, 'store-assets/raw');
const TMP = path.join(ROOT, '.output/website-tmp');
for (const d of [IMG, path.join(OUT, 'assets/fonts'), path.join(OUT, 'assets/donate'), path.join(OUT, 'og'), TMP]) fs.mkdirSync(d, { recursive: true });

// ── Static files ──
fs.copyFileSync(path.join(ROOT, 'store-assets/promo/inter.woff2'), path.join(OUT, 'assets/fonts/inter-var-latin.woff2'));
fs.copyFileSync(path.join(ROOT, 'src/assets/logo.svg'), path.join(IMG, 'logo.svg'));
fs.copyFileSync(path.join(ROOT, 'public/developer.webp'), path.join(IMG, 'developer.webp'));
for (const f of fs.readdirSync(path.join(ROOT, 'public/donate'))) fs.copyFileSync(path.join(ROOT, 'public/donate', f), path.join(OUT, 'assets/donate', f));

const browser = await chromium.launch();

// ── Full-length demo page (what a full-page capture produces) ──
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(path.join(ROOT, 'store-assets/demo/board.html')).href);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(TMP, 'fullpage.png'), fullPage: true });
  await p.close();
}

// ── Icons ──
const logoUrl = pathToFileURL(path.join(ROOT, 'src/assets/logo.svg')).href;
async function renderIcon(size, file, bleed) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;background:${bleed ? '#4F46E5' : 'transparent'}"><img src="${logoUrl}" style="display:block;width:${size}px;height:${size}px;${bleed ? `transform:scale(1.18)` : ''}"></body></html>`);
  await p.waitForFunction(() => document.images[0].complete);
  await p.screenshot({ path: file, omitBackground: !bleed });
  await p.close();
}
await renderIcon(180, path.join(OUT, 'apple-touch-icon.png'), true);
await renderIcon(192, path.join(IMG, 'icon-192.png'), true);
await renderIcon(512, path.join(IMG, 'icon-512.png'), true);
for (const s of [16, 32, 48]) await renderIcon(s, path.join(TMP, `fav-${s}.png`), false);

// ── Encode screenshots (AVIF + WebP) with Pillow ──
const JOBS = [
  { name: 'editor', src: 'raw:editor.png', widths: [720, 1440] },
  { name: 'popup', src: 'raw:popup.png', widths: [360, 720] },
  { name: 'recorder', src: 'raw:recorder.png', widths: [720, 1440] },
  { name: 'redact', src: 'raw:redact.png', widths: [720, 1440] },
  { name: 'gif', src: 'raw:gif.png', widths: [720, 1440] },
  { name: 'library-light', src: 'raw:library-light.png', widths: [720, 1440] },
  { name: 'library-dark', src: 'raw:library-dark.png', widths: [720, 1440] },
  { name: 'composer', src: 'raw:composer.png', widths: [720, 1440] },
  { name: 'fullpage', src: `tmp:fullpage.png`, widths: [380, 760] },
].map((j) => ({ ...j, src: j.src.startsWith('raw:') ? path.join(RAW, j.src.slice(4)) : path.join(TMP, j.src.slice(4)) }));
for (const j of JOBS) if (!fs.existsSync(j.src)) throw new Error(`Missing ${j.src}. Run \`npm run store:assets\` first.`);

const PY = `
import json, sys
from PIL import Image
jobs, out = json.loads(sys.stdin.read()), {}
for j in jobs:
    im = Image.open(j['src']).convert('RGB')
    w, h = im.size
    out[j['name']] = {'w': w, 'h': h, 'widths': j['widths']}
    for tw in j['widths']:
        th = round(h * tw / w)
        r = im.resize((tw, th), Image.LANCZOS)
        base = j['outdir'] + '/' + j['name'] + '-' + str(tw)
        r.save(base + '.webp', 'WEBP', quality=80, method=6)
        r.save(base + '.avif', 'AVIF', quality=58, speed=4)
print(json.dumps(out))
`;
const res = spawnSync('python3', ['-c', PY], { input: JSON.stringify(JOBS.map((j) => ({ ...j, outdir: IMG }))), encoding: 'utf8', maxBuffer: 1 << 24 });
if (res.status !== 0) throw new Error(res.stderr);
const images = JSON.parse(res.stdout);

const ICO = `
import sys
from PIL import Image
imgs = [Image.open(f'${TMP}/fav-{s}.png').convert('RGBA') for s in (48, 32, 16)]
imgs[0].save('${path.join(OUT, 'favicon.ico')}', sizes=[(48, 48), (32, 32), (16, 16)], append_images=imgs[1:])
`;
const ico = spawnSync('python3', ['-c', ICO], { encoding: 'utf8' });
if (ico.status !== 0) throw new Error(ico.stderr);

// ── Social preview images ──
const font = pathToFileURL(path.join(ROOT, 'store-assets/promo/inter.woff2')).href;
const shot = (name) => pathToFileURL(path.join(IMG, `${name}-1440.webp`)).href;
function ogHtml({ title, kicker, image }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url('${font}') format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Inter,sans-serif;color:#fff;position:relative;background:radial-gradient(70% 90% at 0% 0%,#6d6af7 0%,transparent 60%),radial-gradient(60% 90% at 100% 100%,#d946ef 0%,transparent 55%),linear-gradient(135deg,#3730a3 0%,#5b21b6 55%,#9d174d 120%)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.12) 1.2px,transparent 1.4px);background-size:22px 22px;-webkit-mask:linear-gradient(110deg,#000,transparent 55%)}
.l{position:absolute;left:64px;top:60px;width:600px}
.brand{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:800;letter-spacing:-.02em}
.brand img{width:52px;height:52px;border-radius:14px;background:#fff;padding:5px}
.k{display:inline-block;margin-top:40px;padding:7px 16px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);font-size:18px;font-weight:700;letter-spacing:.02em}
h1{margin-top:22px;font-size:${title.length > 52 ? 44 : 52}px;line-height:1.08;font-weight:820;letter-spacing:-.035em}
.f{position:absolute;left:64px;bottom:50px;font-size:19px;color:rgba(255,255,255,.85);font-weight:600}
.win{position:absolute;right:-60px;top:84px;width:560px;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 40px 90px -20px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.2);transform:perspective(1400px) rotateY(-12deg) rotateX(3deg)}
.bar{height:30px;display:flex;align-items:center;gap:7px;padding:0 12px;background:#f3f3f8}
.bar i{width:10px;height:10px;border-radius:50%}
.win img{display:block;width:100%}
</style></head><body><div class="dots"></div>
<div class="l"><div class="brand"><img src="${logoUrl}">FrameShot</div><div class="k">${kicker}</div><h1>${title}</h1></div>
<div class="f">Free · No watermark · Nothing uploaded</div>
<div class="win"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div><img src="${shot(image)}"></div>
</body></html>`;
}
for (const og of OG_PAGES) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const file = path.join(TMP, `og-${og.name}.html`);
  fs.writeFileSync(file, ogHtml(og));
  await p.goto(pathToFileURL(file).href);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: path.join(OUT, 'og', `${og.name}.jpg`), type: 'jpeg', quality: 86 });
  await p.close();
  console.log('og', og.name);
}
await browser.close();

// Blog cards reuse the social images at card sizes (AVIF + WebP).
const cards = spawnSync('python3', ['-c', PY], {
  input: JSON.stringify(OG_PAGES.map((og) => ({ name: `og-${og.name}`, src: path.join(OUT, 'og', `${og.name}.jpg`), widths: [600, 1200], outdir: IMG }))),
  encoding: 'utf8',
  maxBuffer: 1 << 24,
});
if (cards.status !== 0) throw new Error(cards.stderr);
Object.assign(images, JSON.parse(cards.stdout));
fs.writeFileSync(path.join(HERE, 'images.json'), `${JSON.stringify(images, null, 2)}\n`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log('assets done');
