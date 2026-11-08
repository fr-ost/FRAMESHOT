# FrameShot

**FrameShot: Free Full Page Screenshot, Screen Capture & Editor** — by Unique Labs

> Capture the web. Edit every detail. Free forever.

FrameShot is a local-first Chrome extension (Manifest V3) for capturing, editing, organizing, and exporting screenshots. It combines a quick-capture toolbar popup with **FrameShot Studio**, a full application that opens in its own tab: a screenshot library, an editor with annotation and privacy tools, a composer for polished visuals, and an export engine.

Every feature is available to every user. There are no paid plans, premium tiers, subscriptions, watermarks, accounts, ads, or locked features. Screenshots stay on your device.

*Useful technology. Accessible to everyone.*

> **Naming notice — please read before publishing.** The name "FrameShot" has **not** been legally cleared, and a check on 2026-11-08 found a **high** conflict risk: the Chrome Web Store already lists a screenshot extension named "FrameShot" and two other "Frameshot" capture extensions, a near-identical competitor is called "FramedShot", and a US trademark filing for FRAMESHOT (serial 87795731, photo software) exists. Expect search results for the brand to be shared, and possible IP complaints. Have trademark counsel run a clearance search, and consider a more distinctive name, **before public launch**. Details: [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md), addendum.

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Development](#development)
- [Testing](#testing)
- [Architecture](#architecture)
- [Privacy commitments](#privacy-commitments)
- [Current limitations](#current-limitations)
- [Documentation](#documentation)

---

## Features

The full matrix, with test status for each item, is in [FEATURES.md](FEATURES.md).

### Capture
- **Visible area**: the current viewport, with scrollbars trimmed. An optional 3, 5, or 10 second delay lets you capture hover menus.
- **Full page**: scroll-and-stitch capture of the whole page:
  - Sticky elements are put back in the page flow, so headers and section headers appear once, where they belong.
  - Fixed headers appear once at the top, and fixed footers once at the bottom.
  - Lazy-loaded images and infinite-scroll content are loaded before capture. A maximum height setting and a **Stop & save** button stop endless pages.
  - Horizontal overflow is captured.
  - App-shell pages, where content scrolls inside a panel, are detected and the panel's full content is captured.
  - Scroll position and every temporary page change are restored afterwards.
- **Selected area**: drag to select, resize or move with handles, and scroll the page to extend the selection beyond the viewport. Multi-frame stitching is used when needed.
- **Element**: hover to highlight any DOM element, use ↑/↓ to step to its parent or child, and click to capture it.
- **Scrolling panel**: captures the full content of an inner scroll container, such as a chat panel, table, or feed.
- **Honest oversize handling**: pages larger than the browser can hold in one image are saved as several full-resolution parts (default), or scaled into one image. FrameShot always tells you which happened, and never truncates silently.
- Start captures from the toolbar popup, the right-click menu, or keyboard shortcuts. Press **Esc** on the page to cancel.

### Editor
- Non-destructive editing: the original is kept and edits are saved separately. They autosave locally.
- Image operations: crop (free, 1:1, 4:3, 16:9, 9:16), rotate left/right, flip horizontally/vertically, resize, zoom in/out, fit, actual size, reset.
- Annotation tools: arrow (one or both heads), line (solid or dashed), rectangle, rounded rectangle, ellipse, pen, highlighter, text (font, size, bold, outline, background), numbered step markers, and symbols (check, cross, question, warning, info, star, heart).
- Objects can be selected (with multi-select and marquee), moved, resized, duplicated, deleted, nudged with the arrow keys, and reordered. A layer list shows every object. Undo/redo keeps 100 steps.
- **Privacy tools**: blur, pixelate, and solid redaction with a selectable colour. All three are **flattened into the exported pixels**, so the original pixels are not present in the exported file.
- **Apply edits permanently** replaces the stored original, so hidden areas no longer exist even in your library.

### Composer
- Canvas presets: fit to screenshot, 16:9, 4:3, 1:1, 4:5, 9:16, 1200×630, 1920×1080, and custom size (with aspect lock).
- Solid, gradient (six presets plus custom colours and angle), or transparent background.
- Padding, corner radius, shadow (blur, offset, opacity), fit/fill/custom scale, nine-position alignment, and an optional generic light or dark browser-window frame.
- Download, copy, or save the composition to the library.

### Export
- PNG, JPEG, and WebP (with quality control), and PDF.
- PDF can be lossless or a smaller JPEG-compressed version. Pages can be A4 or Letter (long captures continue across pages) or sized to fit the image.
- Copy to clipboard (PNG).
- Bulk export as a ZIP archive, or as **one combined PDF**.
- Filename templates (`{domain}`, `{title}`, `{date}`, `{time}`, `{mode}`, `{width}`, `{height}`, …) and an optional sub-folder inside Downloads.
- A download is reported as saved only after Chrome confirms it completed. No watermarks are ever added.

### Library
- Thumbnail grid and list views, with search (name, page title, domain, URL, tags) and a domain filter.
- Sort by newest, oldest, name, or size.
- Favourites, collections, tags, and rename. The details dialog shows source URL, capture mode, size, pixel density, and capture notes.
- Bulk select (Shift-click ranges), bulk export, move to collection, favourite, and delete, with confirmation.
- Duplicate detection (perceptual hash) and screenshot comparison (side by side, overlay, pixel difference).
- Import images by file picker, paste, or drag and drop.
- Storage usage display and a **Clear all local data** option.

### Settings
Theme (system, light, dark), default format and quality, filename template, download folder, ask where to save, capture behaviour (fixed-element handling, lazy-content preload, animation freezing, horizontal overflow, scroll delay, maximum height, oversize handling, what happens after a capture), PDF page size and margin, a keyboard shortcut overview, storage, privacy, and about.

### Interface
A calm, minimal design over a slowly drifting aurora background: glass surfaces, one gradient accent, and fluid motion — page transitions, animated dialogs, menus and toasts, staggered card entrances, and hover and press feedback. Light and dark themes (or follow the system), with a one-click theme switch in the library. All animation is turned off when your system asks for reduced motion.

---

## Installation

### From source (load unpacked)

Requirements: Node.js 20 or newer (developed on Node 22) and npm.

```bash
npm install
```

```bash
npm run build
```

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose the `.output/chrome-mv3` folder.
4. Pin FrameShot: open the puzzle-piece menu and click the pin.

### Packaged ZIP

```bash
npm run zip
```

This produces `.output/frameshot-1.1.0-chrome.zip`, the archive to upload to the Chrome Web Store. Do not submit without owner approval; see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

### Keyboard shortcuts

| Action | Suggested shortcut |
|---|---|
| Capture visible area | Alt+Shift+V |
| Capture full page | Alt+Shift+F |
| Capture selected area | Alt+Shift+A |
| Capture an element | Alt+Shift+E |
| Open Studio / library, cancel capture | not set by default |

Chrome assigns suggested shortcuts only if they don't conflict with existing ones. You can view and change them at `chrome://extensions/shortcuts`, or from **Settings → Keyboard shortcuts → Customize shortcuts**. Pressing **Esc** on the page always cancels an active capture.

---

## Development

```bash
npm run dev
```

`npm run dev` starts WXT in development mode with hot reload.

| Script | Purpose |
|---|---|
| `npm run dev` | WXT dev mode (development build with reload) |
| `npm run build` | Production build → `.output/chrome-mv3` |
| `npm run zip` | Production ZIP → `.output/frameshot-<version>-chrome.zip` |
| `npm run build:e2e` | E2E test build → `.output/chrome-mv3-e2e` |
| `npm run compile` | TypeScript type check (`tsc --noEmit`) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E build, then real-browser tests (Playwright) |
| `npm run icons` | Re-render PNG icons from `src/assets/logo*.svg` |

Stack: WXT 0.21, Vite 8, React 19, TypeScript 5.9, Tailwind CSS 4, Radix UI primitives, Lucide icons, `idb`, Vitest 5, and Playwright 1.63.

---

## Testing

```bash
npm test
```

```bash
npm run test:e2e
```

- **Unit tests** (Vitest, Node) cover the stitching planner, geometry, settings validation, filename templates, pixel effects, editor transforms and store, object geometry, PDF and ZIP writers, IndexedDB storage (`fake-indexeddb`), composer layout, and annotation rendering.
- **End-to-end tests** (Playwright) load the unpacked extension into Chromium (channel `chromium`, new headless mode; Chrome for Testing). They drive real captures against deterministic fixture pages, then verify the stitched output **pixel by pixel**. They also verify exported PNG/JPEG/WebP/PDF files and the clipboard contents (including that redacted pixels are gone), plus the library, composer, popup, settings, shortcuts, CSP network blocking, and offline use.
- Branded Google Chrome 137+ no longer supports `--load-extension`, so automated tests use Playwright's Chromium (Chrome for Testing).
- The E2E build is identical to production except for two things. It adds `host_permissions: ["<all_urls>"]`, because automation cannot click the toolbar to grant `activeTab`. It also includes test hooks (`__frameshotTest` on the service worker, `__frameshotEditor` on the editor window), compiled in only when `__FRAMESHOT_E2E__` is true. Production builds contain neither.

Details, coverage, and the latest results are in [TESTING.md](TESTING.md).

---

## Architecture

```
 ┌──────────────┐  capture.start   ┌──────────────────────────┐  executeScript (activeTab)  ┌────────────────┐
 │ Popup        │ ───────────────▶ │ Background service worker│ ──────────────────────────▶ │ Content agent  │
 │ Shortcuts    │                  │  capture orchestrator    │ ◀── agent.* messages ─────▶ │ (in the page)  │
 │ Context menu │ ◀── status port ─│  rate-limited capture    │                             │ scroll, pickers│
 └──────────────┘                  │  StitchPlanner + canvases│                             └────────────────┘
                                   └────────────┬─────────────┘
                                                │ IndexedDB (images, thumbnails, metadata)
                                                ▼
                                   ┌──────────────────────────┐
                                   │ FrameShot Studio (tab)    │  library · editor · composer · settings
                                   └──────────────────────────┘
```

| Path | Module |
|---|---|
| `src/entrypoints/` | WXT entrypoints: `background.ts`, `capture-agent.ts`, `popup/`, `studio/`, `options/` |
| `src/background/` | Service worker: orchestration, rate-limited frame capture, segmented stitcher, status/badge, commands, menus |
| `src/content/` | Content agent (scrolling, sticky/fixed handling, preload, restore) and in-page pickers |
| `src/core/` | Pure shared logic: message contracts, capture planner, geometry, settings, filenames, restricted URLs |
| `src/imaging/` | Pixel effects (blur/pixelate/redact), image I/O, thumbnails, perceptual hash |
| `src/editor/model/` | Immutable document model, transforms, object geometry, editor store (undo/redo) |
| `src/editor/render/` | Shared annotation drawing, tiled base image, view renderer, export flattening |
| `src/editor/ui/` | Editor screen, canvas interaction, toolbar, properties panel |
| `src/composer/` | Composer layout (pure), renderer, UI |
| `src/export/` | PDF writer, ZIP writer, downloads/clipboard, export service, export dialog |
| `src/db/` | IndexedDB persistence and change notifications |
| `src/library/` | Library UI, filtering, duplicate detection, importer |
| `src/settings/`, `src/popup/`, `src/app/`, `src/ui/` | Settings, popup, Studio shell/welcome/compare, design-system components |

Full details are in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Privacy commitments

- **Nothing leaves your device.** There are no servers, accounts, analytics, telemetry, tracking, ads, or remote code.
- Screenshots, edits, and settings are stored only in this browser (IndexedDB and `chrome.storage.local`).
- Extension pages run under a strict Content Security Policy that **blocks all network connections** (`connect-src 'self' blob: data:`). This is verified by an automated test.
- **Minimal permissions**: `activeTab`, `scripting`, `storage`, `unlimitedStorage`, `downloads`, `contextMenus`. There are **no host permissions**, so FrameShot can access a tab only when you start a capture on it.
- Exported files contain only what you see. Privacy effects are flattened, and no watermark is added.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

---

## Current limitations

**Unsupported because of browser restrictions**
- Chrome doesn't allow extensions to capture `chrome://` pages, other extensions' pages, the Chrome Web Store, or some built-in pages. FrameShot explains this instead of failing silently.
- Local `file://` pages require **Allow access to file URLs** to be turned on for FrameShot in `chrome://extensions`.
- Chrome limits screenshots to **two per second** per extension. A full-page capture therefore takes about half a second per screen of content.
- Canvas size is limited (up to 32,767 px per side, with a memory budget of about 100 megapixels per image). Larger pages are split into parts or scaled down, depending on your settings.
- The tab must stay visible during a multi-frame capture. Switching tabs, minimizing the window, or resizing or zooming stops the capture with a clear message.

**Known limitations**
- On app-shell pages, FrameShot captures the full content of the main scrolling panel. Fixed app chrome around that panel (toolbars, sidebars) is not repeated.
- Sticky and fixed elements inside cross-origin iframes or closed shadow DOM are not adjusted. Open shadow roots are handled.
- Pages that keep changing while they are captured (auto-rotating carousels, live feeds) may show changes between frames. FrameShot warns when page height changes. If it cannot prove the image is complete, it refuses to save and asks you to retry.
- Blur and pixelation can sometimes be reversed for short or predictable text. Use **Redact** for passwords, card numbers, and personal data. The editor shows this warning.
- "Unlimited captures" means FrameShot sets no limits. Your disk space, browser storage quota, and memory still apply. Very large captures can be slow on low-memory machines.
- Keyboard shortcuts depend on Chrome assigning them. Conflicting shortcuts stay unset until you choose them.
- English only for now.

**Not fully verified by automation**
- A real click on the toolbar icon and physical keyboard-shortcut presses can't be automated, so the same code paths are exercised through test hooks. Both need a manual check before release (see [TESTING.md](TESTING.md)).

**Deferred** (see [ROADMAP.md](ROADMAP.md)): local OCR and searchable text, batch capture of several tabs, export presets, other browsers, translations.

---

## Documentation

| Document | Contents |
|---|---|
| [FEATURES.md](FEATURES.md) | Feature matrix with test status |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Modules, message contracts, capture and editor internals |
| [TESTING.md](TESTING.md) | Test suites, how to run, results, manual checks |
| [PRIVACY.md](PRIVACY.md) | Privacy policy |
| [PRIVACY_DISCLOSURE.md](PRIVACY_DISCLOSURE.md) | Chrome Web Store privacy-practices answers |
| [SECURITY.md](SECURITY.md) | Threat model and security measures |
| [STORE_LISTING.md](STORE_LISTING.md) | Store listing copy and permission justifications |
| [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) | Release steps |
| [ROADMAP.md](ROADMAP.md) | Deferred and planned work |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md) | Market research and brand availability |

---

FrameShot by Unique Labs. Free forever.

---

A Product of Unique Labs. Developed by [Shahriar Ahmed](https://www.shahriarahmed.net).
