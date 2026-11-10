/** Shared page shell: SEO head, structured data, header, footer and small HTML helpers. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Icons from 'lucide-react';
import { INSTALL_HREF, SITE, SITE_URL, STORE_URL } from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const IMAGES = JSON.parse(fs.readFileSync(path.join(HERE, 'images.json'), 'utf8'));

// Minified once: inlined into every page (no render-blocking request).
const WEB = path.resolve(HERE, '../../website');
const verCache = new Map();
/** A site file URL with a content hash, so /assets can be cached for a year. */
export function asset(url) {
  if (!verCache.has(url)) {
    const data = fs.readFileSync(path.join(WEB, url.replace(/^\//, '')));
    verCache.set(url, `${url}?v=${crypto.createHash('sha256').update(data).digest('hex').slice(0, 10)}`);
  }
  return verCache.get(url);
}
const FONT = '/assets/fonts/inter-var-latin.woff2';

const CSS = fs
  .readFileSync(path.join(HERE, 'styles.css'), 'utf8')
  .replace(`url(${FONT})`, `url(${asset(FONT)})`)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*\n\s*/g, '')
  .replace(/\s*([{};,>])\s*/g, '$1')
  .replace(/;}/g, '}');

/**
 * Sets the theme before first paint (no flash) and marks JS as available, which lets sections fade in.
 * If site.js hasn't run after 4 s (blocked or very slow), the "js" mark is removed so nothing stays hidden.
 * Hashed for the CSP.
 */
export const THEME_SCRIPT =
  "var r=document.documentElement;try{var t=localStorage.getItem('fs-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))r.classList.add('dark')}catch(e){}r.classList.add('js');setTimeout(function(){window.fsReady||r.classList.remove('js')},4000)";
export const THEME_SCRIPT_HASH = `'sha256-${crypto.createHash('sha256').update(THEME_SCRIPT).digest('base64')}'`;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const iconCache = new Map();
/** A lucide icon as inline SVG (decorative). */
export function icon(name, size = 20, stroke = 2) {
  const key = `${name}:${size}:${stroke}`;
  if (!iconCache.has(key)) {
    if (!Icons[name]) throw new Error(`Unknown icon ${name}`);
    iconCache.set(key, renderToStaticMarkup(createElement(Icons[name], { size, strokeWidth: stroke, 'aria-hidden': 'true', focusable: 'false' })));
  }
  return iconCache.get(key);
}

/** A responsive <picture> (AVIF + WebP) from images.json. */
export function picture(name, { alt, sizes = '100vw', cls = '', eager = false, priority = false } = {}) {
  const im = IMAGES[name];
  if (!im) throw new Error(`Unknown image ${name}`);
  const set = (ext) => im.widths.map((w) => `${asset(`/assets/img/${name}-${w}.${ext}`)} ${w}w`).join(', ');
  const fallback = asset(`/assets/img/${name}-${im.widths[0]}.webp`);
  const h = Math.round((im.h / im.w) * im.widths[im.widths.length - 1]);
  return `<picture${cls ? ` class="${cls}"` : ''}><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><img src="${fallback}" srcset="${set('webp')}" sizes="${sizes}" width="${im.widths[im.widths.length - 1]}" height="${h}" alt="${esc(alt)}"${eager ? '' : ' loading="lazy"'} decoding="async"${priority ? ' fetchpriority="high"' : ''}></picture>`;
}

/** A capture inside a browser window frame. */
export function windowFrame(name, { title, alt, sizes, eager, priority, cls = '', dark = '' }) {
  const shots = dark
    ? picture(name, { alt, sizes, eager, priority, cls: 'img-light' }) + picture(dark, { alt, sizes, eager, cls: 'img-dark' })
    : picture(name, { alt, sizes, eager, priority });
  return `<div class="win ${cls}"><div class="win-bar" aria-hidden="true"><i></i><i></i><i></i><span class="win-url"><img src="${asset('/assets/img/logo.svg')}" alt="" width="13" height="13">${esc(title)}</span></div>${shots}</div>`;
}

export function chip(ic, big, small, grad, cls = '') {
  return `<div class="chip ${cls}"><span class="ci ${grad}">${icon(ic, 22)}</span><span><b>${big}</b><small>${small}</small></span></div>`;
}

/** The "Add to Chrome" button (store link once approved, else the coming-soon page). */
export function installButton({ size = '', label = 'Add to Chrome — it’s free', note = false, light = false } = {}) {
  const external = STORE_URL ? ' rel="noopener" target="_blank"' : '';
  // Emerald on light and dark surfaces alike: the one filled call to action.
  const cls = ['btn', 'btn-primary', size].filter(Boolean).join(' ');
  return `<a class="${cls}" href="${esc(INSTALL_HREF)}"${external} data-install>${icon('Puzzle', size === 'btn-sm' ? 17 : 20)}<span class="lbl"><span class="lbl-long">${label}</span>${size === 'btn-sm' ? '<span class="lbl-short sr-only">Add to Chrome</span>' : ''}</span></a>${note ? '<span class="btn-note">Free forever · No account · Works in Google Chrome</span>' : ''}`;
}

// ── Structured data ──
export const ORG = { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: SITE.company, url: SITE_URL, logo: `${SITE_URL}/assets/img/icon-512.png` };
export const PERSON = { '@type': 'Person', '@id': `${SITE_URL}/#developer`, name: SITE.developer, url: SITE.developerUrl, image: `${SITE_URL}/assets/img/developer.webp`, worksFor: { '@id': `${SITE_URL}/#org` } };
export function softwareLd() {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#app`,
    name: 'FrameShot',
    alternateName: 'FrameShot: Free Screen Recorder & Full Page Screenshot',
    description: SITE.description,
    applicationCategory: 'BrowserApplication',
    applicationSubCategory: 'Screen recorder and screenshot tool',
    operatingSystem: 'Windows, macOS, Linux, ChromeOS',
    browserRequirements: 'Requires Google Chrome',
    url: SITE_URL,
    ...(STORE_URL ? { installUrl: STORE_URL, downloadUrl: STORE_URL } : {}),
    image: `${SITE_URL}/og/home.jpg`,
    screenshot: `${SITE_URL}/assets/img/editor-1440.webp`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@id': `${SITE_URL}/#developer` },
    publisher: { '@id': `${SITE_URL}/#org` },
    isAccessibleForFree: true,
  };
}
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...obj }).replace(/</g, '\\u003c')}</script>`;
export function breadcrumbLd(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE_URL}${url}` })) };
}

const NAV = [
  ['/#features', 'Features'],
  ['/#recorder', 'Screen recorder'],
  ['/#privacy', 'Privacy'],
  ['/#faq', 'FAQ'],
  ['/blog', 'Blog'],
];

function header(current) {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="wrap hdr-in">
<a class="brand" href="/" aria-label="FrameShot home"><img src="${asset('/assets/img/logo.svg')}" alt="" width="34" height="34">FrameShot</a>
<nav class="nav" id="nav" aria-label="Main">${NAV.map(([href, label]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
<div class="hdr-end">
<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch between light and dark theme">${icon('Sun', 18).replace('<svg', '<svg class="theme-sun"')}${icon('Moon', 18).replace('<svg', '<svg class="theme-moon"')}</button>
<button class="icon-btn menu-btn" type="button" data-menu aria-controls="nav" aria-expanded="false" aria-label="Menu">${icon('Menu', 19)}</button>
${installButton({ size: 'btn-sm', label: 'Add to Chrome' })}
</div></div></header>`;
}

function footer() {
  return `<footer class="ftr"><div class="wrap">
<div class="ftr-grid">
<div><a class="brand" href="/"><img src="${asset('/assets/img/logo.svg')}" alt="" width="34" height="34" loading="lazy">FrameShot</a>
<p>The free screen recorder and full-page screenshot extension for Chrome. No watermark, no account, nothing uploaded.</p>
<a class="dev" href="${SITE.developerUrl}" rel="noopener" target="_blank"><img src="${asset('/assets/img/developer.webp')}" alt="Shahriar Ahmed" width="44" height="44" loading="lazy"><span><b>Shahriar Ahmed</b><small>Developer · Unique Labs · www.shahriarahmed.net</small></span></a></div>
<div><h2>Product</h2><ul><li><a href="/#features">Features</a></li><li><a href="/#recorder">Screen recorder</a></li><li><a href="/#full-page">Full-page screenshots</a></li><li><a href="/#why">Why FrameShot</a></li><li><a href="/#faq">FAQ</a></li></ul></div>
<div><h2>Guides</h2><ul><li><a href="/blog/how-to-take-a-full-page-screenshot-in-chrome">Full-page screenshots</a></li><li><a href="/blog/how-to-record-your-screen-with-audio-in-chrome">Record with audio</a></li><li><a href="/blog/how-to-blur-or-redact-sensitive-information-in-screenshots">Blur &amp; redact</a></li><li><a href="/blog">All articles</a></li></ul></div>
<div><h2>FrameShot</h2><ul><li><a href="/privacy">Privacy policy</a></li><li><a href="/support">Support FrameShot</a></li><li><a href="${SITE.telegram}" rel="noopener" target="_blank">Contact (Telegram)</a></li><li><a href="/feed.xml">RSS feed</a></li></ul></div>
</div>
<div class="legal"><span>© 2026 Unique Labs. A product of Unique Labs, developed by <a href="${SITE.developerUrl}" rel="noopener" target="_blank">Shahriar Ahmed</a>.</span><span>Chrome and the Chrome Web Store are trademarks of Google LLC.</span></div>
</div></footer>`;
}

/**
 * A full HTML page.
 * @param {{path:string,title:string,description:string,body:string,og?:string,type?:string,ld?:object[],current?:string,noindex?:boolean,preload?:string[],article?:object}} p
 */
export function page(p) {
  const url = `${SITE_URL}${p.path === '/' ? '/' : p.path}`;
  const og = `${SITE_URL}/og/${p.og || 'home'}.jpg`;
  const graph = [ORG, PERSON, { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, url: SITE_URL, name: 'FrameShot', publisher: { '@id': `${SITE_URL}/#org` } }, ...(p.ld || [])];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
${p.noindex ? '' : `<link rel="canonical" href="${url}">`}
${p.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1c1c1c" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="${p.type || 'website'}">
<meta property="og:site_name" content="FrameShot">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${SITE.locale}">
${p.article ? `<meta property="article:published_time" content="${p.article.published}">\n<meta property="article:modified_time" content="${p.article.modified}">\n<meta property="article:author" content="${SITE.developerUrl}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="${asset('/assets/img/logo.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="FrameShot blog" href="${SITE_URL}/feed.xml">
<link rel="preload" href="${asset(FONT)}" as="font" type="font/woff2" crossorigin>
${(p.preload || []).join('\n')}
<script>${THEME_SCRIPT}</script>
<style>${CSS}</style>
${ld({ '@graph': graph })}
</head>
<body>
<div id="top-sentinel" style="position:absolute;top:0;height:8px;width:1px"></div>
${header(p.current)}
<main id="main">
${p.body}
</main>
${footer()}
<script src="${asset('/assets/js/site.js')}" defer></script>
</body>
</html>
`;
}
