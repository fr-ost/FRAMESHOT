# Changelog

All notable changes to FrameShot (formerly Frameora) are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [1.2.0] — 2026-11-08

### Added
- **Screen recorder, built in.** Record a browser tab, an app window or the entire screen, chosen in Chrome's own share picker — no new permissions.
  - Tab sound (and whole-screen system sound where Chrome offers it) and your microphone, mixed into one track; mute the microphone while recording; device pickers and a live level meter.
  - Optional **camera bubble** drawn into the video, in any corner and three sizes, adjustable while recording.
  - Countdown (off, 3, 5, 10 s), **pause and resume** with paused time left out, live preview, timer and size.
  - **MP4 (H.264)** that plays everywhere, or WebM; 720p to 4K; 15, 30 or 60 fps. WebM files get a real duration so they seek in every player.
  - Stop from the recorder, Chrome's "Stop sharing" bar, the popup, a floating pill on every Studio screen, or a new **Start/stop recording** shortcut (assign it at `chrome://extensions/shortcuts`). Toolbar badge shows the countdown, `REC` and `II` (paused).
  - Recordings are written to the library in ~2-second chunks while recording; if the recorder tab closes or crashes, the next visit offers to **recover** the recording (minus the last few seconds).
  - **Player** for every recording: download, rename, favourite, delete, and **Save frame** to turn any moment into a screenshot you can annotate.
- Library: a **Recordings** view, video cards with play button, length and format, video downloads, and recordings in bulk ZIP exports (PDF exports hold images only and say so).
- Popup: **Record screen** action, and live controls (pause/resume, stop, mute) while a recording runs.
- Settings: **Screen recording** defaults (format, quality, frame rate, countdown, tab sound).
- Right-click menu: **Record screen…**
- **Review prompt**: a friendly card asking for a Chrome Web Store rating — only after at least 5 captures or recordings and 3 days of use, at most three times, 30 days apart, never in the middle of a capture or recording, and only for Web Store installs. "Rate FrameShot", "Not now" and "Don't ask again" are offered to everyone (no incentives, no star-specific requests, no filtering of unhappy users, per Chrome Web Store policy). Also available any time under Settings → About.

### Changed
- **Store title and summary rewritten around the recorder for Chrome Web Store search:** "FrameShot: Free Screen Recorder & Full Page Screenshot".
- Library "All screenshots" is now **All captures**.
- Toolbar tooltip: "FrameShot — screenshot or record your screen".

### Fixed
- Opening the library or the recorder now brings an already-open FrameShot tab forward instead of always opening a new one. (Chrome hides tab addresses from extensions without the `tabs` permission, so the old check never matched; open pages now announce themselves on a local channel.)
- Architecture notes named the storage database and settings key incorrectly after the rename (they keep their original `frameora` names).

## [1.1.0] — 2026-11-08

### Changed
- **Renamed from Frameora to FrameShot.** Existing screenshots and settings are kept: the screenshot database and settings storage keep their original internal names. Default file names now start with `frameshot-`.
- **Store title and summary rewritten for Chrome Web Store search:** "FrameShot: Free Full Page Screenshot, Screen Capture & Editor".
- **Redesigned interface (design system v2):** a slowly drifting aurora background with fine grain, glass surfaces, a single gradient accent, and fluid motion — page transitions (View Transitions API), animated dialogs, menus, tooltips and toasts, staggered card entrances, shimmer loading states, hover lift and press feedback. Every animation is disabled when the system asks for reduced motion.
- **Dark theme** refined across every screen, with a quick theme switch in the library header and visual theme tiles in Settings.
- Popup: hero "Full page" action, animated progress ring, self-drawing success check.
- Library: glass sidebar and header, quick Copy/Download on hover, floating bulk-action bar, skeleton loading.
- Editor: floating glass tool rail with a gradient active state, dotted canvas, glass panels.
- Settings: sticky section navigation that follows your scroll.
- Welcome page: new hero and feature overview.
- In-page selection overlay: glass hint and toolbar, glowing selection, gradient size badge.

### Added
- Footer credit: "A Product of Unique Labs. Developed by Shahriar Ahmed", linking to www.shahriarahmed.net (opens in a new tab only when clicked).

### Fixed
- The popup could stay stuck on "Select what to capture…" if the tab was closed or reloaded while an area/element selection was showing; Cancel now always ends a pending selection, and closing or navigating the tab resets it automatically.
- Two-column layouts that Tailwind v4 ignored (Settings, Library details, editor info) because of a comma in the arbitrary grid value.

## [1.0.1] — 2026-11-08

### Fixed
- **Full-page captures failing with "about 1 px missing"** on displays with fractional scaling (125%, 150%, 175% in Windows display settings) or non-100% page zoom, regardless of the scroll delay. Chrome reports the viewport and page height as rounded integers (for example 717 px for a 717.333 px viewport), so Frameora underestimated each frame by a fraction of a pixel and could never reach the page's last device-pixel row. Frameora now:
  - measures the true fractional viewport (`visualViewport`) and fractional scrolling-panel boxes,
  - uses the exact device pixel ratio when it matches the captured frames,
  - scrolls to the browser's real end position on the last step,
  - aims retry frames so gaps land inside the viewport, and
  - fills rounding slivers of at most one CSS pixel by repeating the adjacent row. Real missing content still fails the capture, as before.

### Tests
- New realistic rounding simulation (2,000 scenarios across 10 device scales) and real-browser captures at 125%, 150%, and 175% device scale on pages with fractional heights.

## [1.0.0] — 2026-11-07

First release candidate. Not yet published to the Chrome Web Store.

### Added
- **Capture**:
  - Visible area (optional 3, 5, or 10 s delay).
  - Full page, with smart sticky/fixed handling, lazy-content preload, animation freezing, horizontal overflow, app-shell panel detection, max-height limit, Stop & save, and cancel (popup, Esc, or command).
  - Selected area (scroll to extend), element picker, and scrolling-panel capture.
- **Stitching engine**:
  - Rate-limited frame capture (Chrome's two-per-second quota).
  - Coverage tracked in output device pixels, so there are no seams at fractional scales.
  - Gap retries; incomplete captures are refused, never saved.
  - Pages that grow or shrink during capture are handled.
  - Oversize pages are split into full-resolution parts or scaled, always with an explicit warning.
  - Page state is restored exactly.
- **Editor**:
  - Non-destructive crop, rotate, flip, resize; zoom and pan.
  - Twelve object types: arrow, line, rectangle, rounded rectangle, ellipse, pen, highlighter, text, numbered markers, symbols, blur, pixelate, and redaction.
  - Selection, move and resize handles, duplicate, layers, 100-step undo/redo, autosave.
  - "Apply edits permanently" to replace the library original.
- **Privacy tools**: blur, pixelation, and solid redaction flattened into exported pixels, with a reversibility warning for blur and pixelation.
- **Composer**: presets, solid/gradient/transparent backgrounds, padding, radius, shadow, fit/fill/custom scale, alignment, and a generic window frame; download, copy, or save to library.
- **Export**:
  - PNG, JPEG, and WebP with quality control.
  - Dependency-free PDF writer: lossless or compact; A4/Letter multi-page or fit-to-image.
  - Clipboard copy.
  - Bulk ZIP and combined PDF.
  - Filename templates and download sub-folder.
  - Downloads confirmed before "Saved" is shown.
- **Library**: IndexedDB storage, grid/list views, search, domain filter, sorting, favourites, collections, tags, rename, details, bulk actions, duplicate detection, comparison view, import/paste/drag-drop, storage usage, clear all data.
- **Quick Capture popup** with live progress, Stop & save, Cancel, and recent captures; right-click menu; keyboard commands.
- **Settings**: theme, formats and quality, filename template, folder, capture behaviour, PDF options, shortcut overview, storage, privacy, about.
- **Onboarding** welcome page; original logo and icons; light, dark, and system themes.
- **Security**: strict CSP blocking all network connections; no host permissions; no remote code.
- **Tests**: unit tests (Vitest) and real-browser E2E tests (Playwright) with pixel-level verification of captures and exported files.
- **Documentation**: README, architecture, features, roadmap, privacy, security, testing, store listing, privacy disclosure, release checklist, and competitor research.
