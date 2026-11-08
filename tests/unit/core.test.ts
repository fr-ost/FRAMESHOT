import { describe, expect, it } from 'vitest';
import { buildFilename, defaultItemName, renderTemplate, sanitizeBasename, uniquifyNames, withFolder } from '../../src/core/filename';
import { checkPageAccess, domainOf, friendlyCaptureError, isSafeLink } from '../../src/core/restricted';
import { DEFAULT_SETTINGS, mergeSettings, sanitizeFolder, sanitizeSettings } from '../../src/core/settings';
import { formatBytes, formatDimensions } from '../../src/core/format';

const date = new Date(2026, 10, 7, 9, 5, 3);

describe('filename templates', () => {
  it('renders tokens', () => {
    expect(renderTemplate('frameshot-{domain}-{date}-{time}', { date, domain: 'www.example.com' })).toBe('frameshot-example.com-2026-11-07-09-05-03');
    expect(renderTemplate('{mode}_{width}x{height}', { mode: 'full', width: 1280.4, height: 7200 })).toBe('full_1280x7200');
  });

  it('leaves unknown tokens untouched and sanitizes values', () => {
    const out = renderTemplate('{title}-{nope}', { title: 'A/B: "C" <d>' });
    expect(out).toContain('{nope}');
    expect(out).not.toMatch(/[<>:"/\\|?*]/);
    expect(out.startsWith('A-B')).toBe(true);
  });

  it('builds safe filenames with the right extension', () => {
    expect(buildFilename('frameshot-{domain}', { domain: 'example.com' }, 'jpeg')).toBe('frameshot-example.com.jpg');
    expect(buildFilename('{title}', { title: '' }, 'png')).toBe('frameshot-screenshot.png');
    expect(buildFilename('frameshot--{domain}--', { domain: '' }, 'pdf')).toBe('frameshot.pdf');
    expect(buildFilename('{title}', { title: 'CON' }, 'png')).toBe('frameshot-screenshot.png');
    expect(buildFilename('a'.repeat(300), {}, 'webp')).toHaveLength(120 + 5);
  });

  it('sanitizes control and reserved characters', () => {
    expect(sanitizeBasename('  ..bad\u0000name?*.  ')).toBe('badname');
    expect(sanitizeBasename('...')).toBe('frameshot-screenshot');
  });

  it('joins folders and de-duplicates batch names', () => {
    expect(withFolder('FrameShot', 'a.png')).toBe('FrameShot/a.png');
    expect(withFolder('', 'a.png')).toBe('a.png');
    expect(uniquifyNames(['a.png', 'A.png', 'b.png', 'a.png'])).toEqual(['a.png', 'A (2).png', 'b.png', 'a (3).png']);
  });

  it('creates readable default names', () => {
    expect(defaultItemName({ title: 'Docs', date })).toBe('Docs — 2026-11-07 09.05.03');
    expect(defaultItemName({ domain: 'www.x.org', date })).toBe('x.org — 2026-11-07 09.05.03');
  });
});

describe('settings validation', () => {
  it('returns defaults for garbage input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps and validates every field', () => {
    const s = sanitizeSettings({
      theme: 'neon',
      defaultFormat: 'gif',
      jpegQuality: 7,
      webpQuality: -1,
      filenameTemplate: '   ',
      capture: { settleDelayMs: 99999, maxPageHeight: 10, fixedElements: 'keep', oversize: 'scale' },
      pdf: { pageSize: 'letter', marginPt: 1000 },
    });
    expect(s.theme).toBe('system');
    expect(s.defaultFormat).toBe('png');
    expect(s.jpegQuality).toBe(1);
    expect(s.webpQuality).toBe(0.5);
    expect(s.filenameTemplate).toBe(DEFAULT_SETTINGS.filenameTemplate);
    expect(s.capture.settleDelayMs).toBe(3000);
    expect(s.capture.maxPageHeight).toBe(2000);
    expect(s.capture.fixedElements).toBe('keep');
    expect(s.capture.oversize).toBe('scale');
    expect(s.pdf).toEqual({ pageSize: 'letter', marginPt: 96 });
  });

  it('merges nested patches', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, { capture: { preloadLazyContent: false }, theme: 'dark' });
    expect(s.theme).toBe('dark');
    expect(s.capture.preloadLazyContent).toBe(false);
    expect(s.capture.fixedElements).toBe('smart');
  });

  it('sanitizes download folders to safe relative paths', () => {
    expect(sanitizeFolder('../../etc/passwd')).toBe('etc/passwd');
    expect(sanitizeFolder('C:\\Users\\me')).toBe('C/Users/me');
    expect(sanitizeFolder(' FrameShot / Shots? ')).toBe('FrameShot/Shots');
    expect(sanitizeFolder(42)).toBe('');
  });
});

describe('page access', () => {
  it('refuses browser and store pages', () => {
    expect(checkPageAccess('chrome://settings').allowed).toBe(false);
    expect(checkPageAccess('chrome-extension://abc/page.html').allowed).toBe(false);
    expect(checkPageAccess('https://chromewebstore.google.com/detail/x').allowed).toBe(false);
    expect(checkPageAccess('https://example.com').allowed).toBe(true);
    expect(checkPageAccess(undefined).allowed).toBe(true);
  });

  it('extracts domains and only links http(s)', () => {
    expect(domainOf('https://www.example.com/a?b')).toBe('example.com');
    expect(domainOf('file:///tmp/a.html')).toBe('local file');
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('https://x.y')).toBe(true);
  });

  it('explains Chrome errors in plain language', () => {
    expect(friendlyCaptureError('Cannot access contents of url "chrome://x"')).toMatch(/does not allow/);
    expect(friendlyCaptureError("The 'activeTab' permission is not in effect", false)).toMatch(/does not allow/);
    expect(friendlyCaptureError("The 'activeTab' permission is not in effect", true)).toMatch(/toolbar button/);
    expect(friendlyCaptureError('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')).toMatch(/limited/);
  });
});

describe('formatting', () => {
  it('formats bytes and dimensions', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB');
    expect(formatDimensions(1280, 7200)).toBe('1,280 × 7,200');
  });
});
