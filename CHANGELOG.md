# Changelog

All notable changes to FrameShot (formerly Frameora) are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.2] — 2026-11-11

### Changed
- **New store name: "FrameShot: Screen Recorder & Full Page Screenshot"** (was "FrameShot: Free Screen Recorder & Full Page Screenshot"). The Chrome Web Store rejected 1.0.1 (violation "Red Nickel") because the small promo tile showed "Free": store titles and images may not use words that mimic ranking, status or promotions, such as "free", "new", "#1", "premium" or "recommended".
- Store images rebuilt without those words: the small tile, the marquee and screenshots 1 and 5 (now `05-private.png`, "Private by design.") drop "Free", "Free forever", "100% free" and "Unlimited". The demo page and the annotation they show no longer say "new".
- The popup no longer shows a "FREE" badge next to the logo (it appeared in every store image), and its "New capture" button is now "Capture again".
- The store-kit check now fails if the name, the summary, the text drawn on the store images, the demo pages or the popup use such words.

FrameShot is still free, with no paid features. The store description still says so in plain sentences, which the policy allows.

## [1.0.1] — 2026-11-10

### Added
- **Anonymous install counts.** When FrameShot is installed or updated it sends its own server (a Cloudflare Worker, source in `server/telemetry/`) a random install ID made on your device, the version (and the previous version after an update), your operating system family and browser language. When it is removed, Chrome opens a short "FrameShot was removed" page on the same server with a link for feedback. Nothing about pages, screenshots, recordings, file names or settings is ever sent, and the server keeps a country code but never the IP address. Turn it off in **Settings → Privacy → Share anonymous install counts**; that also deletes the random ID. Developer test builds never send anything.
- `server/telemetry/`: the tracker Worker with a D1 database and a built-in dashboard (installs, updates and uninstalls per day, active installs, how long installs are kept, 1/7/30-day retention, versions, countries, operating systems, languages), protected by an optional `STATS_KEY`. It already accepts feature-count events for a later version; FrameShot 1.0.1 doesn't send any.

### Changed
- The Content Security Policy now allows exactly one remote origin, `https://frameshot.shahriarahmed614.workers.dev`, in `connect-src`; every other server stays blocked. The bundle check enforces this.
- The privacy policy, the Chrome Web Store privacy answers (now **Location: Yes**, for the country code), the store description, the website and the in-app privacy notes describe the install counts.

## [1.0.0] — 2026-11-08 — first public release

The first version published on the Chrome Web Store. It includes everything from the internal development builds listed under "Development history" below; this section lists what was added in the last of them.

### Added
- **About the developer**: Shahriar Ahmed's photo, name and website (www.shahriarahmed.net) in Settings → About, on the Welcome and Support pages, and a small avatar beside the name in every credits line.
- **Support FrameShot (Donate) page**: optional crypto tips to the developer (EVM networks for ETH, USDT, BNB, AVAX and more; Solana; Bitcoin) with QR codes and one-click copy, plus free ways to help (rate, share, report a bug, request a feature). Reach it from the library sidebar, the popup footer and Settings → About. Donating unlocks nothing; FrameShot stays free for everyone. The QR codes are bundled images, each verified to decode to the exact address; nothing is sent anywhere.
- **Export recordings as animated GIFs.** Pick the part to keep with a two-handle trim slider (with a live preview), choose the width (320–800 px), the frame rate (10, 15 or 20 fps) and whether it loops. GIFs are made on your device in a background worker, with one steady colour palette, unchanged pixels stored once and identical frames merged, so screen recordings make small, clean GIFs. Available from the player (button or **G**) and from a recording's menu in the library.
- **Sound effects**: a camera shutter when a screenshot is saved (also for captures started from the toolbar, menu or keyboard), a countdown tick, start/stop and pause/resume chimes for recordings, a chime when a download or copy is ready, and a soft tone when something fails. Sounds are synthesized (no audio files). Recording chimes finish *before* recording starts or resumes, so they are not recorded. Turn them off or set the volume in **Settings → Sounds**, or with the speaker button in the popup.
- **Keyboard shortcuts sheet**: press **?** anywhere in the Studio (or the keyboard button in the library).
- Library: **Ctrl/⌘ + A** selects everything shown, **Delete** deletes the selection, **Esc** clears it; hovering a recording plays a silent preview.
- Player: keyboard shortcuts (Space, ←/→, , and . for single frames, F, M, S, G) and playback speed (0.5×–2×).

### Changed
- **Store listing revised after review**: the Chrome Web Store flagged a list of file formats in the description as excessive keywords. The summary (manifest description) and the full description are rewritten as plain sentences without format or keyword lists, the screenshots drop their format lists, and the store-kit check now rejects such lists.
- **Rating FrameShot is easier**: the review card shows five large gold stars that you can click to rate (they open the Chrome Web Store reviews page), it appears a little sooner (after 3 captures or recordings and 2 days, at most 3 times, 3 weeks apart), and a "★★★★★ Rate FrameShot" link is always in the library sidebar. Everyone sees the same choices; nothing is offered in return for a rating.
- **A livelier, faster interface.** Cards light up where your pointer is (a soft glow and a lit edge), the active item in the sidebar and in Settings glides from place to place, counts roll when they change, primary buttons ripple when pressed, the popup's "Full page" button has a slow moving light and a scan effect, a saved capture flashes and pulses, empty screens breathe, the recording countdown drains a ring each second, the microphone meter is a live equalizer, and notifications pop their icon in. Screenshot thumbnails show the top-left of the page (where content starts) instead of the middle. All effects respect "reduce motion".
- **Measured speed-ups** (240-item library, same machine, headless Chromium; `npm run perf:ui`): scrolling went from about 20 to 60 frames per second (median frame 50 → 16.7 ms), the main thread is busy 88% less while idle (about 265 → 33 ms per 5 s), and clicks and key presses paint about 43% sooner on average (about 190 → 108 ms). How: the app chrome no longer re-blurs the moving background on every frame (a tinted, sheened surface looks the same), the film grain no longer uses a blend mode, the loading shimmer runs on the compositor and only on visible cards, cards are memoized with stable callbacks so selecting one doesn't re-render the rest, card menus are created when first used, and the background pauses while a dialog is open. Off-screen library cards skip rendering until scrolled near.
- New permission: **`offscreen`**, used only to play sound effects for captures run in the background (the service worker cannot play audio). Chrome shows no warning for it.

### Fixed
- **Sound in screen recordings**: the shared tab's or computer's sound is now recorded as it plays. Chrome could apply voice-call processing (echo cancellation, noise suppression, automatic gain) to it, which treats music and system sound as echo or noise and can remove it; FrameShot now switches that off where Chrome allows. Before recording, a hint under the sound switch says exactly what to tick in Chrome's share dialog for your system ("Also share tab audio", or "Also share system audio" for the entire screen on Windows, ChromeOS, and macOS 14.2+ with Chrome 141+), and warns that Chrome never shares a single window's sound. While recording, a live sound meter shows the sound coming in, and if Chrome shared none, a banner explains why and offers to discard and try again. A new test records a tab playing a tone and checks the sound is in the saved video.
- Recorder (found in an internal review):
  - Deleting an "unfinished recording" in one tab could delete the video of the same recording that another tab had just recovered; leftover sessions of saved recordings now keep their video, and recordings still being written are never offered for recovery.
  - If something failed after Chrome's share picker (for example "Stop sharing" while the microphone prompt was open), the recorder could stay stuck on "Choose what to share" with the microphone and camera on; it now always releases them and explains what happened.
  - A recording that could not be saved was invisible if you stopped it from another Studio screen, and closing the tab dropped the only copy; FrameShot now takes you to the recorder with a Download button, and asks before closing.
  - Discard confirmed after the recording had already ended (and been saved) was ignored; it now deletes the saved copy.
  - "Clear all local data" during a recording could leave a corrupt video; it is now refused until the recording stops, and recordings are never saved into removed storage.
  - Another Studio tab could clear the toolbar's REC badge and the popup's controls while a recording continued.
  - An interrupted recording was not offered for recovery if the recorder was reopened within 15 seconds.
  - A failed write of the WebM length marker failed the whole save.
  - An unplugged camera froze the camera bubble on its last frame.
  - The last moment after pressing Stop could be recorded while the poster frame was taken.
- GIF dialog: the real video length arriving after opening no longer resets a trim you already made.
- Pressing Stop in the popup could, rarely and under heavy load, fail to reach the recorder (the message was sent on a channel closed 50 ms later). Commands now use one long-lived channel, and Stop is sent again if the recorder hasn't reacted a moment later.
- Interface (found in an internal review):
  - Switching screens could briefly show the animated background over the page; now only the page animates.
  - Library: scrolling a large library loaded every page at once (each "load more" triggered the next); it now loads 60 items per scroll, and thumbnails start loading shortly before they come into view.
  - Library: finding duplicates took several seconds in large libraries; it now takes well under a second for 4,000 screenshots and is cached.
  - Library: the header, the selection bar and the list view overflowed in narrow windows (about 900 px); they now wrap and stay usable.
  - Library: a selection could keep items that were no longer shown, so bulk actions acted on more than you saw; the selection now always matches what is shown. Bulk PDF export now respects "compact PDF".
  - Library: the "drop to import" overlay could stay on screen after a drag left the window.
  - Editor: after using a panel slider or field, arrow keys and shortcuts went to that control instead of the selected shape; clicking the canvas now returns the keyboard to it. Shortcuts no longer fire inside open menus and dialogs, Space no longer clicks a focused button, and pan mode can't get stuck after switching windows.
  - Editor: locked-ratio crops now keep their ratio at the image edges and at the smallest size, and the ratio resets when you leave the crop tool.
  - Editor: picking a custom colour added an undo step for every movement of the picker; it now previews live and adds one step. "Reset all edits" is disabled only when there is truly nothing to reset.
  - Editor: editing a screenshot that was deleted in another tab failed silently; the editor now says so and stops saving.
  - Editor: the library thumbnail could keep showing the unedited screenshot (for example without a redaction) if the tab was closed right after an edit; it now updates within about a second.
  - Composer: width and height could not be typed (each keystroke was applied and clamped); they now apply on Enter or when you leave the field, and Esc cancels.
  - Settings: sliders saved on every movement; they now save once when released.
  - Popup: shortcut hints showed the default keys even when you had changed or removed them in Chrome; they now show your actual shortcuts.
  - Notifications pause while you point at or focus them, and those with a button stay longer (7 s).
  - Light/Dark-style segmented controls work with the arrow keys.
  - A failure in one screen, or a broken address, no longer leaves the Studio blank; FrameShot shows a message with a way back.

## Development history (internal builds, never published)

Before the first public release, FrameShot went through internal builds numbered 1.0.0–1.3.0. The last of them became public version 1.0.0 above.

### Internal build 1.2.0 — 2026-11-08

#### Added
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

#### Changed
- **Store title and summary rewritten around the recorder for Chrome Web Store search:** "FrameShot: Free Screen Recorder & Full Page Screenshot".
- Library "All screenshots" is now **All captures**.
- Toolbar tooltip: "FrameShot — screenshot or record your screen".

#### Fixed
- Opening the library or the recorder now brings an already-open FrameShot tab forward instead of always opening a new one. (Chrome hides tab addresses from extensions without the `tabs` permission, so the old check never matched; open pages now announce themselves on a local channel.)
- Architecture notes named the storage database and settings key incorrectly after the rename (they keep their original `frameora` names).

### Internal build 1.1.0 — 2026-11-08

#### Changed
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

#### Added
- Footer credit: "A Product of Unique Labs. Developed by Shahriar Ahmed", linking to www.shahriarahmed.net (opens in a new tab only when clicked).

#### Fixed
- The popup could stay stuck on "Select what to capture…" if the tab was closed or reloaded while an area/element selection was showing; Cancel now always ends a pending selection, and closing or navigating the tab resets it automatically.
- Two-column layouts that Tailwind v4 ignored (Settings, Library details, editor info) because of a comma in the arbitrary grid value.

### Internal build 1.0.1 — 2026-11-08

#### Fixed
- **Full-page captures failing with "about 1 px missing"** on displays with fractional scaling (125%, 150%, 175% in Windows display settings) or non-100% page zoom, regardless of the scroll delay. Chrome reports the viewport and page height as rounded integers (for example 717 px for a 717.333 px viewport), so Frameora underestimated each frame by a fraction of a pixel and could never reach the page's last device-pixel row. Frameora now:
  - measures the true fractional viewport (`visualViewport`) and fractional scrolling-panel boxes,
  - uses the exact device pixel ratio when it matches the captured frames,
  - scrolls to the browser's real end position on the last step,
  - aims retry frames so gaps land inside the viewport, and
  - fills rounding slivers of at most one CSS pixel by repeating the adjacent row. Real missing content still fails the capture, as before.

#### Tests
- New realistic rounding simulation (2,000 scenarios across 10 device scales) and real-browser captures at 125%, 150%, and 175% device scale on pages with fractional heights.

### Internal build 1.0.0 — 2026-11-07

First release candidate. Not yet published to the Chrome Web Store.

#### Added
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
