/**
 * Checks the built website in a real browser:
 *   npm run website:check
 * - every page in the sitemap, plus the 404 and coming-soon pages, loads without console errors,
 *   CSP violations or failed requests, and every image decodes after scrolling the page
 * - every internal link and #anchor resolves
 * - structured data parses; one <h1> per page; every <img> has alt text
 * Screenshots for visual review go to .output/website-shots/.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = path.join(ROOT, '.output/website-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = 4178;
const BASE = `http://localhost:${PORT}`;
const server = await serve(PORT);

const sitemap = fs.readFileSync(path.join(ROOT, 'website/sitemap.xml'), 'utf8');
const site = /<loc>(https?:\/\/[^/<]+)/.exec(sitemap)[1];
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(site, '') || '/');
pages.push('/coming-soon', '/does-not-exist');

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const linkTargets = new Set();
const anchors = new Map();

for (const p of pages) {
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => {
    const expected404 = p === '/does-not-exist' && m.location().url === BASE + p;
    if ((m.type() === 'error' || m.type() === 'warning') && !expected404) problems.push(`console ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !(p === '/does-not-exist' && r.url().endsWith(p))) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  const res = await page.goto(BASE + p, { waitUntil: 'load' });
  if (p === '/does-not-exist' ? res.status() !== 404 : res.status() !== 200) problems.push(`status ${res.status()}`);
  // Scroll through the page so lazy images load, then check every image decoded.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
  });
  await page.waitForTimeout(600);
  const info = await page.evaluate(async () => {
    const imgs = [...document.images].filter((i) => i.getClientRects().length && getComputedStyle(i).visibility !== 'hidden');
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    return {
      broken: imgs.filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.src),
      noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src),
      h1: document.querySelectorAll('h1').length,
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.content || '',
      dupIds: (() => {
        const s = new Set();
        const d = [];
        for (const e of document.querySelectorAll('[id]')) (s.has(e.id) ? d : s).add ? (s.has(e.id) ? d.push(e.id) : s.add(e.id)) : 0;
        return d;
      })(),
    };
  });
  for (const b of info.broken) problems.push(`image did not load: ${b}`);
  for (const b of info.noAlt) problems.push(`image without alt: ${b}`);
  if (info.h1 !== 1) problems.push(`${info.h1} <h1> elements`);
  if (!info.title || !info.desc) problems.push('missing title or description');
  for (const d of info.dupIds) problems.push(`duplicate id #${d}`);
  for (const j of info.ld) {
    try {
      JSON.parse(j);
    } catch (e) {
      problems.push(`invalid JSON-LD: ${e.message}`);
    }
  }
  anchors.set(p, new Set(info.ids));
  for (const href of info.links) {
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    linkTargets.add(JSON.stringify([p, href]));
  }
  if (problems.length) errors.push(`${p}\n    ${problems.join('\n    ')}`);
  console.log(`${problems.length ? '✗' : '✓'} ${p}  ${info.title}`);
  await page.close();
}

// Internal links and anchors.
const status = new Map();
for (const raw of linkTargets) {
  const [from, href] = JSON.parse(raw);
  if (href.startsWith('#')) {
    if (!anchors.get(from).has(href.slice(1))) errors.push(`${from}: anchor ${href} not found`);
    continue;
  }
  const u = new URL(href, BASE + from);
  const key = u.pathname;
  if (!status.has(key)) {
    const r = await fetch(BASE + key, { redirect: 'follow' });
    status.set(key, { code: r.status, final: new URL(r.url).pathname });
  }
  const s = status.get(key);
  if (s.code !== 200) errors.push(`${from}: link ${href} → HTTP ${s.code}`);
  if (u.hash) {
    const target = s.final === from ? from : s.final;
    if (!anchors.has(target)) {
      const page = await ctx.newPage();
      await page.goto(BASE + target);
      anchors.set(target, new Set(await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id))));
      await page.close();
    }
    if (!anchors.get(target).has(decodeURIComponent(u.hash.slice(1)))) errors.push(`${from}: anchor ${href} not found`);
  }
}
console.log(`checked ${linkTargets.size} internal links`);

// Screenshots for visual review (light and dark, desktop and phone).
async function shoot(name, url, opts, dark, full = true) {
  const c = await browser.newContext({ ...opts, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
  const page = await c.newPage();
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, `${name}-${dark ? 'dark' : 'light'}.png`), fullPage: full });
  await c.close();
}
if (!process.env.NO_SHOTS) {
  const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  for (const dark of [false, true]) {
    await shoot('home-desktop', '/', desktop, dark);
    await shoot('home-phone', '/', phone, dark);
    await shoot('post-desktop', '/blog/how-to-record-your-screen-with-audio-in-chrome', desktop, dark);
  }
  await shoot('blog-desktop', '/blog', desktop, false);
  await shoot('support-desktop', '/support', desktop, false);
  await shoot('privacy-phone', '/privacy', phone, true);
  await shoot('coming-soon-desktop', '/chrome', desktop, false, false);
  await shoot('404-phone', '/nope', phone, false, false);
  console.log(`screenshots in ${path.relative(ROOT, SHOTS)}/`);
}

await browser.close();
server.close();
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('\nAll website checks passed.');
