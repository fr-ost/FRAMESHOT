import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

/**
 * E2E builds are identical to production builds except for two things, both
 * required because automated browsers cannot click the toolbar button to grant
 * `activeTab`:
 *   1. `host_permissions: ["<all_urls>"]` is added to the manifest.
 *   2. A tiny test hook is exposed on the service worker global.
 * Production builds never contain either.
 */
const E2E = process.env.FRAMESHOT_E2E === '1';

// Strict CSP for every extension page and the service worker. `connect-src`
// only allows the extension itself plus blob:/data: URLs, so extension pages
// cannot make network requests even if a bug tried to.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  // E2E builds use production mode (same React build as shipped) in their own folder.
  ...(E2E ? { outDirTemplate: '{{browser}}-mv{{manifestVersion}}-e2e' } : {}),
  imports: false,
  modules: ['@wxt-dev/module-react'],
  zip: {
    artifactTemplate: 'frameshot-{{version}}-chrome.zip',
  },
  manifest: () => ({
    // Written for Chrome Web Store search (see STORE_LISTING.md, "SEO").
    name: 'FrameShot: Free Screen Recorder & Full Page Screenshot',
    short_name: 'FrameShot',
    description:
      'Record your screen with sound and camera, or capture a whole web page in one click. Then annotate, blur and share. No watermark.',
    minimum_chrome_version: '116',
    // `offscreen` lets the service worker play sound effects (camera shutter, countdown).
    permissions: ['activeTab', 'scripting', 'storage', 'unlimitedStorage', 'downloads', 'contextMenus', 'offscreen'],
    ...(E2E ? { host_permissions: ['<all_urls>'] } : {}),
    action: {
      default_title: 'FrameShot — screenshot or record your screen',
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    content_security_policy: {
      extension_pages: CSP,
    },
    commands: {
      'capture-visible': {
        suggested_key: { default: 'Alt+Shift+V' },
        description: 'Capture visible area',
      },
      'capture-full': {
        suggested_key: { default: 'Alt+Shift+F' },
        description: 'Capture full page',
      },
      'capture-area': {
        suggested_key: { default: 'Alt+Shift+A' },
        description: 'Capture selected area',
      },
      'capture-element': {
        suggested_key: { default: 'Alt+Shift+E' },
        description: 'Capture an element',
      },
      'toggle-recording': { description: 'Start or stop a screen recording' },
      'open-studio': { description: 'Open FrameShot Studio' },
      'open-library': { description: 'Open screenshot library' },
      'cancel-capture': { description: 'Cancel the active capture' },
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      __FRAMESHOT_E2E__: JSON.stringify(E2E),
    },
    build: {
      // Keep output readable for Chrome Web Store review; no source maps in prod.
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
    },
  }),
});
