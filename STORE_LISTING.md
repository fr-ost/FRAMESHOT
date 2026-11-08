# Chrome Web Store Listing

Draft listing copy for *FrameShot*. **Do not submit without explicit owner approval** (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)). Make no claims about user numbers, ratings, reviews, awards, or speed.

> **Name risk.** "FrameShot" is already used by other Chrome Web Store screenshot extensions and by a US trademark filing (see [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md), addendum). Resolve this before submitting.

## Name

**FrameShot: Free Screen Recorder & Full Page Screenshot**

(54 characters; the Web Store limit is 75.) Matches the manifest `name`. Built from the owner's proposal "FrameShot: Free Screen Recorder & Full Page Capture", with "Capture" swapped for "Screenshot", the most-searched word in this category; "capture" moves into the summary.

## Short description (summary, ≤ 132 characters)

> Screen recorder & full page screen capture. Record tab, window or desktop with mic & camera. Annotate, blur, export MP4, PNG, PDF.

(130 characters.) Matches the manifest `description`.

## SEO

The Chrome Web Store ranks mainly on the **name** and **summary**, then the full description. The copy targets the phrases people search for and that leading screenshot extensions rank on, without keyword stuffing (the store reviews listings that repeat a keyword more than about five times, and its spam policy forbids irrelevant keywords or naming competitors).

| Where | Target phrases |
|---|---|
| Name | screen recorder · full page screenshot · screenshot · free |
| Summary | screen recorder · full page screen capture · record tab / window / desktop · mic · camera · annotate · blur · MP4 / PNG / PDF |
| Full description (each ≤ 5×, written naturally) | screen recorder · record your screen · screen recording with audio · webcam / camera bubble · MP4 · full page screenshot · scrolling screenshot · capture an entire web page · screen capture · screenshot tool · visible area · selected area · element / scrolling panel capture · screenshot editor · annotate · blur and redact sensitive information · save as PDF / PNG / JPEG / WebP · browser mockup · free, no watermark, no sign-up, no time limit · works offline, no uploads |

"Screen recorder" became a target only once the recorder shipped and passed its tests. Deliberately avoided: competitor names, and the exact phrases competitors use as titles (e.g. "Annotate & Blur", "Full Page Screen Capture").

## Category

Suggested: **Tools** (alternative: Productivity). Both are where users browse for screenshot extensions.

## Full description

```
Capture the web. Edit every detail. Free forever.

FrameShot is a free screen recorder and full page screenshot tool for Chrome, by Unique Labs. Record a tab, a window or your whole screen with sound and an optional camera bubble, or take a scrolling screenshot of an entire web page in one click. Then annotate, blur sensitive information, and save as MP4, PNG, JPEG, WebP or PDF. Everything happens locally in your browser: no sign-up, no uploads, no watermark.

FREE, WITH NOTHING LOCKED
• Unlimited screenshots and recordings (limited only by your device's storage and memory)
• No watermark, no time limit, no subscription, no paid tier, no account
• Every feature is available to everyone

SCREEN RECORDER
• Record a browser tab, an app window or your entire screen, chosen in Chrome's own share picker
• Record the tab's sound and your microphone together; mute the microphone at any time
• Add a camera bubble in the corner of your choice
• Countdown, pause and resume (paused time is left out), live timer and toolbar badge
• Save as MP4 (H.264) that plays on every phone, Mac and PC, or as WebM; 720p to 4K, 15 to 60 fps
• Play recordings in your library, download them, export any part as an animated GIF, or save any frame as a screenshot to annotate
• Recordings are saved as you record, so a crash or a closed tab loses only the last few seconds

SCREEN CAPTURE, YOUR WAY
• Full page: scrolls and stitches the entire web page; sticky headers and fixed footers appear once, not repeated
• Loads lazy images and infinite-scroll content first, with a height limit and a Stop & save button
• Visible area, with an optional 3, 5 or 10 second delay for menus and hover states
• Selected area: drag to select, scroll to extend the selection
• Single elements: hover and click any part of a page
• Scrolling panels: the full content of chat panels, tables and feeds
• Very large captures are split into full-resolution parts (or scaled, your choice), and you are always told which
• Start from the toolbar, the right-click menu, or keyboard shortcuts

SCREENSHOT EDITOR
• Crop, resize, rotate and flip
• Annotate with arrows, lines, rectangles, ellipses, pen, highlighter, text, numbered steps and symbols
• Move, resize, duplicate and layer objects, with full undo and redo
• Blur, pixelate or permanently redact sensitive information; redactions are flattened into the exported image

POLISHED VISUALS
• Gradient or solid backgrounds, padding, rounded corners and shadows
• Browser mockup frame (light or dark)
• Presets for 16:9, 1:1, 4:5, 9:16, 1200×630 social cards and 1920×1080

SAVE AND SHARE
• Save screenshots as PNG, JPEG, WebP or PDF (long pages continue across PDF pages), recordings as MP4 or WebM
• Copy screenshots to the clipboard
• Bulk export as ZIP or one combined PDF
• Custom file name templates

ORGANIZE
• One private, local library for screenshots and recordings, with search, website filter, favourites, collections and tags
• Duplicate detection and side-by-side comparison
• Import images by drag and drop or paste

PRIVATE BY DESIGN
• No servers, accounts, analytics, tracking or ads
• Works offline; FrameShot's pages block all network connections
• FrameShot can only access a tab when you ask it to, and records only what you pick in Chrome's share picker
• The microphone and camera are used only while you record, after you switch them on
• Light and dark themes, gentle sound effects (can be turned off) and keyboard shortcuts for everything

Good to know: Chrome blocks extensions from browser pages (chrome://) and the Chrome Web Store, and allows two screenshots per second, so long pages take a few seconds. Chrome records sound from tabs (and from the whole screen on Windows and ChromeOS). Blur and pixelation can sometimes be reversed for short text; use Redact for confidential information.

A Product of Unique Labs. Developed by Shahriar Ahmed (www.shahriarahmed.net).
```

## Screenshot captions (1280×800)

The images are in [`store-assets/screenshots/`](store-assets/screenshots/), generated from the real extension UI and a fictional demo page by `npm run store:assets` (see [store-assets/README.md](store-assets/README.md)). Upload 01–05 in this order; 06 is an alternative.

1. `01-screen-recorder.png` — **Free screen recorder with sound and camera.** Record a tab, window or your whole screen, with a camera bubble. No watermark, no time limit.
2. `02-full-page-editor.png` — **Full page screenshots you can annotate.** Capture an entire page in one click, then add arrows, boxes, text, highlights and numbered steps.
3. `03-gif-export.png` — **Turn any part of a recording into a GIF.** Trim it, pick the size and frame rate. Made on your device.
4. `04-blur-and-redact.png` — **Blur or redact sensitive information.** Redacted areas are replaced with solid colour in every export.
5. `05-library-dark.png` — **One private library for screenshots and recordings.** Search, favourites and collections, stored only on your device. Light and dark themes.
6. `06-composer.png` *(alternative)* — **Beautiful shareable images.** Add a gradient background, padding, rounded corners and a browser frame.

## Promotional images
- Small tile 440×280: [`store-assets/promo/small-440x280.png`](store-assets/promo/small-440x280.png).
- Marquee 1400×560: [`store-assets/promo/marquee-1400x560.png`](store-assets/promo/marquee-1400x560.png).
- Store icon: `public/icon/128.png`.

## Permission justifications

| Permission | Why FrameShot needs it |
|---|---|
| `activeTab` | Temporary access to the current tab **only when you start a capture** (toolbar, right-click menu, or shortcut). There is no permanent access to any site. |
| `scripting` | Runs FrameShot's bundled capture script in that tab to scroll and measure the page, show the selection overlay, and restore the page afterwards. |
| `storage` | Saves your settings on this device. |
| `unlimitedStorage` | Keeps your full-resolution screenshot and recording library from being evicted by the browser. Long screenshots and recordings can be large. |
| `downloads` | Saves exported images, videos, PDFs, and ZIP files to your Downloads folder and confirms they finished. |
| `contextMenus` | Adds FrameShot capture options to the right-click menu. |
| `offscreen` | Plays FrameShot's sound effects (camera shutter, countdown) for captures started from the toolbar, menu or keyboard: the background service worker cannot play audio, so it uses a hidden offscreen page with the "audio playback" reason. No content is read or shown. |

- **Screen recording, microphone, camera:** no manifest permission. Recording uses Chrome's share picker (`getDisplayMedia`); the microphone and camera use Chrome's permission prompt, only after the user switches them on.
- **Host permissions:** none.
- **Remote code:** none. All code ships inside the extension package.

## Single purpose statement

> FrameShot captures what is on your screen — screenshots of web pages and recordings of a tab, window or screen you choose — and lets you edit, organize, and export them locally.

## Review prompt (policy notes)

FrameShot asks for a rating in-product (popup after a successful capture, library, player; any time under Settings → About). It is designed to comply with the Chrome Web Store policy against manipulating ratings:

- No incentives of any kind for rating.
- It asks for an honest rating; it never asks for a particular number of stars (the five stars in the card are decoration and are not clickable ratings).
- No review gating: every user gets the same choices ("Rate FrameShot", "Not now", "Don't ask again"); nobody is filtered away from the store based on their opinion.
- Shown only after real use (≥ 5 captures or recordings, ≥ 3 days), at most 3 times, 30 days apart, never during a capture or recording, and only for Web Store installs.

The link is `https://chromewebstore.google.com/detail/frameshot/<item id>/reviews` (`REVIEW_URL_SLUG` in `src/core/review.ts`). After publishing, click it once to confirm it opens the listing's Reviews tab, and set the slug to the published listing's slug.

## Data usage disclosure

FrameShot collects **no user data**. See [PRIVACY_DISCLOSURE.md](PRIVACY_DISCLOSURE.md) for the form answers and [PRIVACY.md](PRIVACY.md) for the policy.
