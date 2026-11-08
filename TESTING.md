# Frameora Testing

Final run: see bottom (section "Final verification run").

## How to run

```bash
npm install
```

```bash
npm test
```

```bash
npm run test:e2e
```

```bash
npm run compile
```

- `npm test` runs the **unit tests** (Vitest, Node environment, `fake-indexeddb`).
- `npm run test:e2e` builds the E2E variant (`.output/chrome-mv3-e2e`) and runs the **real-browser tests** (Playwright, `--trace off`).
- `npm run compile` is the TypeScript type check.

### E2E environment
- Playwright launches Chromium with `channel: 'chromium'` (new headless mode, which supports extensions) and loads the unpacked build with `--load-extension`. This is Chrome for Testing; **branded Google Chrome 137+ removed `--load-extension`**, so automated runs cannot use branded Chrome.
- Fixture pages in `tests/fixtures/` are served from a local HTTP server started by the test harness. The server also generates SVG images with a small delay, to make lazy loading realistic.
- The E2E build differs from production only by `host_permissions: ["<all_urls>"]` (automation can't click the toolbar to grant `activeTab`) and test hooks gated by `__FRAMEORA_E2E__`:
  - `globalThis.__frameoraTest` on the service worker: `start`, `status`, `command`, `cancel`, `stop`.
  - `window.__frameoraEditor` on the editor page, to read the store and map document coordinates to the screen.
  - A storage key that lowers canvas limits, so the split/scale paths can be tested without enormous pages.
- Downloads land in Playwright's artifact folder. Tests read the completed file path from `chrome.downloads.search` and inspect the bytes.

### Verification approach
Fixture pages paint **deterministic colour bands** (`tests/fixtures/bands.js`), with marker colours for sticky headers (magenta), fixed footers (cyan), and sticky sections (yellow). Tests decode the stored or exported image and analyse runs of colour along a pixel column or row. This detects missing, duplicated, misplaced, or seamed content exactly.

## Unit tests (`tests/unit/`)

| File | Covers |
|---|---|
| `capture-plan.test.ts` | Scroll-step planning (single, tall, non-multiple heights, 2D grid, overlap, mid-page regions); `StitchPlanner` seamlessness at scales 1, 1.25, 1.5, 2, 3; clamped last frames; bottom-fixed footer repaint; element-scroller offsets; gap detection and gap fill; scaled output; segment planning, pixel budget, `fitScale`; `uncovered` sweep |
| `core.test.ts` | Filename templates and sanitization (reserved names, control characters, length, dedupe); settings validation, clamping, merging, folder sanitization; restricted-page detection; friendly error mapping; formatting |
| `effects.test.ts` | Solid redaction (opaque, exact colour), pixelation (block averaging, origin alignment, partial blocks), box blur (detail removal, uniform stability), colour parsing, dHash and Hamming distance |
| `editor.test.ts` | Transform pipeline (rotate, flip, crop after rotation, clamping, resize, reset, `-0` normalization), document validation, hit testing and z-order, bounds, handles, aspect-locked resize, fit/move, stroke simplification, marker numbering; `EditorStore` undo/redo, one-step gestures, cancel, reorder, duplicate, delete, nudge, style application and live preview, crop tool, zoom, 100-step history cap |
| `export.test.ts` | PDF writer: pdf-lib parses pages, sizes, title, producer; xref offsets; lossless Up-predictor round-trip with alpha on white; A4/Letter/image layout and the 14,400 pt cap; UTF-16 text strings. ZIP writer: CRC-32 check value; archive validated by Python `zipfile` (UTF-8 names) |
| `storage.test.ts` | IndexedDB CRUD (newest-first listing, update, bulk update, delete with blobs and docs, replace original, collections and un-filing, storage stats); library search, filter, sort, domain list; duplicate grouping |
| `composer-render.test.ts` | Composer layout (auto padding, fixed presets, fit/fill, ratio presets within limits, alignment and frame bar, gradient lines, sanitization); annotation rendering for every annotation type (save/restore, opacity, double arrowheads, multiply highlighter, dashes, multi-line text with background and outline, markers) |

## End-to-end tests (`tests/e2e/`)

| Spec | Scenarios |
|---|---|
| `capture.spec.ts` | Visible capture; full page (pixel-exact, restores scroll and `outerHTML`); sticky header, sticky section, and fixed footer each exactly once; long table with sticky thead; lazy images; infinite scroll; app-shell panel; horizontal overflow; element picker; area drag; area extended by scrolling (multi-frame); scrolling-panel capture; max-height limit; split into parts; scale mode; cancel restores page; Esc cancels; stop & save partial; dynamic page; image-heavy page; chrome:// refused |
| `hidpi.spec.ts` | Real 2× device pixels (`--force-device-scale-factor=2`): full page 2560 px wide with 240 px bands; sticky handling at 2× |
| `fractional-dpi.spec.ts` | Real fractional device scales 1.25, 1.5 and 1.75 (odd window heights) on a page with fractional band heights, a long article, and the sticky-header page: every capture succeeds, matches the page height within a device pixel, and keeps all bands in order. Before the 1.0.1 fix, five of these nine failed with "about 1 px missing". |
| `editor.spec.ts` | All 12 tools create objects; undo/redo, duplicate, delete, layer list; PNG export with redaction exactly black, blur and pixelation measurably destroying detail, annotation present, original unchanged; JPEG/WebP/PDF magic bytes and redaction kept (PDF image extracted and checked losslessly); clipboard read back; crop → rotate → flip → resize with orientation verified by pixel; autosave and reopen; double-click text editing |
| `app.spec.ts` | Library search, domain filter, favourites, rename and tags, collections, sort, delete with confirmation, list view; reopen in editor; bulk ZIP (validated by Python) and combined PDF (pdf-lib); thumbnail refresh when leaving the editor quickly; composer 1200×630 export plus save to library; popup full-page capture with live progress bar and Stop button; shortcut commands declared and executed; settings theme, default format, filename template, clear data, persistence; image import |
| `privacy.spec.ts` | CSP blocks fetch, beacons, and remote images from extension pages and the SW; capture → edit → export makes no requests except the fixture page's own; Studio, editor, and export work offline |

## Last verified run (during development)

| Suite | Result |
|---|---|
| Unit (7 files) | **89 / 89 passed** |
| `capture.spec.ts` | 21 / 21 passed |
| `hidpi.spec.ts` | 2 / 2 passed |
| `editor.spec.ts` | 7 / 7 passed |
| `app.spec.ts` | 8 / 8 passed |
| `privacy.spec.ts` | 3 / 3 passed |

These counts come from the development runs in this session. The release run below supersedes them.

### Defects found by the tests and fixed
- **"About 1 px missing" failures at fractional display scaling (1.0.1)**: reported by a user on a real display. Reproduced first with `tests/unit/stitch-rounding.test.ts` (a model of Chrome's integer rounding: 1,722 of 2,400 scenarios failed) and in real Chromium with `fractional-dpi.spec.ts` (5 of 9 failed with the exact message), then fixed; both now pass.
- **1-device-pixel seams at fractional scales** (for example 125% zoom): the unit test in `capture-plan.test.ts` exposed it. Coverage is now tracked in output device pixels.
- **App-shell captures blank after the first frame**: the main scroller is itself `position: fixed` and was being hidden. Scroller ancestors are now exempt.
- **Area handle drags ignored**: listeners on a closed shadow root's host can't see internal targets. Listeners moved into the shadow root.
- **Text tool lost focus immediately**: the mousedown default focus change. Prevented, and focus is deferred.
- **Thumbnail not refreshed when leaving the editor quickly**: now rendered synchronously on unmount.
- **Misleading message on protected pages**: Chrome reports a generic activeTab error there; Frameora now detects protected pages.

## Manual checks required before release

These cannot be automated reliably and must be done by a person in real Chrome:

- [ ] Install the production ZIP or `.output/chrome-mv3` via **Load unpacked** in branded Chrome. Click the **real toolbar icon** and run every popup capture mode.
- [ ] Press the **physical keyboard shortcuts** (Alt+Shift+V/F/A/E) and confirm they work. Check `chrome://extensions/shortcuts` for conflicts.
- [ ] Use the **right-click menu** for each capture mode.
- [ ] Real displays: 1× and 2× (Retina), and browser zoom at 90%, 110%, 125%, and 150%.
- [ ] Very long real-world sites (news articles, documentation, social feeds, web apps with app shells, pages with cookie banners and chat widgets).
- [ ] Restricted pages (chrome://settings, the Web Store) and `file://` with and without "Allow access to file URLs".
- [ ] Switching tabs or minimizing during a capture stops it with a clear message.
- [ ] Visual review in light, dark, and system themes; keyboard-only navigation of the popup, library, editor, and settings.
- [ ] Fonts and rendering on Windows and macOS (text annotations, UI).
- [ ] Clipboard paste into other apps (Slack, Docs, image editors).
- [ ] Timed capture (3/5/10 s) with a hover menu open.
- [ ] Very large captures on a low-memory machine (8 GB or less).

## Final verification run

Run on 2026-11-08 for release 1.0.1 (Chromium / Chrome for Testing 153, headless "chromium" channel, Playwright 1.63, Vitest 5.1, Node 22).

| Suite | Result |
|---|---|
| Unit (`npm test`, 8 files, including the 2,000-scenario rounding simulation) | **95 / 95 passed** |
| E2E `capture.spec.ts` | **21 / 21 passed** |
| E2E `hidpi.spec.ts` (real 2× device scale) | **2 / 2 passed** |
| E2E `fractional-dpi.spec.ts` (real 1.25× / 1.5× / 1.75× device scale) | **9 / 9 passed** |
| E2E `editor.spec.ts` | **7 / 7 passed** |
| E2E `app.spec.ts` (library, composer, popup, shortcuts, settings, import) | **8 / 8 passed** |
| E2E `privacy.spec.ts` (CSP network block, no foreign requests, offline) | **3 / 3 passed** |
| **E2E total** | **50 / 50 passed** (3.3 min) |
| Production bundle audit (`npm run check:bundle`) | **passed** — MV3, 6 permissions, no host permissions, strict CSP, no remote URLs/code, no eval, no test hooks, no source maps |
| Packaged ZIP smoke test (`.output/frameora-1.0.1-chrome.zip`, unzipped and loaded unpacked) | **passed** — service worker starts, welcome page opens on install, context menus registered, Studio / Settings / Popup / Options render with zero console errors, test hook absent |

Defects found by these suites and fixed during development (each now covered by a test):
- 1.0.1: "about 1 px missing" capture failures at fractional display scaling — true fractional viewport, exact DPR, scroll to the real end, aimed retries, sliver fill.
- 1-device-pixel stitching seam at fractional device scales (e.g. 125% zoom) — planner now tracks coverage in output pixels.
- App-shell pages: the scrolling panel itself is `position: fixed` and was hidden after the first frame.
- Area selection handles were not detectable through the closed shadow root.
- Text tool lost focus (and occasionally the first keystroke) right after clicking.
- Library thumbnail was not refreshed when leaving the editor within ~1 s of an edit.

Still requires a manual check before store submission: the real toolbar-icon click and popup, physical keyboard shortcuts, right-click menu items, Windows/macOS classic scrollbars and fonts, real displays at 125%/150% scaling (now covered by forced device scales in headless Chromium, but not yet on physical Windows/macOS displays), and very long real-world sites.
