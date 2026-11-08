# FrameShot Testing

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
- The E2E build differs from production only by `host_permissions: ["<all_urls>"]` (automation can't click the toolbar to grant `activeTab`) and test hooks gated by `__FRAMESHOT_E2E__`:
  - `globalThis.__frameshotTest` on the service worker: `start`, `status`, `command`, `cancel`, `stop`.
  - `window.__frameshotEditor` on the editor page, to read the store and map document coordinates to the screen.
  - `window.__frameshotRecorder` on Studio pages: read the recorder state, count stored chunks, and simulate Chrome's "Stop sharing" button.
  - `window.__frameshotSounds` (the sounds a page played, with its AudioContext state) and `__frameshotSoundCheck` (renders a sound offline and returns its peak and loudness); the offscreen document reports each sound it plays back to the service worker.
  - A storage key that lowers canvas limits, so the split/scale paths can be tested without enormous pages.
- Downloads land in Playwright's artifact folder. Tests read the completed file path from `chrome.downloads.search` and inspect the bytes.
- The recorder tests also pass `--autoplay-policy=document-user-activation-required`, Chrome's real autoplay rule (headless Chromium otherwise allows all audio), so sound tests prove that sounds start from a user's click.
- Screen-recording tests launch Chromium with `--use-fake-ui-for-media-stream` (auto-accepts permission prompts and Chrome's share picker, which then shares a tab — here the recorder tab itself) and `--use-fake-device-for-media-stream` (a fake microphone and a fake camera that shows a green test pattern). The recordings are real MP4/WebM files written by Chrome's MediaRecorder.

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
| `recorder.test.ts` | WebM duration repair on synthetic EBML headers (insert, overwrite 4/8-byte floats, TimecodeScale, growing the Info size field, known Segment size, refusing SeekHead/truncated/garbage input); MediaRecorder type choice (H.264+AAC → H.264+Opus → WebM fallback, video-only types, throwing `isTypeSupported`); codec descriptions; bitrates and even sizes; camera-bubble geometry; elapsed time and badges; recorder settings validation; recording storage (out-of-order chunks, assembly, finalize, delete, discard, clear all, library filtering and search); review-prompt rules (thresholds, snooze, max asks, done, corrupted state, store URL) |
| `donate.test.ts` | Donation addresses are well-formed (EVM, Solana, Bitcoin bech32) and match `scripts/build-donate-qr.py`; every QR and logo file exists |
| `gif.test.ts` | GIF encoder, checked by decoding its output with a small independent GIF decoder: GIF89a header, size, loop/play-once, palette with a transparent slot, identical frames merged into a longer delay, only the changed 3×3 patch stored (disposal 1), compositing reproduces the final picture; delays add up to the clip length and never drop below 2 cs; wrong-size and empty input rejected. GIF planning (range clamping, aspect ratio, no upscaling, 60 s cap). Sound mapping for capture status changes and sound settings validation |
| `stitch-rounding.test.ts` | A model of Chrome's integer rounding at fractional display scales (2,400 scenarios) for the full-page stitcher |
| `composer-render.test.ts` | Composer layout (auto padding, fixed presets, fit/fill, ratio presets within limits, alignment and frame bar, gradient lines, sanitization); annotation rendering for every annotation type (save/restore, opacity, double arrowheads, multiply highlighter, dashes, multi-line text with background and outline, markers) |

## End-to-end tests (`tests/e2e/`)

| Spec | Scenarios |
|---|---|
| `capture.spec.ts` | Visible capture; full page (pixel-exact, restores scroll and `outerHTML`); sticky header, sticky section, and fixed footer each exactly once; long table with sticky thead; lazy images; infinite scroll; app-shell panel; horizontal overflow; element picker; area drag; area extended by scrolling (multi-frame); scrolling-panel capture; max-height limit; split into parts; scale mode; cancel restores page; Esc cancels; stop & save partial; dynamic page; image-heavy page; chrome:// refused |
| `hidpi.spec.ts` | Real 2× device pixels (`--force-device-scale-factor=2`): full page 2560 px wide with 240 px bands; sticky handling at 2× |
| `fractional-dpi.spec.ts` | Real fractional device scales 1.25, 1.5 and 1.75 (odd window heights) on a page with fractional band heights, a long article, and the sticky-header page: every capture succeeds, matches the page height within a device pixel, and keeps all bands in order. Before the fix (internal build 1.0.1), five of these nine failed with "about 1 px missing". |
| `editor.spec.ts` | All 12 tools create objects; undo/redo, duplicate, delete, layer list; PNG export with redaction exactly black, blur and pixelation measurably destroying detail, annotation present, original unchanged; JPEG/WebP/PDF magic bytes and redaction kept (PDF image extracted and checked losslessly); clipboard read back; crop → rotate → flip → resize with orientation verified by pixel; autosave and reopen; double-click text editing |
| `app.spec.ts` | Library search, domain filter, favourites, rename and tags, collections, sort, delete with confirmation, list view; reopen in editor; bulk ZIP (validated by Python) and combined PDF (pdf-lib); thumbnail refresh when leaving the editor quickly; composer 1200×630 export plus save to library; popup full-page capture with live progress bar and Stop button; shortcut commands declared and executed; settings theme, default format, filename template, clear data, persistence; image import |
| `privacy.spec.ts` | CSP blocks fetch, beacons, and remote images from extension pages and the SW; capture → edit → export makes no requests except the fixture page's own; Studio, editor, and export work offline |
| `review.spec.ts` | Review prompt: not shown to a new install however much it is used; shown once earned, counted, and paused 3 weeks after "Not now"; clicking the five stars, or the sidebar's "Rate FrameShot" link, opens the reviews page; "Rate FrameShot" opens `chromewebstore.google.com/detail/frameshot/<id>/reviews` and ends prompts; "Don't ask again" respected; the popup asks right after a successful capture, which itself counts toward the threshold |
| `donate.spec.ts` | The developer card (photo loads, name, link to www.shahriarahmed.net) in Settings and on the Welcome page, and the credits link. Donate page from the library sidebar: each wallet shows its exact address, its QR code and logos load from the package, Copy puts the exact address on the clipboard, "Donate now" scrolls to the addresses; the popup links to it |
| `ux.spec.ts` | A 150-item library loads one page (60) per scroll; header, selection bar and list view fit a 900 px window; arrow keys move the selected shape after using a panel slider; composer width/height can be typed; a broken address shows a message (not a blank screen); "?" opens the shortcut sheet; page transitions animate only the page layer |
| `recorder.spec.ts` | GIF export (trim, width, fps; the file is parsed: size, frame count, total delay, loop, trailer) from the player and from the library menu; recording sounds in order (three countdown ticks, start, pause, resume, stop) under the real autoplay rule; the capture shutter played by the offscreen document; sounds off; every sound audible and never clipping; Discard after the recording already ended; "Clear all local data" refused while recording; another tab can't clear the REC badge. Also: record with tab sound + microphone to MP4 (chunks reach IndexedDB *during* recording; length, sound, size, thumbnail, `REC` badge); WebM gets a finite duration; pause leaves time out (and shows `II`); camera bubble pixels found at the chosen corner of the saved video; Chrome's "Stop sharing" saves; discard deletes all data; popup shows the running recording, pauses and stops it; library Recordings view, duration badge, no copy action, video download (name, MIME type, size, `ftyp`), editor redirects to the player, "Save frame" creates a PNG; bulk ZIP contains the video, PDF refuses recordings; crash recovery for MP4 and WebM (tab closed mid-recording, recovered, played); start/stop shortcut opens one recorder tab and stops a recording; recorder choices persist |

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
- **"About 1 px missing" failures at fractional display scaling (internal build 1.0.1)**: reported by a user on a real display. Reproduced first with `tests/unit/stitch-rounding.test.ts` (a model of Chrome's integer rounding: 1,722 of 2,400 scenarios failed) and in real Chromium with `fractional-dpi.spec.ts` (5 of 9 failed with the exact message), then fixed; both now pass.
- **1-device-pixel seams at fractional scales** (for example 125% zoom): the unit test in `capture-plan.test.ts` exposed it. Coverage is now tracked in output device pixels.
- **App-shell captures blank after the first frame**: the main scroller is itself `position: fixed` and was being hidden. Scroller ancestors are now exempt.
- **Area handle drags ignored**: listeners on a closed shadow root's host can't see internal targets. Listeners moved into the shadow root.
- **Text tool lost focus immediately**: the mousedown default focus change. Prevented, and focus is deferred.
- **Thumbnail not refreshed when leaving the editor quickly**: now rendered synchronously on unmount.
- **Misleading message on protected pages**: Chrome reports a generic activeTab error there; FrameShot now detects protected pages.

## UI performance (`npm run perf:ui`)

`scripts/perf-ui.mjs` loads the E2E build in headless Chromium (software rendering, so absolute numbers are pessimistic) with a seeded 240-item library. Runs on the same machine before and after the interface upgrade (two runs each):

| Measure | Before | After |
|---|---|---|
| Median frame while wheel-scrolling | 49.9 ms (≈20 fps) | 16.7 ms (60 fps) |
| Frames slower than 33 ms (of ~280) | 163–181 | 16–19 |
| Main-thread time while idle, per 5 s | 260–274 ms | 32–34 ms |
| Average latency of 11 common actions (Event Timing) | ≈190 ms | ≈108 ms |
| Select all (240 items) | 208 ms | 120–160 ms |
| Library ready (first 60 cards) | 408–559 ms | 380–424 ms |

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
- [ ] **Screen recorder** in branded Chrome on Windows and macOS: record a tab (with "Also share tab audio"), a window, and the entire screen (Windows: with system audio); real microphone and camera, including the first-time permission prompts; switching the shared tab from Chrome's bar; Chrome's "Stop sharing"; the popup controls and toolbar badge; the floating pill while browsing Studio.
- [ ] Play downloaded MP4 files in QuickTime (macOS), the Photos/Media Player app (Windows), and a phone; play a WebM in VLC and check seeking.
- [ ] A long recording (30–60 min at 1080p) for memory use and file integrity; closing the recorder tab mid-recording, then recovering.
- [ ] **Sounds** on real speakers or headphones: the shutter after toolbar, right-click and keyboard captures; the recording countdown and chimes, and that none of them can be heard in the saved recording; the volume slider; nothing plays when sounds are off.
- [ ] **GIF export** of a 30–60 s recording: how long it takes, the file size, and that it opens and loops in Chrome, Slack, and macOS Preview or the Windows Photos app.

## Final verification run

Run on 2026-11-08 for release 1.0.0, the first public release, after the interface and performance upgrade (GIF export, sound effects, interface and stability fixes; Chromium / Chrome for Testing 153, headless "chromium" channel, Playwright 1.63, Vitest 5.1, Node 22).

| Suite | Result |
|---|---|
| Type check (`npm run compile`) | **passed** |
| Unit (`npm test`, 11 files, including the GIF encoder checked by an independent decoder, a 4,000-item duplicate-detection benchmark and the donation addresses) | **141 / 141 passed** |
| E2E `capture.spec.ts` | **23 / 23 passed** |
| E2E `hidpi.spec.ts` (real 2× device scale) | **2 / 2 passed** |
| E2E `fractional-dpi.spec.ts` (real 1.25× / 1.5× / 1.75× device scale) | **9 / 9 passed** |
| E2E `editor.spec.ts` | **7 / 7 passed** |
| E2E `app.spec.ts` (library, composer, popup, shortcuts, settings, import) | **8 / 8 passed** |
| E2E `privacy.spec.ts` (CSP network block, no foreign requests, offline) | **3 / 3 passed** |
| E2E `recorder.spec.ts` (recorder, GIF export, sounds under Chrome's real autoplay rule) | **21 / 21 passed** |
| E2E `review.spec.ts` (review prompt, clickable stars, sidebar link) | **6 / 6 passed** |
| E2E `donate.spec.ts` (Support FrameShot page, developer credit) | **2 / 2 passed** |
| E2E `ux.spec.ts` (new in this release) | **5 / 5 passed** |
| **E2E total** | **86 / 86 passed** (5.8 min) |
| Production bundle audit (`npm run check:bundle`) | **passed**: MV3, the 7 expected permissions (the earlier six plus `offscreen`), no host permissions, strict CSP, no remote code, no eval, no test hooks, no source maps. Inert URL strings only: library namespaces, the Tailwind banner, the footer credit link, and the Web Store review link (opened only on click) |
| Packaged ZIP smoke test (`frameshot-1.0.0-chrome.zip`, unzipped and loaded unpacked, Chrome's real autoplay rule, fake media devices) | **passed**: name, version and permissions as expected; welcome page on install; context menus and all 9 commands including `toggle-recording`; no test hooks in the service worker or pages; the offscreen document loads from the package and accepts a sound; no review prompt on a fresh install; Studio, Settings, Popup (with the sound toggle), Options and Recorder render with zero console errors; "?" opens the shortcut sheet; a recording made through the UI (3 s countdown with sounds) saved and played as MP4 (H.264 · Opus, 3.5 s) with the `REC` badge during and none after; **Export as GIF** from the shipped build produced a valid GIF89a (320×206, 65 KB) |
| Store assets | Generated from the real UI by `npm run store:assets` and reviewed by eye: 6 screenshots (1280×800) and 2 promotional tiles, all 24-bit PNG without alpha |

Defects found while preparing 1.0.0 and fixed (details in [CHANGELOG.md](CHANGELOG.md)):
- One full run had `app.spec.ts`'s bulk ZIP/PDF test time out once (the whole run was slow, 7.6 min instead of ~5.8); it passed alone, 5 times in a row, and in the next full run (86/86).
- A full run failed once in `ux.spec.ts` because the test read the list view's "Actions" button before React had swapped the grid out (a race in the test, not the app); it now waits for the list rows.
- One full E2E run during the interface upgrade failed once: Stop pressed in the popup never reached the recorder (the command was posted on a channel closed 50 ms later). Fixed with a long-lived channel and a resend; the recorder spec then passed 21/21 and the full suite 83/83.
- Two internal reviews, of the recorder (10 findings) and of the interface (18 findings). All are fixed; regression tests were added to `recorder.spec.ts` (Discard after the recording ended, "Clear all local data" during a recording, the REC badge from another tab) and in the new `ux.spec.ts` (paging, narrow windows, editor focus, composer typing, broken addresses).
- GIF dialog: a trim was reset when the video's real length arrived (found while testing the dialog).
- Making the store screenshots showed that a library thumbnail could keep showing the unedited, for example unredacted, screenshot if the editor tab was closed within about 1.7 s of an edit. The thumbnail now refreshes 0.4 s after the autosave.
- Duplicate detection took about 9 s for 4,000 screenshots on the test machine; it now takes under 0.1 s, and repeat checks are cached.

Defects found in earlier internal builds and fixed (each now covered by a test):
- Internal build 1.2.0: Chrome's MP4 recorder emitted no data until a recording stopped (a 2-second key-frame interval fixed it, so MP4s can be recovered after a crash); re-using an open Studio tab needed a BroadcastChannel presence check because Chrome hides extension tab URLs without the `tabs` permission; the floating recording pill covered the sidebar credits; the live panel showed "0 B recorded" and the requested instead of the actual resolution.
- Internal build 1.1.0: popup stuck on "Select what to capture…" after the tab closed mid-selection (found during visual QA); two-column layouts ignored by Tailwind v4.
- Internal build 1.0.1: "about 1 px missing" capture failures at fractional display scaling — true fractional viewport, exact DPR, scroll to the real end, aimed retries, sliver fill.
- 1-device-pixel stitching seam at fractional device scales (e.g. 125% zoom) — planner now tracks coverage in output pixels.
- App-shell pages: the scrolling panel itself is `position: fixed` and was hidden after the first frame.
- Area selection handles were not detectable through the closed shadow root.
- Text tool lost focus (and occasionally the first keystroke) right after clicking.
- Library thumbnail was not refreshed when leaving the editor within ~1 s of an edit.

Still requires a manual check before store submission: the real toolbar-icon click and popup, physical keyboard shortcuts, right-click menu items, Windows/macOS classic scrollbars and fonts, real displays at 125%/150% scaling (now covered by forced device scales in headless Chromium, but not yet on physical Windows/macOS displays), and very long real-world sites.
