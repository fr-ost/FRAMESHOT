# Chrome Web Store Listing

Draft listing copy for *FrameShot*. **The paste-ready files are in [`store-kit/`](store-kit/README.md)** (rebuild and validate with `npm run store:kit`); this page explains the choices behind them. **Do not submit without explicit owner approval** (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)). Make no claims about user numbers, ratings, reviews, awards, or speed.

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

FrameShot is a free screen recorder and full page screenshot tool for Chrome. Record a tab, a window or your whole desktop with sound and a webcam bubble, or take a scrolling screenshot of an entire web page in one click. Then annotate, blur private details, turn clips into GIFs, and save as MP4, PNG, JPEG, WebP or PDF. It all happens in your browser: no sign-up, no uploads, no watermark.

★ FREE, WITH NOTHING LOCKED
• Unlimited screenshots and videos, limited only by your device's storage
• No watermark, no time limit, no subscription, no paid plan, no account
• Every feature is available to everyone

★ SCREEN RECORDER WITH AUDIO AND CAMERA
• Choose a browser tab, an app window or your entire screen in Chrome's own share dialog
• Include tab sound and your microphone together; mute the mic at any time
• Add a round camera bubble in any corner
• Countdown, pause and resume, live timer and toolbar badge
• Save as MP4 (H.264) that plays on every phone, Mac and PC, or as WebM; 720p to 4K, 15 to 60 fps
• Export any part of a video as an animated GIF, or save any frame as an image
• Saved as you go, so a crash or a closed tab loses only the last seconds

★ SCREEN CAPTURE, YOUR WAY
• Full page: scrolls and stitches the whole page; sticky headers and footers appear once, not on every screen
• Loads lazy images and infinite feeds first, with a height limit and a Stop & save button
• Visible area, with an optional 3, 5 or 10 second delay for menus and hover states
• Selected area: drag to select, scroll to extend it
• Single elements and scrolling panels (chats, tables, feeds)
• Huge pages are split into full-resolution parts or scaled, your choice
• Start from the toolbar, the right-click menu or keyboard shortcuts

★ SCREENSHOT EDITOR AND ANNOTATIONS
• Crop, resize, rotate and flip
• Arrows, lines, boxes, circles, pen, highlighter, text, numbered steps and symbols
• Move, resize, duplicate and layer anything, with full undo and redo
• Blur, pixelate or permanently redact sensitive information; redactions are flattened into the exported file
• Beautify: gradient backgrounds, padding, rounded corners, shadows and a browser mockup frame, with presets for social posts

★ SAVE, SHARE AND ORGANIZE
• Copy to the clipboard, or download as PNG, JPEG, WebP or multi-page PDF
• Bulk export as ZIP or one combined PDF, with your own file name pattern
• A private local library with search, website filter, favourites, collections, tags and duplicate finder

★ GREAT FOR
Bug reports, tutorials and how-to videos, design reviews, documentation, online lessons, and saving long articles or receipts for later.

★ PRIVATE BY DESIGN
• No servers, no accounts, no analytics, no tracking, no ads
• Works offline; FrameShot's pages block every network connection
• It can only access a tab when you ask it to, and sees only what you pick in Chrome's share dialog
• Your microphone and camera are used only after you switch them on, and only for your video
• Light and dark themes, gentle sound effects (can be turned off) and keyboard shortcuts

Good to know: Chrome does not let extensions work on its own pages (chrome://) or the Chrome Web Store, and allows two snapshots per second, so long pages take a few seconds. Tab sound works on every system; whole-screen sound depends on your system (Windows and ChromeOS). Blur can sometimes be reversed on short text, so use Redact for confidential data.

FrameShot is free forever. If it saves you time, an optional tip on the in-app Support page keeps it going.

A product of Unique Labs. Developed by Shahriar Ahmed (www.shahriarahmed.net).
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

> FrameShot captures what is on the user's screen: screenshots of web pages (visible area, full page, selected area, single element or scrolling panel) and recordings of a tab, window or screen the user chooses in Chrome's share dialog. It lets the user annotate, redact, organize and export these captures locally in the browser. All features serve this one purpose; nothing is collected or uploaded.

## Review prompt (policy notes)

FrameShot asks for a rating in-product (popup after a successful capture, library, player; any time under Settings → About). It is designed to comply with the Chrome Web Store policy against manipulating ratings:

- No incentives of any kind for rating.
- It asks for an honest rating; the text never asks for a particular number of stars. The five stars in the card are a button that opens the store's review page, where the user picks their own rating.
- No review gating: every user gets the same choices ("Rate FrameShot", "Not now", "Don't ask again"); nobody is filtered away from the store based on their opinion.
- Shown only after real use (≥ 3 captures or recordings, ≥ 2 days), at most 3 times, 3 weeks apart, never during a capture or recording, and only for Web Store installs.

The link is `https://chromewebstore.google.com/detail/frameshot/<item id>/reviews` (`REVIEW_URL_SLUG` in `src/core/review.ts`). After publishing, click it once to confirm it opens the listing's Reviews tab, and set the slug to the published listing's slug.

## Data usage disclosure

FrameShot collects **no user data**. See [PRIVACY_DISCLOSURE.md](PRIVACY_DISCLOSURE.md) for the form answers and [PRIVACY.md](PRIVACY.md) for the policy.
