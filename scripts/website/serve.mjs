/**
 * Serves website/ locally the way Vercel does (clean URLs, the /chrome redirect,
 * the headers from vercel.json, compression and the 404 page):
 *   npm run website:serve     → http://localhost:4173
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../website');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const COMPRESS = /^(text\/|application\/(json|xml|manifest)|image\/svg)/;

export function serve(port = 4173) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const rules = cfg.headers.map((h) => ({ re: new RegExp(`^${h.source}$`), headers: h.headers }));
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    for (const r of cfg.redirects) {
      if (r.source === p) {
        res.writeHead(r.permanent ? 308 : 307, { Location: r.destination });
        return res.end();
      }
    }
    if (p.length > 1 && p.endsWith('/')) {
      res.writeHead(308, { Location: p.replace(/\/+$/, '') + url.search });
      return res.end();
    }
    if (p.endsWith('.html')) {
      res.writeHead(308, { Location: p.replace(/(\/index)?\.html$/, '') || '/' });
      return res.end();
    }
    const candidates = p === '/' ? ['index.html'] : [p.slice(1), `${p.slice(1)}.html`, `${p.slice(1)}/index.html`];
    let file = candidates.map((c) => path.join(ROOT, c)).find((f) => f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile());
    let status = 200;
    if (!file) {
      file = path.join(ROOT, '404.html');
      status = 404;
    }
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const headers = { 'Content-Type': type };
    for (const r of rules) if (r.re.test(p)) for (const h of r.headers) headers[h.key] = h.value;
    let body = fs.readFileSync(file);
    const enc = req.headers['accept-encoding'] || '';
    if (COMPRESS.test(type) && /\bbr\b/.test(enc)) {
      body = zlib.brotliCompressSync(body);
      headers['Content-Encoding'] = 'br';
    } else if (COMPRESS.test(type) && /\bgzip\b/.test(enc)) {
      body = zlib.gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 4173;
  await serve(port);
  console.log(`FrameShot website: http://localhost:${port}`);
}
