/** Blog index, articles, privacy policy, support, coming soon and 404 pages. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, SITE_URL, STORE_URL } from '../config.mjs';
import { POSTS } from '../meta.mjs';
import { asset, breadcrumbLd, esc, icon, installButton, softwareLd, windowFrame } from '../layout.mjs';
import { BODIES } from './posts.mjs';
import { formatDate, postCard, readingMinutes, wordCount } from './shared.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// The white canvas is the design: no backdrop behind page headers.
const aurora = '';
const crumbs = (items) =>
  `<nav aria-label="Breadcrumb"><ol class="crumbs">${items.map(([name, url], i) => (i === items.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${url}">${esc(name)}</a></li>`)).join('')}</ol></nav>`;
const byline = (date, minutes) =>
  `<div class="byline"><a class="dev" href="${SITE.developerUrl}" rel="noopener author" target="_blank"><img src="${asset('/assets/img/developer.webp')}" alt="" width="44" height="44"><span><b>${SITE.developer}</b><small>Developer of FrameShot</small></span></a><span class="bl-item">${icon('CalendarDays', 16)}<time datetime="${date}">${formatDate(date)}</time></span>${minutes ? `<span class="bl-item">${icon('Clock', 16)}${minutes} min read</span>` : ''}</div>`;

const tryCard = () =>
  `<div class="card art-cta"><div><b>Try FrameShot free</b><small>Full-page screenshots and screen recording for Chrome. No watermark, no account, nothing uploaded.</small></div>${installButton({ label: 'Add to Chrome' })}</div>`;

// ── Articles ──
export function articlePages() {
  return POSTS.map((post) => {
    const body = BODIES[post.slug];
    if (!body) throw new Error(`No body for ${post.slug}`);
    const url = `/blog/${post.slug}`;
    const minutes = readingMinutes(post.slug);
    const related = [...POSTS.filter((p) => p.slug !== post.slug && p.tag === post.tag), ...POSTS.filter((p) => p.slug !== post.slug && p.tag !== post.tag)].slice(0, 3);
    const html = `
<div class="progress" aria-hidden="true"></div>
<article>
<header class="art-head">${aurora}<div class="wrap">
${crumbs([['Home', '/'], ['Blog', '/blog'], [post.title, url]])}
<span class="eyebrow" style="margin-top:22px">${esc(post.tag)}</span>
<h1>${esc(post.title)}</h1>
<p class="lead">${esc(post.description)}</p>
${byline(post.date, minutes)}
</div></header>
<div class="wrap">
<div class="art-hero">${windowFrame(post.image, { title: 'FrameShot Studio', alt: post.alt, sizes: '(max-width: 1220px) 94vw, 1180px', eager: true, priority: true })}</div>
<div class="art-layout">
<div class="prose">
${body.intro}
${body.sections.map((s) => `<h2 id="${s.id}">${s.h}</h2>\n${s.html}`).join('\n')}
${tryCard()}
</div>
<aside class="toc card" aria-label="On this page"><b>On this page</b><ol>${body.sections.map((s) => `<li><a href="#${s.id}">${s.h}</a></li>`).join('')}</ol></aside>
</div>
</div>
</article>
<section class="section">
<div class="wrap">
<div class="sec-head left reveal"><span class="eyebrow">${icon('BookOpen', 16)}Keep reading</span><h2>More guides</h2></div>
<div class="post-grid">${related.map((p, i) => postCard(p, i)).join('\n')}</div>
</div>
</section>`;
    const ld = [
      {
        '@type': 'BlogPosting',
        '@id': `${SITE_URL}${url}#article`,
        headline: post.title,
        description: post.description,
        image: [`${SITE_URL}/og/${post.slug}.jpg`],
        datePublished: post.date,
        dateModified: post.updated || post.date,
        author: { '@id': `${SITE_URL}/#developer` },
        publisher: { '@id': `${SITE_URL}/#org` },
        mainEntityOfPage: `${SITE_URL}${url}`,
        isPartOf: { '@id': `${SITE_URL}/blog#blog` },
        about: { '@id': `${SITE_URL}/#app` },
        wordCount: wordCount(post.slug),
        inLanguage: 'en',
      },
      breadcrumbLd([['Home', '/'], ['Blog', '/blog'], [post.title, url]]),
    ];
    return {
      path: url,
      file: `blog/${post.slug}.html`,
      title: `${post.title} | FrameShot`.length <= 62 ? `${post.title} | FrameShot` : post.title,
      description: post.description,
      og: post.slug,
      type: 'article',
      article: { published: post.date, modified: post.updated || post.date },
      current: '/blog',
      body: html,
      ld,
    };
  });
}

// ── Blog index ──
export function blogPage() {
  const body = `
<header class="art-head">${aurora}<div class="wrap">
${crumbs([['Home', '/'], ['Blog', '/blog']])}
<h1>Guides for screenshots and <span class="grad">screen recording</span></h1>
<p class="lead">Practical, no-nonsense guides to capturing web pages, recording your screen with sound, hiding private details and sharing your work clearly.</p>
</div></header>
<section class="section-tight" style="padding-top:20px">
<div class="wrap"><h2 class="sr-only">All guides</h2><div class="post-grid">${POSTS.map((p, i) => postCard(p, i)).join('\n')}</div></div>
</section>
<section class="section-tight"><div class="wrap"><div class="cta reveal"><h2>Put a guide into practice</h2><p>FrameShot is free, works offline and never uploads your files.</p>${installButton({ size: 'btn-lg', light: true, note: true })}</div></div></section>`;
  const ld = [
    {
      '@type': 'Blog',
      '@id': `${SITE_URL}/blog#blog`,
      url: `${SITE_URL}/blog`,
      name: 'FrameShot blog',
      description: 'Guides for screenshots and screen recording in Chrome.',
      publisher: { '@id': `${SITE_URL}/#org` },
      blogPost: POSTS.map((p) => ({ '@type': 'BlogPosting', '@id': `${SITE_URL}/blog/${p.slug}#article`, headline: p.title, url: `${SITE_URL}/blog/${p.slug}`, datePublished: p.date })),
    },
    breadcrumbLd([['Home', '/'], ['Blog', '/blog']]),
  ];
  return {
    path: '/blog',
    file: 'blog/index.html',
    title: 'FrameShot Blog: Screenshot and Screen Recording Guides',
    description: 'Step-by-step guides to full-page screenshots, screen recording with sound, GIFs, redacting private details and clearer bug reports in Chrome.',
    og: 'blog',
    current: '/blog',
    body,
    ld,
  };
}

// ── Privacy policy (rendered from PRIVACY.md, the same text as the extension's policy) ──
function inline(md) {
  return esc(md)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="noopener" target="_blank">$1</a>');
}
function markdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const toc = [];
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      i++;
      continue; // the page header carries the title
    }
    if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      toc.push([id, text]);
      out.push(`<h2 id="${id}">${inline(text)}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...rest] = rows;
      out.push(`<div class="table-wrap"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||- )/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return { html: out.join('\n'), toc };
}

export function privacyPage() {
  const md = fs.readFileSync(path.join(ROOT, 'PRIVACY.md'), 'utf8');
  const updated = /Last updated: (\d{4}-\d{2}-\d{2})/.exec(md)?.[1] || SITE.published;
  const { html, toc } = markdown(md);
  const body = `
<header class="art-head">${aurora}<div class="wrap">
${crumbs([['Home', '/'], ['Privacy policy', '/privacy']])}
<h1>Privacy policy</h1>
<p class="lead">FrameShot never uploads your screenshots or recordings, and never sells or shares data. It only sends anonymous install counts, which you can turn off. Here is exactly what it stores, what it sends, and why.</p>
<div class="byline"><span class="bl-item">${icon('CalendarDays', 16)}Last updated <time datetime="${updated}">${formatDate(updated)}</time></span><span class="bl-item">${icon('ShieldCheck', 16)}Applies to the FrameShot Chrome extension and this website</span></div>
</div></header>
<div class="wrap">
<div class="art-layout" style="margin-top:20px">
<div class="prose">
${html}
<h2 id="website">This website</h2>
<p>This website is a set of static pages. It uses no cookies, no analytics and no third-party scripts, fonts or embeds. Your theme choice (light or dark) is remembered in your own browser’s local storage and never leaves it. Like any web host, our hosting provider may keep standard server logs, such as IP addresses and the pages requested, for security and reliability.</p>
</div>
<aside class="toc card" aria-label="On this page"><b>On this page</b><ol>${[...toc, ['website', 'This website']].map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></aside>
</div>
</div>`;
  return {
    path: '/privacy',
    file: 'privacy.html',
    title: 'Privacy Policy | FrameShot',
    description: 'Your screenshots, recordings and settings stay in your browser. FrameShot only sends anonymous install counts, which you can turn off. Read the full policy.',
    og: 'privacy',
    body,
    ld: [{ '@type': 'WebPage', '@id': `${SITE_URL}/privacy#webpage`, url: `${SITE_URL}/privacy`, name: 'FrameShot privacy policy', dateModified: updated, isPartOf: { '@id': `${SITE_URL}/#site` } }, breadcrumbLd([['Home', '/'], ['Privacy policy', '/privacy']])],
  };
}

// ── Support (donation addresses come straight from the extension's own data) ──
function wallets() {
  const src = fs.readFileSync(path.join(ROOT, 'src/core/donate.ts'), 'utf8');
  const m = /export const WALLETS[^=]*=\s*(\[[\s\S]*?\n\]);/.exec(src);
  if (!m) throw new Error('WALLETS not found in src/core/donate.ts');
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m[1]}`)();
}

export function supportPage() {
  const rate = STORE_URL
    ? `<a class="btn btn-sm" href="${esc(STORE_URL.replace(/\/+$/, ''))}/reviews" rel="noopener" target="_blank">${icon('Star', 16)}Rate FrameShot</a>`
    : '<span class="subtle" style="font-size:14px">Available as soon as FrameShot is live on the Chrome Web Store.</span>';
  const cards = wallets()
    .map(
      (w, i) => `<article class="card wallet reveal" style="--i:${i}">
<div class="toks">${w.tokens.map((t) => `<img src="${asset(`/assets${t.src}`)}" alt="${esc(t.alt)}" width="32" height="32" loading="lazy">`).join('')}</div>
<h3>${esc(w.title)}</h3><p class="subtle" style="font-size:14px;margin-top:4px">${esc(w.subtitle)}</p>
<div class="qr"><img src="${asset(`/assets${w.qr}`)}" alt="QR code for the ${esc(w.title)} donation address" width="150" height="150" loading="lazy"></div>
<code>${esc(w.address)}</code>
<button class="btn btn-sm" type="button" data-copy="${esc(w.address)}">${icon('Copy', 16)}<span>Copy address</span></button>
<p class="subtle" style="font-size:13px;margin-top:12px">${esc(w.note)}</p>
</article>`,
    )
    .join('\n');
  const body = `
<header class="art-head">${aurora}<div class="wrap">
${crumbs([['Home', '/'], ['Support FrameShot', '/support']])}
<h1>Keep FrameShot <span class="grad">free for everyone</span></h1>
<p class="lead">FrameShot has no ads, no paid plan and no investors. If it saves you time, here is how you can help. Most of it costs nothing.</p>
</div></header>
<section class="section-tight" style="padding-top:16px">
<div class="wrap">
<h2 class="mini-h">Free ways to help</h2>
<div class="help-grid">
<article class="card why reveal"><h3><span>${icon('Star', 19)}</span>Leave a rating</h3><p>A five-star rating and a sentence about what you use FrameShot for helps other people find it more than anything else.</p><div style="margin-top:16px">${rate}</div></article>
<article class="card why reveal" style="--i:1"><h3><span>${icon('Share2', 19)}</span>Tell someone</h3><p>Know a teacher, a tester or a designer who still pastes screenshots together by hand? Send them this site.</p></article>
<article class="card why reveal" style="--i:2"><h3><span>${icon('Send', 19)}</span>Report bugs and ideas</h3><p>Found something broken, or missing a feature? Message the developer on Telegram. Every report is read.</p><div style="margin-top:16px"><a class="btn btn-sm" href="${SITE.telegram}" rel="noopener" target="_blank">${icon('Send', 16)}Open Telegram</a></div></article>
</div>
</div>
</section>
<section class="section-tight" id="donate">
<div class="wrap">
<div class="sec-head reveal"><span class="eyebrow">${icon('Heart', 16)}Donate</span><h2>Buy the developer a coffee</h2><p>Donations are optional and unlock nothing: every feature is already free. They pay for the time that goes into new features and fixes.</p></div>
<div class="wallets">${cards}</div>
<div class="callout reveal" style="max-width:760px;margin:26px auto 0">${icon('TriangleAlert', 20)}<div><p>Always check the network before you send. Crypto sent on the wrong network can be lost, and donations can’t be refunded.</p></div></div>
</div>
</section>
<section class="section-tight">
<div class="wrap">
<a class="card dev-card reveal" href="${SITE.developerUrl}" rel="noopener" target="_blank"><img src="${asset('/assets/img/developer.webp')}" alt="Shahriar Ahmed" width="96" height="96" loading="lazy"><span><small>Made by</small><b>${SITE.developer}</b><span class="muted">Developer at ${SITE.company} · www.shahriarahmed.net</span></span>${icon('ArrowUpRight', 22)}</a>
</div>
</section>`;
  return {
    path: '/support',
    file: 'support.html',
    title: 'Support FrameShot: Keep It Free | FrameShot',
    description: 'Help keep FrameShot free: rate it, tell a friend, report bugs, or donate. Donations are optional and unlock nothing, because every feature is already free.',
    og: 'support',
    body,
    ld: [{ '@type': 'WebPage', '@id': `${SITE_URL}/support#webpage`, url: `${SITE_URL}/support`, name: 'Support FrameShot', isPartOf: { '@id': `${SITE_URL}/#site` } }, breadcrumbLd([['Home', '/'], ['Support FrameShot', '/support']])],
  };
}

// ── Coming soon (where "Add to Chrome" points until the store link is set) ──
export function comingSoonPage() {
  const body = `
<section class="hero center" style="padding:96px 0">
${aurora}
<div class="wrap" style="max-width:760px">
<span class="kicker"><b>SOON</b>Chrome Web Store</span>
<h1 style="margin-top:22px;font-size:clamp(38px,5vw,60px);letter-spacing:-.045em">FrameShot is <span class="grad">almost here</span></h1>
<p class="lead" style="margin-inline:auto">The Chrome Web Store listing is on its way. As soon as it’s live, every Add to Chrome button on this site takes you straight to it.</p>
<div class="cta-row" style="justify-content:center"><a class="btn btn-primary btn-lg" href="/">${icon('House', 19)}Back to the home page</a><a class="btn btn-lg" href="/blog">${icon('BookOpen', 19)}Read the guides</a></div>
<p class="subtle" style="margin-top:26px;font-size:15px">Questions in the meantime? Message the developer on <a href="${SITE.telegram}" rel="noopener" target="_blank">Telegram</a>.</p>
</div>
</section>`;
  return { path: '/coming-soon', file: 'coming-soon.html', title: 'Coming Soon to the Chrome Web Store | FrameShot', description: 'FrameShot is on its way to the Chrome Web Store. Every Add to Chrome button on this site will open the listing as soon as it is live.', og: 'home', noindex: true, body, ld: [softwareLd()] };
}

export function notFoundPage() {
  const body = `
<section class="hero center" style="padding:110px 0">
${aurora}
<div class="wrap" style="max-width:720px">
<p class="nf-code grad" aria-hidden="true">404</p>
<h1 style="font-size:clamp(34px,4.6vw,52px);letter-spacing:-.04em">This page wasn’t captured</h1>
<p class="lead" style="margin-inline:auto">The page you’re looking for doesn’t exist or has moved. Here are a few good places to start.</p>
<div class="cta-row" style="justify-content:center"><a class="btn btn-primary btn-lg" href="/">${icon('House', 19)}Home</a><a class="btn btn-lg" href="/blog">${icon('BookOpen', 19)}Guides</a><a class="btn btn-lg" href="/#faq">${icon('CircleHelp', 19)}FAQ</a></div>
</div>
</section>`;
  return { path: '/404', file: '404.html', title: 'Page Not Found | FrameShot', description: 'This page does not exist. Find FrameShot’s features, guides and answers to common questions from the home page.', og: 'home', noindex: true, body };
}
