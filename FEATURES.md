# FrameShot Features

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

## Screen recorder

| Feature | Status | Notes / test |
|---|---|---|
| Record a tab, window or entire screen via Chrome's share picker (no permissions) | ✅ | `recorder.spec` (fake picker shares a tab); real window/screen picks 🟡 manual |
| Recorder never offered as a source (`selfBrowserSurface: exclude`); switch tabs mid-recording | 🟡 | Picker hints passed to Chrome; Chrome's picker UI not automatable |
| Tab sound + microphone mixed into one track | ✅ | `recorder.spec` (fake devices; `hasAudio` asserted) |
| The shared tab's own sound is in the saved video (MP4 and WebM), recorded without voice-call processing where Chrome allows | ✅ | `system-audio.spec` (a tab playing a tone is shared and the recording's audio decoded) |
| Sound guidance: what to tick in Chrome's dialog per system and surface; live sound meter; "no sound" banner with discard and retry | ✅ | `system-audio.spec`, unit `audio-help.test` |
| Mute/unmute the microphone while recording | 🟡 | Implemented (gain ramp); not asserted on audio samples |
| Microphone/camera device pickers and live level meter | 🟡 | Default devices tested; choosing a second device not automated |
| Camera bubble composited into the video (corner, size; adjustable while recording) | ✅ | `recorder.spec` checks the bubble's pixels in the saved video; live re-layout 🟡 |
| Countdown, pause/resume with pauses left out | ✅ | `recorder.spec` pause (duration checked) ; countdown visual 🟡 |
| Toolbar badge: countdown, `REC`, `II` | ✅ | `recorder.spec` reads the badge text |
| MP4 (H.264, AAC or Opus) with WebM fallback; WebM | ✅ | Both containers recorded and played back in `recorder.spec`; fallback choice unit-tested |
| WebM duration repair (seekable files) | ✅ | Unit (synthetic EBML headers) + E2E (finite `duration`) |
| Quality presets 720p–4K, 15/30/60 fps | 🟡 | Passed as capture limits; only the default asserted |
| Stop from recorder, Chrome's "Stop sharing", popup, Studio pill, shortcut | ✅ | `recorder.spec` (all except the pill click, 🟡) |
| Discard (deletes all recorded data) | ✅ | `recorder.spec` |
| Chunks saved during recording; crash recovery (MP4 and WebM) | ✅ | `recorder.spec` (tab closed mid-recording, then recovered and played) |
| Player: play, download (MP4/WebM), rename, favourite, delete | ✅ | Download and play in `recorder.spec`; rename/favourite 🟡 |
| Save a frame as a screenshot (opens in the editor) | ✅ | `recorder.spec` |
| Export part of a recording as a GIF (trim, width, fps, loop) | ✅ | `recorder.spec` (GIF parsed: size, frames, total delay, loop); unit tests decode every frame |
| GIF size optimisations: one palette, unchanged pixels transparent, identical frames merged | ✅ | `gif.test` (decoded and composited) |
| Player keyboard shortcuts and playback speed | 🟡 | Implemented; covered indirectly |
| Hover preview of recordings in the library | 🟡 | Implemented |
| Recordings in the library (Recordings view, cards, search) | ✅ | `recorder.spec`, unit filtering |
| Bulk ZIP includes video files; PDF leaves recordings out | ✅ | `recorder.spec` |
| Recorder defaults in Settings; last choices remembered | ✅ | `recorder.spec` |
| Long recordings (an hour or more), real devices, system audio | 🟡 | Needs a manual check per platform |
| Recording without a Studio tab (in the background only) | ⛔ | Screen capture needs a page; FrameShot keeps one tab open and protects it |

## Sounds and keyboard

| Feature | Status | Notes / test |
|---|---|---|
| Shutter when a capture is saved (service worker → offscreen document) | ✅ | `recorder.spec` under Chrome's real autoplay policy |
| Recording countdown, start, pause, resume, stop sounds (never recorded) | ✅ | `recorder.spec` checks the sequence |
| Success / error chimes; Settings → Sounds (on/off, volume, test); popup toggle | ✅ | Sounds off verified; levels checked offline (audible, no clipping) |
| Keyboard shortcuts sheet ("?") | ✅ | `ux.spec` |
| Library keys (/, Ctrl/⌘+A, Delete, Esc) | ✅ | `ux.spec` (select all, clear) |

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
| Grid and list views; lazy thumbnails; incremental rendering (60 at a time) | ✅ | `app.spec`; `ux.spec` checks paging in a 150-item library |
| Usable in narrow windows (≈900 px): wrapping header, bulk bar, fixed-layout list | ✅ | `ux.spec` |
| Fast duplicate detection (bit counts, cached) | ✅ | Unit: 4,000 items in well under a second |
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
| Support FrameShot (Donate) page: wallets with verified QR codes, copy, free ways to help; links in sidebar, popup, settings | ✅ | `donate.spec` (exact addresses, images load, clipboard, Donate now); unit (address formats, QR script and files in sync) |
| Popup "Record screen" and live recording controls (pause, stop, mic) | ✅ | `recorder.spec` (pause and stop; mic toggle 🟡) |
| Reusing an open Studio/recorder tab instead of opening another | ✅ | `recorder.spec` shortcut and library-reuse tests (works without the `tabs` permission) |
| Review prompt: after ≥ 3 captures/recordings and ≥ 2 days; at most 3 asks, 3 weeks apart; never mid-task; store installs only; same choices for everyone; clickable five stars; permanent sidebar link | ✅ | `review.spec` (library, popup after a capture, rate button, stars, sidebar link, not now, don't ask again), unit rules |
| "Rate FrameShot" in Settings → About | 🟡 | Same link as the prompt; shown only for store installs |
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
| Screen recording adds no permissions; microphone/camera only after Chrome's prompt | ✅ | Manifest check (`check:bundle`); prompts are Chrome's own |

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
