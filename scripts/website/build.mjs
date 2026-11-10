/**
 * Builds the static website into website/ (deploy that folder to Vercel):
 *   npm run website           (pages, sitemap, feed, vercel.json)
 *   npm run website:assets    (images, social cards and icons; run first, and when screenshots change)
 *
 * The "Add to Chrome" buttons point to STORE_URL once it is set (see scripts/website/config.mjs),
 * and to /chrome, which redirects to /coming-soon, until then.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSTALL_TARGET, SITE, SITE_URL, STORE_URL } from './config.mjs';
import { POSTS } from './meta.mjs';
import { asset, esc, page, THEME_SCRIPT_HASH } from './layout.mjs';
import { homePage } from './content/home.mjs';
import { articlePages, blogPage, comingSoonPage, notFoundPage, privacyPage, supportPage } from './content/pages.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../website');
const write = (rel, data) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};
if (!fs.existsSync(path.join(OUT, 'assets/img/editor-720.avif'))) throw new Error('Run `npm run website:assets` first.');

// ── Script (minified with the oxc minifier that ships with the build tools, if available) ──
const js = fs.readFileSync(path.join(HERE, 'site.js'), 'utf8');
let minJs = js;
try {
  const { minifySync } = await import('rolldown/utils');
  minJs = minifySync('site.js', js, { compress: true, mangle: true }).code;
} catch {
  console.warn('minifier not available: site.js copied as is');
}
write('assets/js/site.js', minJs);

// ── Pages ──
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.html')) fs.rmSync(path.join(OUT, f));
fs.rmSync(path.join(OUT, 'blog'), { recursive: true, force: true });

const pages = [
  { ...homePage(), file: 'index.html' },
  blogPage(),
  ...articlePages(),
  privacyPage(),
  supportPage(),
  ...(STORE_URL ? [] : [comingSoonPage()]),
  notFoundPage(),
];
const problems = [];
const seen = new Map();
for (const p of pages) {
  const html = page(p).replace(/\n{2,}/g, '\n');
  write(p.file, html);
  if (!p.noindex) {
    if (p.title.length > 65) problems.push(`title ${p.title.length} chars: ${p.path}`);
    if (p.description.length < 110 || p.description.length > 160) problems.push(`description ${p.description.length} chars: ${p.path}`);
    for (const key of [p.title, p.description]) {
      if (seen.has(key)) problems.push(`duplicate "${key}" on ${p.path} and ${seen.get(key)}`);
      seen.set(key, p.path);
    }
  }
  console.log(`${p.file.padEnd(72)} ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}
if (problems.length) console.warn(`SEO warnings:\n  ${problems.join('\n  ')}`);

// ── Sitemap, robots, feed, manifest ──
const indexed = pages.filter((p) => !p.noindex);
const lastmod = (p) => p.article?.modified || SITE.published;
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed.map((p) => `<url><loc>${SITE_URL}${p.path === '/' ? '/' : p.path}</loc><lastmod>${lastmod(p)}</lastmod></url>`).join('\n')}
</urlset>
`,
);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const rfc822 = (iso) => new Date(`${iso}T09:00:00Z`).toUTCString();
write(
  'feed.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>FrameShot blog</title>
<link>${SITE_URL}/blog</link>
<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Guides for screenshots and screen recording in Chrome.</description>
<language>en</language>
<lastBuildDate>${rfc822(POSTS.map((p) => p.updated || p.date).sort().at(-1))}</lastBuildDate>
${POSTS.map(
  (p) => `<item>
<title>${esc(p.title)}</title>
<link>${SITE_URL}/blog/${p.slug}</link>
<guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
<pubDate>${rfc822(p.date)}</pubDate>
<dc:creator>${esc(SITE.developer)}</dc:creator>
<category>${esc(p.tag)}</category>
<description>${esc(p.description)}</description>
</item>`,
).join('\n')}
</channel>
</rss>
`,
);
write(
  'site.webmanifest',
  `${JSON.stringify(
    {
      name: 'FrameShot',
      short_name: 'FrameShot',
      description: SITE.description,
      start_url: '/',
      display: 'browser',
      background_color: '#f5f5fa',
      theme_color: SITE.themeColor,
      icons: [
        { src: asset('/assets/img/icon-192.png'), sizes: '192x192', type: 'image/png' },
        { src: asset('/assets/img/icon-512.png'), sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  )}\n`,
);

// ── Vercel: clean URLs, the install redirect, security and cache headers ──
const csp = [
  "default-src 'self'",
  `script-src 'self' ${THEME_SCRIPT_HASH}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');
write(
  'vercel.json',
  `${JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      cleanUrls: true,
      trailingSlash: false,
      redirects: [
        { source: '/chrome', destination: INSTALL_TARGET, permanent: false },
        // Old links to the pre-launch page go straight to the store.
        ...(STORE_URL ? [{ source: '/coming-soon', destination: STORE_URL, permanent: true }] : []),
      ],
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'Content-Security-Policy', value: csp },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ],
        },
        { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
        { source: '/og/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
        { source: '/(favicon.ico|apple-touch-icon.png|site.webmanifest)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
      ],
    },
    null,
    2,
  )}\n`,
);

console.log(`\nWebsite built: ${pages.length} pages → website/  (SITE_URL ${SITE_URL}, Add to Chrome → ${STORE_URL || '/coming-soon (store link not set yet)'})`);
