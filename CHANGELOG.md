# Changelog

All notable changes to Frameora are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

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
