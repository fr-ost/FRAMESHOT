# FrameShot Roadmap

FrameShot is free forever. Nothing on this roadmap will ever become a paid feature, and nothing here adds accounts, cloud storage, or tracking unless it is explicitly optional and local-first.

## Shipped in 1.0.0

Everything in [FEATURES.md](FEATURES.md) marked ✅ or 🟡, including these optional extras:

- Timed capture (3, 5, or 10 s delay for the visible area)
- Duplicate detection (64-bit perceptual difference hash)
- Screenshot comparison (side by side, overlay, pixel difference)
- Screenshot-to-PDF compilation (bulk export as one combined PDF)
- Filename templates and a download sub-folder
- Image conversion through export (PNG ⇄ JPEG ⇄ WebP ⇄ PDF), with quality control
- Metadata inspection (details dialog: source, mode, sizes, pixel density, capture notes)
- Import, paste, or drag-and-drop images into the library

## Deferred

| Item | Why it is deferred / what it needs |
|---|---|
| **Local OCR and searchable screenshot text** | Needs a bundled OCR engine (for example Tesseract compiled to WASM, plus language data of several MB) and `'wasm-unsafe-eval'` in the extension CSP. Text recognition must stay 100% local. Deferred to keep 1.0 small and the CSP strict. |
| **Batch capture of several tabs** | Capturing tabs the user did not invoke FrameShot on requires host permissions. Planned as an *optional* permission requested only when the feature is used. |
| **Export presets** (named format/quality/size combinations) | The settings model supports it; it needs UI and storage work. |
| **More metadata options** | Canvas re-encoding already drops EXIF and other embedded metadata from exports. Options to *add* metadata (title, source URL) to PNG/PDF exports are not implemented. |
| **Web Worker for heavy effects** | Blur and pixelation run on the main thread. Very large effect regions (tens of megapixels) can make the editor pause briefly. Moving `boxBlur`/`pixelate` to a worker is planned. |
| **Per-object rotation** in the editor | Objects can be moved and resized, but not rotated individually. |
| **Custom font upload** | Text uses bundled Inter and system font stacks (sans, serif, mono, rounded). |
| **Microsoft Edge / Firefox ports** | Edge should work with minor packaging changes; Firefox needs MV3 API differences handled (WXT supports both). |
| **Translations (i18n)** | The UI is English only. |
| **Optional sync between devices** | Would conflict with the local-first promise unless strictly opt-in and end-to-end encrypted. Not planned for now. |
| **Automated accessibility audit** | Keyboard support, focus rings, and ARIA labels are built in; an axe-core audit in CI is planned. |
| **Scheduled/automated captures, video recording** | Out of scope for 1.0. |

## Not possible in Chrome (browser restrictions)

- Capturing `chrome://` pages, other extensions' pages, or the Chrome Web Store.
- Capturing faster than two frames per second (Chrome's `captureVisibleTab` quota).
- Adjusting sticky or fixed elements inside cross-origin iframes or closed shadow roots.
- Single images larger than the browser's canvas limits. FrameShot splits or scales instead.

## Release hygiene backlog

- Formal trademark clearance for the "FrameShot" name (see [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md) §8) before public launch.
- Store screenshots and promotional tiles produced from real captures.
- A CI workflow running `npm test` and `npm run test:e2e` on every push.
