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
const E2E = process.env.FRAMEORA_E2E === '1';

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
  imports: false,
  modules: ['@wxt-dev/module-react'],
  zip: {
    artifactTemplate: 'frameora-{{version}}-chrome.zip',
  },
  manifest: () => ({
    name: 'Frameora: Free Screenshot & Full Page Capture',
    short_name: 'Frameora',
    description:
      'Capture, edit, organize, and export screenshots with a complete browser-based toolkit. Free forever. Local-first.',
    minimum_chrome_version: '116',
    permissions: ['activeTab', 'scripting', 'storage', 'unlimitedStorage', 'downloads', 'contextMenus'],
    ...(E2E ? { host_permissions: ['<all_urls>'] } : {}),
    action: {
      default_title: 'Frameora — capture a screenshot',
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
      'open-studio': { description: 'Open Frameora Studio' },
      'open-library': { description: 'Open screenshot library' },
      'cancel-capture': { description: 'Cancel the active capture' },
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      __FRAMEORA_E2E__: JSON.stringify(E2E),
    },
    build: {
      // Keep output readable for Chrome Web Store review; no source maps in prod.
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
    },
  }),
});
