// Audits a production build for Chrome Web Store readiness and privacy rules.
// Usage: node scripts/check-bundle.mjs .output/chrome-mv3
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? '.output/chrome-mv3');
const problems = [];
const notes = [];
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(dir);

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
// Sorted. `offscreen` only plays sound effects; it shows no install warning.
const EXPECTED_PERMISSIONS = ['activeTab', 'contextMenus', 'downloads', 'offscreen', 'scripting', 'storage', 'unlimitedStorage'];
if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');
if (JSON.stringify([...(manifest.permissions ?? [])].sort()) !== JSON.stringify(EXPECTED_PERMISSIONS)) {
  problems.push(`unexpected permissions: ${JSON.stringify(manifest.permissions)}`);
}
if (manifest.host_permissions?.length) problems.push(`host_permissions must be empty in production: ${manifest.host_permissions}`);
if (manifest.optional_host_permissions?.length) problems.push('unexpected optional_host_permissions');
if (manifest.content_scripts?.length) problems.push('no declarative content scripts expected (injection is on demand)');
if (manifest.name.length > 75) problems.push('name longer than 75 characters');
if ((manifest.description ?? '').length > 132) problems.push('description longer than 132 characters');
for (const size of ['16', '32', '48', '128']) {
  const icon = manifest.icons?.[size];
  if (!icon || !fs.existsSync(path.join(dir, icon))) problems.push(`missing ${size}px icon`);
}
const csp = manifest.content_security_policy?.extension_pages ?? '';
// The only remote origin allowed anywhere: FrameShot's own tracker Worker (anonymous install counts).
const TELEMETRY_ORIGIN = 'https://frameshot.shahriarahmed614.workers.dev';
for (const directive of ["script-src 'self'", `connect-src 'self' blob: data: ${TELEMETRY_ORIGIN}`, "object-src 'none'"]) {
  if (!csp.includes(directive)) problems.push(`CSP missing: ${directive}`);
}
if (/unsafe-eval|https?:/.test(csp.replace("'wasm-unsafe-eval'", '').replace(TELEMETRY_ORIGIN, ''))) problems.push('CSP allows eval or remote origins other than the tracker');

// Strings that may legitimately appear in the bundle but never trigger a
// request from the extension: library namespace/error-doc strings, the
// Tailwind license banner, and the developer credit link in the footer
// (a normal <a target="_blank"> the user may click; it opens a new tab).
// Links opened only when the user clicks: the developer credit and the Web Store review page.
const ALLOWED_URL = [/^https:\/\/frameshot\.shahriarahmed614\.workers\.dev;?$/, /^https:\/\/www\.shahriarahmed\.net$/, /^https:\/\/t\.me\/igfrostt$/, /^https:\/\/chromewebstore\.google\.com\/detail\//, /^https:\/\/tailwindcss\.com$/, /^https?:\/\/www\.w3\.org\//, /^https:\/\/react\.dev\/errors\//, /^https:\/\/reactjs\.org\/docs\/error-decoder/, /^https:\/\/github\.com\/radix-ui\//];
// pdf.js (renders PDFs for full-page PDF captures, src/pdf/) carries a few inert strings:
// core-js license links, a template that adds "http://" to bare "www." links inside a
// PDF, and a PostScript-function compiler that uses `new Function`. That compiler is
// switched off (isEvalSupported: false in src/pdf/render.ts) and the extension CSP
// forbids eval anyway. These are allowed only inside the pdf.js files.
const PDFJS_FILE = /^(chunks\/pdf-[\w-]+\.js|assets\/pdf\.worker\.min-[\w-]+\.mjs)$/;
// …plus XML namespace names (xfa.org, ns.adobe.com) used by its form parser, and the Apache license link.
const PDFJS_URL = [/^https:\/\/github\.com\/zloirock\/core-js/, /^http:\/\/\$\{/, /^https:\/\/github\.com\/mozilla\/pdf\.js/, /^http:\/\/www\.xfa\.org\/schema\//, /^http:\/\/ns\.adobe\.com\//, /^http:\/\/www\.apache\.org\/licenses\//];
let pdfjsFiles = 0;
for (const f of files) {
  const rel = path.relative(dir, f);
  const isPdfjs = PDFJS_FILE.test(rel);
  if (isPdfjs) pdfjsFiles++;
  if (rel.endsWith('.map')) problems.push(`source map shipped: ${rel}`);
  if (!/\.(m?js|html|css|json)$/.test(f)) continue;
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
    if (!ALLOWED_URL.some((re) => re.test(m[0])) && !(isPdfjs && PDFJS_URL.some((re) => re.test(m[0])))) problems.push(`remote URL in ${rel}: ${m[0]}`);
    else notes.push(`allowed inert URL string in ${rel}: ${m[0].slice(0, 60)}`);
  }
  if (/\beval\s*\(/.test(text) || (/new Function\s*\(/.test(text) && !isPdfjs)) problems.push(`dynamic code execution in ${rel}`);
  if (/__frameshotTest|__frameshotEditor|__frameshotRecorder|frameshot\.e2e\.limits/.test(text)) problems.push(`test hook present in ${rel}`);
  if (/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(text) && rel.endsWith('.html')) problems.push(`inline script in ${rel}`);
  if (/importScripts\(\s*['"]https?:/.test(text)) problems.push(`remote importScripts in ${rel}`);
}
if (pdfjsFiles !== 2) problems.push(`expected the pdf.js library and worker (2 files), found ${pdfjsFiles}`);
const total = files.reduce((s, f) => s + fs.statSync(f).size, 0);
console.log(`Checked ${files.length} files (${(total / 1024).toFixed(0)} KB) in ${path.relative(process.cwd(), dir)}`);
for (const n of [...new Set(notes)]) console.log('  note:', n);
if (problems.length) {
  console.error('\nBundle check FAILED:');
  for (const p of problems) console.error('  ✗', p);
  process.exit(1);
}
console.log('Bundle check passed: MV3, minimal permissions, no host permissions, strict CSP (only the install-count Worker), no remote code, no eval, no test hooks, no source maps.');
