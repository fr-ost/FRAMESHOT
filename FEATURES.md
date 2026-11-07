# Frameora Features

Status legend:

- ✅ **Completed and tested**: implemented and covered by automated tests (unit and/or real-browser E2E).
- 🟡 **Implemented, not fully tested**: implemented and exercised manually or indirectly, without a dedicated automated assertion.
- ⏳ **Deferred**: not implemented yet (see [ROADMAP.md](ROADMAP.md)).
- ⛔ **Unsupported (browser restriction)**: not possible for extensions in Chrome.

Every implemented feature is free and available to every user. There are no tiers, limits, or watermarks.

## Capture

| Feature | Status | Notes / test |
|---|---|---|
| Visible area capture, scrollbars trimmed | ✅ | `capture.spec` visible |
| Timed visible capture (3/5/10 s delay) | 🟡 | Popup delay selector plus badge countdown; delay logic not asserted in E2E |
| Full-page capture (scroll and stitch) | ✅ | Pixel-exact band sequence, 1× and real 2× DPI (`capture.spec`, `hidpi.spec`) |
| Sticky header shown once; sticky section headers in place | ✅ | `capture.spec` sticky, `hidpi.spec` |
| Fixed header first frame only, fixed footer last frame only | ✅ | `capture.spec` sticky |
| Fixed-element modes: smart / keep / hide | 🟡 | Smart is tested; keep/hide are simple branches without E2E |
| Lazy-loaded images (native `loading=lazy` and IntersectionObserver) | ✅ | `capture.spec` lazy |
| Infinite scroll content up to the end | ✅ | `capture.spec` infinite |
| Maximum capture height with an honest warning | ✅ | `capture.spec` max height |
| Stop & save (partial capture, labelled) | ✅ | `capture.spec` stop |
| Cancel (popup, Esc on page, shortcut command), page restored | ✅ | `capture.spec` cancel and Escape |
| App-shell pages: main scrolling panel captured | ✅ | `capture.spec` app shell |
| Horizontal overflow (2D grid of frames) | ✅ | `capture.spec` wide |
| Long tables with sticky `<thead>` | ✅ | `capture.spec` table |
| Image-heavy pages | ✅ | `capture.spec` images |
| Dynamic pages (timers, reveal animations) | ✅ | `capture.spec` dynamic |
| Scroll position and DOM restored exactly | ✅ | `outerHTML` and scroll compared before/after |
| Gap detection and retry; refusing to save incomplete captures | ✅ | Unit (`StitchPlanner` gaps/gap fill); E2E indirectly |
| Fractional device scales without seams | ✅ | Unit tests at 1, 1.25, 1.5, 2, 3 |
| Oversize pages split into full-resolution parts | ✅ | `capture.spec` split (test-only limit override) |
| Oversize pages scaled into one image (setting) | ✅ | `capture.spec` scale |
| Page growth/shrink during capture, re-planned with a warning | 🟡 | Logic is unit-safe; infinite-scroll E2E covers growth via preload |
| Selected area: drag, handles, move, Enter/Esc/arrow keys | ✅ | `capture.spec` area |
| Selected area extended by scrolling (multi-frame) | ✅ | `capture.spec` area extend |
| Element capture with hover highlight, ↑/↓ parent/child | ✅ | `capture.spec` element (click); ↑/↓ keys 🟡 |
| Scrolling-panel capture (inner scroll container) | ✅ | `capture.spec` scrollable |
| Restricted pages refused with a clear message | ✅ | `capture.spec` chrome:// |
| Tab switch / minimize / zoom change detection | 🟡 | Implemented checks; not simulated in E2E |
| Context menu (all modes plus open library) | 🟡 | Same code path as commands; menu clicks not automated |
| Keyboard commands (visible, full, area, element, open Studio/library, cancel) | ✅ | Declared plus handler tested via hook; physical key presses need a manual check |
| Toolbar badge progress | 🟡 | Visual only |
| Capture of cross-origin iframe internals' sticky/fixed elements | ⛔ | Not reachable from the top frame |
| Capture of chrome://, other extensions, Chrome Web Store | ⛔ | Chrome policy |
| Faster than 2 frames per second | ⛔ | Chrome's `captureVisibleTab` quota |

## Editor

| Feature | Status | Notes / test |
|---|---|---|
| Crop with handles, aspect presets (free, 1:1, 4:3, 16:9, 9:16) | ✅ | `editor.spec` crop; unit `cropDoc`; aspect presets 🟡 |
| Rotate left/right, flip horizontal/vertical | ✅ | `editor.spec`, unit transforms |
| Resize (with aspect lock and % presets) | ✅ | `editor.spec`, unit `resizeDoc` |
| Zoom in/out, fit, actual size, Ctrl+wheel zoom, pan (wheel, Space-drag, hand tool) | 🟡 | Zoom math unit-tested (`zoomAt`); UI interactions used in E2E indirectly |
| Reset all edits | ✅ | Unit `resetDoc`; button 🟡 |
| Arrow (one or both heads), line (solid/dashed) | ✅ | `editor.spec`, unit rendering |
| Rectangle, rounded rectangle, ellipse (border, fill, radius) | ✅ | `editor.spec`, unit rendering |
| Pen (smoothed, simplified), highlighter (multiply blend) | ✅ | `editor.spec`, unit rendering |
| Text (font, size, bold, colour, background, outline; double-click to edit) | ✅ | `editor.spec` text |
| Numbered step markers (auto-increment) | ✅ | `editor.spec`, unit |
| Symbols (check, cross, question, warning, info, star, heart) | ✅ | `editor.spec` |
| Colour, thickness, opacity, fill, font controls | 🟡 | Store style logic unit-tested; panel controls not individually automated |
| Select, multi-select (Shift), marquee, move, resize, nudge | ✅ | Partly E2E (select, duplicate, delete); unit geometry |
| Duplicate, delete, layer order (front/forward/backward/back), layer list | ✅ | `editor.spec`, unit store |
| Undo/redo (100 steps; one step per gesture) | ✅ | `editor.spec`, unit store |
| Blur (strength), pixelate (block size) | ✅ | Exported pixels verified (`editor.spec`) |
| Solid redaction (colour) flattened into PNG/JPEG/WebP/PDF/clipboard | ✅ | Exported files verified; original kept non-destructively |
| Blur/pixelate reversibility warning | ✅ | Shown in the properties panel |
| Apply edits permanently (replace library original) | 🟡 | Storage path unit-tested (`replaceOriginal`); UI flow not automated |
| Autosave and reopen; edited thumbnail | ✅ | `editor.spec`, `app.spec` |
| Large images (tiling) | 🟡 | Tiling implemented; long captures (7200 px) are edited in tests, multi-tile images only up to the split tests |
| Per-object rotation | ⏳ | |
| Custom font upload | ⏳ | |

## Composer

| Feature | Status | Notes / test |
|---|---|---|
| Presets: fit to screenshot, 16:9, 4:3, 1:1, 4:5, 9:16, 1200×630, 1920×1080, custom (aspect lock) | ✅ | Unit layout; `app.spec` 1200×630 export |
| Background: solid / gradient (presets plus custom, angle) / transparent | ✅ | Solid verified in export; gradient unit-tested |
| Padding, corner radius, shadow, fit/fill/custom scale, nine-point alignment | ✅ | Unit layout; rendering 🟡 |
| Generic browser-window frame (light/dark) with domain | 🟡 | |
| Download, copy, save to library | ✅ | Download and save in `app.spec`; copy 🟡 |

## Export

| Feature | Status | Notes / test |
|---|---|---|
| PNG / JPEG / WebP with quality | ✅ | Magic bytes and pixels verified (`editor.spec`) |
| PDF: lossless or compact; A4/Letter multi-page or fit-to-image | ✅ | Unit (pdf-lib parse, xref, predictor round-trip, layout); E2E single-page pixels |
| Copy to clipboard (PNG) | ✅ | `editor.spec` reads the clipboard back |
| Bulk export as ZIP | ✅ | `app.spec` (validated with Python `zipfile`) |
| Combined PDF from several screenshots | ✅ | `app.spec` (pdf-lib page count) |
| Filename templates and download sub-folder | ✅ | Unit; `app.spec` template applied |
| Downloads reported only after completion; cancellation detected | ✅ | Every E2E export waits for `complete` |
| Ask where to save | 🟡 | Passes `saveAs` to Chrome |
| No watermarks | ✅ | Pixel checks show only user content |
| Export presets | ⏳ | |

## Library

| Feature | Status | Notes / test |
|---|---|---|
| Grid and list views; lazy thumbnails; incremental rendering | ✅ | `app.spec` |
| Search (name, title, domain, URL, tags); domain filter; sort | ✅ | `app.spec`, unit filtering |
| Favourites, collections (create, rename, delete, move), tags, rename | ✅ | `app.spec` (rename collection 🟡), unit storage |
| Bulk select, export, favourite, move, delete (with confirmation) | ✅ | `app.spec` |
| Reopen in editor, copy, download again, details dialog (metadata) | ✅ | Reopen and details in `app.spec`; copy/download from card 🟡 |
| Duplicate detection (dHash) | ✅ | Unit; UI view 🟡 |
| Screenshot comparison (side by side, overlay, difference) | 🟡 | |
| Import (file picker), paste, drag and drop | ✅ | File picker in `app.spec`; paste and drop 🟡 |
| Storage usage display; clear all local data | ✅ | `app.spec` |
| Split captures grouped as parts, with navigation in the editor | 🟡 | Parts creation tested; navigation UI not automated |
| Local OCR / searchable screenshot text | ⏳ | |

## Popup, settings, onboarding

| Feature | Status | Notes / test |
|---|---|---|
| Popup capture modes, live progress, Stop & save, Cancel, recent captures | ✅ | `app.spec` popup (opened in its own window) |
| Popup warning on restricted pages | 🟡 | |
| Settings: theme (system/light/dark), default format, filename template, clear data | ✅ | `app.spec` |
| Settings: capture options, quality, folder, PDF, shortcuts list | 🟡 | Validation unit-tested |
| Welcome page on install | 🟡 | Disabled in E2E builds |
| Light, dark, and system themes | ✅ | Dark asserted; visuals reviewed in screenshots |
| Keyboard navigation, focus rings, ARIA labels, reduced motion | 🟡 | Built in; no automated accessibility audit yet |

## Privacy & security

| Feature | Status | Notes / test |
|---|---|---|
| No network access from extension pages or the SW (CSP) | ✅ | `privacy.spec` |
| No foreign requests during capture → edit → export | ✅ | `privacy.spec` |
| Works offline | ✅ | `privacy.spec` |
| No host permissions, no remote code, no analytics | ✅ | Manifest check; bundle contains no tracking libraries |

## Optional advanced features

| Feature | Status |
|---|---|
| Timed capture | 🟡 implemented (visible capture) |
| Duplicate detection | ✅ |
| Screenshot comparison | 🟡 |
| Screenshot-to-PDF compilation | ✅ |
| Automatic filename templates | ✅ |
| Image conversion (export to another format) | ✅ |
| Metadata inspection (details dialog) | 🟡 |
| Image compression (JPEG/WebP quality, compact PDF) | ✅ |
| Local OCR, searchable text | ⏳ |
| Batch capture of selected tabs | ⏳ |
| Export presets | ⏳ |
