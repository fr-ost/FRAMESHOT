# FrameShot Architecture

This document describes how FrameShot is structured and why. All references are to files under `src/`.

## 1. Overview

```
                     ┌──────────────────────────── Extension origin (chrome-extension://…) ───────────────────────────┐
                     │                                                                                                 │
  user ──click──▶ Popup (popup/) ──┐                                                                                   │
  user ──keys───▶ chrome.commands ─┼─▶ Background service worker (background/)                                         │
  user ──menu───▶ contextMenus ────┘     • capture-session.ts  orchestration, limits, saving                           │
                                         • frame-capture.ts    rate-limited captureVisibleTab                          │
                     status port ◀────── • stitcher.ts         segmented OffscreenCanvas                               │
                     + badge             • status.ts           port broadcast + storage.session + badge                │
                                                │                                                                       │
                                                │ IndexedDB: items / blobs / docs / collections (db/db.ts)              │
                                                ▼                                                                       │
                                         FrameShot Studio (app/, library/, editor/, composer/, settings/)                │
                     └────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                                   │ chrome.scripting.executeScript (activeTab, on demand)
                                                                   ▼
                                         Content agent (content/) in the captured tab, isolated world
                                           • scroll steps, frame geometry, sticky/fixed handling, preload, restore
                                           • area / element / scrollable pickers (closed shadow root)
```

The guiding principles:

- **Pure logic is separate from browser APIs.** The capture planner, geometry, settings, filenames, editor model, pixel effects, composer layout, and PDF/ZIP writers are plain TypeScript, unit-tested in Node.
- **UI is not coupled to capture.** The popup and Studio send typed requests and observe status. They never touch capture internals.
- **No large payloads over messaging.** Images move through IndexedDB; messages carry only ids and geometry.

## 2. Modules

| Module | Location | Responsibility |
|---|---|---|
| Popup | `popup/PopupApp.tsx`, `entrypoints/popup/` | Quick-capture buttons, delay picker, live status (progress, Stop & save, Cancel), recent captures |
| Studio app | `app/StudioApp.tsx`, `entrypoints/studio/` | Hash router (`#/`, `#/edit/:id`, `#/compose/:id`, `#/settings`, `#/welcome`, `#/compare/:a/:b`), providers, lazy-loaded screens |
| Background SW | `background/main.ts`, `entrypoints/background.ts` | Message routing, commands, context menus, onboarding, Studio tab management |
| Capture orchestrator | `background/capture-session.ts` | Resolves the target, prepares the page, runs frames, verifies completeness, saves, restores |
| Frame capture | `background/frame-capture.ts` | Paces `captureVisibleTab` (≥ 520 ms apart), retries on quota errors, checks the tab is still visible |
| Stitcher | `background/stitcher.ts` | Segmented output canvases; finalizes segments early (PNG, thumbnail, dHash) |
| Content agent | `content/agent.ts`, `entrypoints/capture-agent.ts` | Measuring, main-scroller detection, scrolling, fixed/sticky handling, lazy preload, restoration |
| Pickers | `content/overlay.ts` | Area selection, element picker, scrollable picker |
| Capture planner | `core/capture-plan.ts`, `core/geometry.ts` | Scroll-step planning, `StitchPlanner` coverage math, segment/limit math |
| Imaging | `imaging/effects.ts`, `imaging/image-io.ts` | Blur/pixelate/redact on RGBA buffers; encode/decode, thumbnails, dHash, canvas-limit probe |
| Editor model | `editor/model/` | Document types, transform pipeline, object geometry, `EditorStore` with undo/redo |
| Editor render | `editor/render/` | Shared annotation drawing, tiled base image, view renderer, export flattening |
| Editor UI | `editor/ui/` | Editor screen, pointer interaction, toolbar, properties panel |
| Composer | `composer/` | Pure layout math, renderer, UI |
| Export | `export/` | PDF writer, ZIP writer, downloads and clipboard, export service, export dialog |
| Database | `db/db.ts` | IndexedDB schema and CRUD, BroadcastChannel change events |
| Settings | `core/settings.ts`, `settings/SettingsPage.tsx` | Defaults, validation/clamping, persistence in `chrome.storage.local` |
| Shared UI | `ui/` | Design-system primitives, dialogs, menus, toasts, colour picker, hooks |

## 3. Message contracts (`core/messages.ts`)

All messages are typed discriminated unions.

| Direction | Type | Examples |
|---|---|---|
| Pages/commands → SW | `BgRequest` | `capture.start {mode, tabId?, delayMs?}`, `capture.cancel`, `capture.stop`, `capture.status`, `studio.open {route}` |
| Agent → SW | `AgentEvent` | `agent.selection {session, selection}`, `agent.cancelled`, `agent.escape` |
| SW → agent | `AgentRequest` | `agent.ping`, `agent.measure`, `agent.resolve`, `agent.prepare`, `agent.preload`, `agent.scroll`, `agent.restore`, `agent.pick`, `agent.cancelPick` |
| SW → popup | `StatusPortMessage` over the `frameshot-status` port | `{ kind: 'status', status: CaptureStatus }` |
| Any → any page | `BroadcastChannel('frameshot-library')` | `items-changed`, `collections-changed`, `cleared` |

Responses use `Result<T> = { ok: true, data } | { ok: false, error, code? }`. The SW accepts messages only when `sender.id === chrome.runtime.id`. The agent accepts only `agent.*` messages from its own extension.

## 4. MV3 service-worker lifecycle

- All listeners (`onMessage`, `onConnect`, `commands`, `contextMenus`, `onInstalled`, `onStartup`) are registered **synchronously** in `registerBackground()`.
- No state is assumed to survive a restart:
  - **Pending picks.** For area, element, and scrollable captures the SW injects the agent, shows the picker, and stores `{session, tabId, windowId, mode}` in `chrome.storage.session`. The user may take minutes to choose. When the agent reports the selection, a fresh SW can validate it against storage (session id and sender tab) and continue.
  - **Status** is mirrored to `chrome.storage.session`. If the SW restarts mid-capture, `restoreStatus()` reports an honest "capture was interrupted" error.
  - **Agent watchdog.** The content agent restores the page by itself if it receives no command for 30 s, and on `pagehide`. A page is never left modified if the SW dies.
- During a capture, frequent extension API calls (scroll messages, `captureVisibleTab` about every 0.5 s) keep the SW alive.
- Large data never goes through messaging. Frames are drawn into an `OffscreenCanvas` inside the SW; finished images go straight to IndexedDB, and the editor tab opens with only the item id.

## 5. Capture engine

### 5.1 Starting a capture
1. `checkPageAccess` rejects known restricted URLs (chrome://, the Web Store, …).
2. The agent is injected on demand with `chrome.scripting.executeScript({ files: ['/capture-agent.js'] })`. This relies on `activeTab`, granted by the toolbar click, the shortcut, or the context menu. The agent guards against double injection with a protocol version.
3. Errors are mapped to plain language (`friendlyCaptureError`). If Chrome hides the tab URL *and* reports a permission error, the page is protected by Chrome.

### 5.2 Visible capture
One `captureVisibleTab`. The agent measures the viewport (best effort), and the frame is cropped to `clientWidth × clientHeight`, excluding scrollbars. The page is not modified.

### 5.3 Multi-frame capture (full page, tall element, large area, scrolling panel)
1. **Resolve the target**: a *scroller* (the window or an element token) plus a *region* in scroller content coordinates.
   - Full page uses `detectMainScroller()`. If the document doesn't scroll (for example `overflow: hidden` on html/body), the largest visible vertically-scrollable element covering at least 25% of the viewport becomes the main scroller (the app-shell case).
   - Element captures use the nearest scrollable ancestor.
   - Scrolling-panel captures use the element itself.
2. **Fast path.** If the region is already fully visible, FrameShot takes a single frame with **no page modifications and no scrolling**.
3. **Prepare the page** (otherwise):
   - Inject `CAPTURE_CSS` (and optionally `FREEZE_CSS`) with `chrome.scripting.insertCSS({ origin: 'USER' })`, which page CSP cannot block. It disables smooth scrolling and scroll snapping, and defines rules for two marker attributes.
   - **Sticky elements** get `data-frameshot-unstick` and become `position: relative` with `inset: auto`. They then render at their natural position, with the same layout box.
   - **Fixed elements** are classified as *top* (centre in the upper half, or taller than 80% of the viewport) or *bottom*. In **smart** mode (the default), the first row shows top-anchored ones, the last row shows bottom-anchored ones, middle rows hide both, and a single-row capture shows all. Hiding uses `data-frameshot-hide` (`visibility: hidden; opacity: 0`, no transitions), which doesn't affect layout. The captured element, the scroller, and their ancestors and descendants are never hidden.
   - Optional **lazy preload** scrolls through the page in roughly 0.9-viewport steps (25 s budget, bounded by the max-height setting) and waits for images. It then returns to the top and re-measures, which also expands infinite-scroll pages.
4. **Plan** with `planScrollSteps(region, view, maxScroll, overlap)`. Steps are viewport-sized, row-major, and the last step is aligned to the region's end. A 2 CSS-px overlap is used when the device scale is fractional.
5. **Run the frames.** For each step:
   - The agent scrolls (`behavior: 'instant'`), applies fixed visibility, waits two paints, the settle delay, and up to 1.2 s for visible images, then returns `FrameGeometry`. That is the visible window in content coordinates and in viewport coordinates.
   - The SW checks the tab is still active and visible, then captures.
   - The capture scale comes from `frameScale()`: the exact `devicePixelRatio` when it agrees with the first frame (within 1%), otherwise the measured `image.width / innerWidth`. The measured ratio alone is slightly off at fractional scales because `innerWidth` is a rounded integer (2244 / 1282 = 1.7504 instead of 1.75); emulated DPRs can disagree with the frame entirely (observed in headless Chromium), in which case the measured ratio wins.
   - **Sub-pixel geometry.** Chrome reports integer CSS sizes rounded from fractional layout values: at 150% display scaling `clientHeight` is 717 while the real viewport (and the captured frame) is 717.333 px, and the maximum scroll offset is fractional (6482.667). The agent therefore reports the fractional `visualViewport` size (and fractional element boxes for scrolling panels), and the final scroll step asks the browser to scroll "as far as possible" so it reaches its true maximum.
   - Window resizes or zoom changes during the capture abort it.
6. **Stitch.** `StitchPlanner` turns each frame into a draw operation that paints only *new* pixels.
   - Coverage is tracked in **output device pixels, after rounding and clamping to the frame**. The first design tracked it in CSS pixels; a unit test at scale 1.25 showed that clamping could leave a 1-device-pixel seam, so it was rewritten.
   - With equal capture and output scales, source and destination sizes match exactly, so there is no resampling.
   - In the last row, the strip under bottom-anchored fixed elements is repainted so a fixed footer appears exactly once.
   - **Rounding slivers.** A gap next to a frame that is at most `StitchPlanner.sliver` output pixels (one CSS pixel plus one device pixel) is a rounding artifact — for example the last device-pixel row of a page whose real height is 4999.6 px but whose `scrollHeight` reports 5000 — and is filled by repeating the frame's adjacent edge row (`DrawOp.extra`). Larger gaps are never filled this way.
7. **Verify completeness.** `uncovered()` computes gaps with a sweep line, and up to two rounds of retry frames fill them (`addGapFill`). Retries are aimed with `retryScrollTarget()` so the gap sits a third of the way into the viewport, not at its edge where device-pixel scroll snapping could miss it again. If gaps remain, the capture **fails and nothing is saved**. FrameShot never stores a silently incomplete image.
8. **Growing and shrinking pages.** During full-page capture, the page height is re-read every frame. The region grows (up to the max-height setting) or shrinks, the remaining steps are re-planned, and a warning is attached.
9. **User stop.** *Stop & save* truncates to the contiguous painted height and labels the item **partial**, with a warning.
10. **Restore** (always, in `finally`): remove the attributes, `removeCSS` with the identical CSS strings, and restore the scroll positions of inner scrollers, then the window. Tests compare `documentElement.outerHTML` and scroll positions before and after.

### 5.4 Output size, segments and limits
- Limits: `maxDimension = min(32767, probed)` and `maxPixels = 100,000,000` per segment, a memory budget below Chrome's hard area limit. `probeMaxCanvasDimension()` tests 1-px-wide canvases.
- `SegmentedCanvas` allocates segments lazily and resizes the last one when the page grows. A segment is **finalized** (PNG, thumbnail, dHash, canvas released) as soon as frames have moved more than a viewport below it, which keeps peak memory to about one or two segments.
- If more than one segment results:
  - **split** (default): each segment becomes a library item in a group ("part *i* of *n*"), at full resolution;
  - **scale**: segment blobs are decoded one at a time and drawn into a single image scaled by `fitScale()`.
  Either way, a warning tells the user what happened. Overly wide pages are scaled to fit the width, again with a warning.

### 5.5 Pickers
- All picker UI lives in a **closed shadow root** on a host attached to `<html>`, styled only through `style.setProperty(..., 'important')` (CSSOM, which page CSP can't block). Text is set with `textContent` only.
- **Area**: an interactive surface inside the shadow root receives pointer events. The listeners sit on the shadow root, so they can tell a handle from the box or empty space. The selection is stored in main-scroller content coordinates. The wheel scrolls the scroller, auto-scroll kicks in near the edges, and Enter, Esc, arrow keys, and double-click are supported. A selection that stays within the viewport is sent as window coordinates.
- **Element / scrollable**: a non-interactive highlight. Window-level capture-phase listeners swallow clicks so the page doesn't react. ↑/↓ walk ancestors and descendants. Elements are referred to by random tokens, never by selectors.
- After the overlay is removed, the agent waits two paints before reporting the selection, so the overlay never appears in the capture.

## 6. Editor

### 6.1 Document model (`editor/model/types.ts`)
```
EditorDoc {
  source: { width, height }          // original pixels (never modified)
  crop: Rect                         // in source pixels
  orientation: [a, b, c, d]          // D4 integer matrix (rotations × flips)
  output: { width, height }          // final size (resize)
  objects: EditorObject[]            // z-ordered, in OUTPUT coordinates
}
```
- Twelve object types: arrow, line, rect (with radius), ellipse, pen, highlighter, text, marker, symbol, blur, pixelate, redact.
- `docMatrix()` maps source to output pixels: translate the crop centre to the origin, apply the orientation, translate by half the oriented size, then scale to the output size.
- Rotating, flipping, cropping, and resizing produce new documents and remap every object (`mapObjects`). Crop rectangles given in output coordinates are inverse-mapped to source pixels.
- Stored documents are validated (`isValidDoc`) before use.

### 6.2 Store (`editor/model/store.ts`)
- `EditorStore` is framework-agnostic. React reads it through `useSyncExternalStore`.
- Documents are immutable, so history is a stack of snapshots (100 entries).
- Gestures (drag, draw, text editing, slider previews) update transiently and commit **one** undo step when they end.

### 6.3 Rendering
- **Base image** (`render/base.ts`): images larger than 4096 px on a side are split into 2048 px tiles that **overlap by 2 px**, so antialiased tile edges never produce seams. The view culls tiles that are off-screen.
- **Annotations** (`render/draw.ts`): one drawing implementation shared by the view and the export.
- **View** (`render/view.ts`):
  - Content is drawn with the zoom and pan transform; handles and the crop overlay are drawn in screen space.
  - Privacy effects are computed **exactly**, with the same functions as the export, and cached per effect. The cache key includes the document transform and any earlier overlapping effects.
  - While an effect is being dragged, a cheap preview is shown instead: a CSS blur filter, a downscale/upscale for pixelation, or a fill.
  - Very large effect areas are previewed at reduced resolution (6 megapixel budget).
- **Export** (`render/flatten.ts`):
  1. Draw the base through the document matrix.
  2. For each effect, `getImageData` the region (padded for blur), process it in JS, and `putImageData` the result. **putImageData replaces pixels**, so no original pixel survives inside an effect region. Redaction output is always fully opaque.
  3. Draw the annotations on top.

  Effects always render beneath annotations.

### 6.4 Persistence
- Documents autosave 500 ms after a change, when no gesture is in progress, to the `docs` store.
- The item's `hasEdits` flag and edited size are updated, and the library thumbnail is re-rendered from the flattened document.
- The thumbnail refresh also runs synchronously when the editor unmounts. A bug where leaving within 1.2 s skipped it was found by screenshot review and fixed, with an E2E test.
- **Apply edits permanently** replaces the original blob and deletes the document.

## 7. Composer
- `composer/layout.ts` (pure) computes the canvas size from the preset and the object rectangle, with padding, fit/fill/custom scale, alignment, and the frame-bar height.
- `composer/render.ts` draws the background (solid, gradient, or none), the shadow (filling the rounded shape with a canvas shadow), the clipped frame and screenshot, and an optional domain pill.
- The input is the item's flattened render, so edits and redactions carry over.

## 8. Export
- `export/pdf.ts` is a dependency-free PDF 1.7 writer.
  - Images are lossless (RGB, PNG "Up" predictor, `CompressionStream('deflate')`, so the result is FlateDecode with `/Predictor 15`) or JPEG (DCTDecode).
  - Pages can be A4 or Letter, where long images are sliced across pages and never enlarged past their natural size (allowing for the device scale), or sized to fit the image (capped at 14,400 pt).
  - Each page is encoded in 2048-row strips to bound memory.
- `export/zip.ts` is a STORE-method ZIP writer with CRC-32 and UTF-8 names.
- `export/deliver.ts`:
  - `chrome.downloads.download` with a blob URL; success is reported **only after `state === 'complete'`**, and user cancellation is detected.
  - Clipboard copy uses `navigator.clipboard.write` with PNG.
- `export/service.ts` loads an item with its document, flattens and encodes it, builds the filename, and handles bulk ZIP and combined PDF.
- JPEG output is flattened onto white, because Chrome would otherwise turn transparency black. Canvas re-encoding drops EXIF metadata.

## 9. Storage schema (`db/db.ts`, database `frameshot` v1)

| Store | Key | Value |
|---|---|---|
| `items` | `id` (index `createdAt`) | `LibraryItem` metadata: name, source `{url,title,domain}`, mode, sizes, byteSize, favourite, collectionId, tags, hasEdits, group, warnings, partial, scale, dhash |
| `blobs` | `${id}:original`, `${id}:thumb` | Image blobs (PNG original, WebP thumbnail) |
| `docs` | `id` | `{ id, doc: EditorDoc, updatedAt }` |
| `collections` | `id` | `{ id, name, createdAt }` |

- Quota errors become a friendly `StorageFullError`. `unlimitedStorage` is requested so large libraries aren't evicted.
- Settings live in `chrome.storage.local` under `frameshot.settings` and are always passed through `sanitizeSettings`.
- Small per-device UI preferences (theme cache, editor tool style, composer settings, popup delay) are kept in `localStorage`.

## 10. Content Security Policy

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:;
font-src 'self'; connect-src 'self' blob: data:; media-src 'self' blob: data:; worker-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'
```

This applies to every extension page and the service worker. `connect-src` makes network requests from FrameShot's own contexts impossible; an E2E test checks that `fetch`, beacons, and remote images are blocked. All fonts (Inter) and icons are bundled. There is no remote code.

## 11. Builds

| Build | Command | Difference |
|---|---|---|
| Production | `npm run build`, `npm run zip` | No host permissions, no test hooks |
| E2E | `npm run build:e2e` (`FRAMESHOT_E2E=1`) | Adds `host_permissions: ["<all_urls>"]`, plus `__frameshotTest` on the SW, `__frameshotEditor` on the editor window, and a test-only canvas-limit override, all gated by the compile-time constant `__FRAMESHOT_E2E__` |

## 12. UI and design system

- **Tokens** (`styles/globals.css`): semantic colors (`--fr-bg`, `--fr-surface`, `--fr-fg`, `--fr-primary`, …) defined for light and dark (`:root.dark`), exposed to Tailwind v4 via `@theme inline`. Components never use raw palette values.
- **Surfaces:** `.fr-glass` / `.fr-card` (translucent surface + `backdrop-filter`), `.fr-aurora` (fixed, slowly drifting radial gradients plus an SVG grain texture, animated with transforms only so it stays cheap), `.fr-canvas-bg` (dotted grid behind the editor and composer canvases).
- **Accent:** one gradient (`.fr-accent-bg`, `.fr-accent-text`, `.fr-btn-primary` with a hover sheen), used only for primary actions, active tools, progress and highlights.
- **Motion:** an expo-out easing (`--fr-ease`) everywhere; Radix enter/exit animations through `data-state` (`.fr-pop`, `.fr-dialog`, `.fr-overlay`); staggered entrances (`.fr-stagger` with `--i`); skeleton shimmer; toasts with enter/leave animations and a time-remaining bar.
- **Page transitions:** `navigate()` (`ui/hooks.ts`) keeps the route in a tiny store and re-renders synchronously inside `document.startViewTransition`, so screens cross-fade and slide; the aurora has its own `view-transition-name` and stays still. Heavy screens are lazy-loaded and preloaded in idle time.
- **Accessibility:** all motion is disabled under `prefers-reduced-motion`; focus rings are global; icon-only buttons have labels and tooltips; Radix provides focus management and keyboard navigation for dialogs and menus.
- **In-page overlay** (`content/overlay.ts`): styled only through CSSOM and animated with the Web Animations API, both of which page CSP cannot block.

