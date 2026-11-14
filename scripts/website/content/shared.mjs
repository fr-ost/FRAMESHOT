/** Helpers shared by the home page, the blog index and the articles. */
import { esc, picture } from '../layout.mjs';
import { BODIES } from './posts.mjs';

export function formatDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

const words = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
export function wordCount(slug) {
  const b = BODIES[slug];
  return words(b.intro) + b.sections.reduce((n, s) => n + words(s.h) + words(s.html), 0);
}
export const readingMinutes = (slug) => Math.max(1, Math.round(wordCount(slug) / 220));

export function postCard(p, i = 0, { featured = false } = {}) {
  const sizes = featured ? '(max-width: 620px) 92vw, (max-width: 980px) 92vw, 640px' : '(max-width: 620px) 92vw, (max-width: 980px) 46vw, 380px';
  return `<a class="card post-card lift reveal${featured ? ' featured' : ''}" style="--i:${i % 3}" href="/blog/${p.slug}" data-tag="${esc(p.tag)}"><div class="pc-img">${picture(`og-${p.slug}`, { alt: '', sizes })}</div><div class="pc-body"><span class="tag">${featured ? 'Latest · ' : ''}${esc(p.tag)}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><span class="meta"><time datetime="${p.date}">${formatDate(p.date)}</time> · ${readingMinutes(p.slug)} min read</span></div></a>`;
}
