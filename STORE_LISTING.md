# Chrome Web Store Listing

Draft listing copy for *FrameShot*. **The paste-ready files are in [`store-kit/`](store-kit/README.md)** (rebuild and validate with `npm run store:kit`); this page explains the choices behind them. **Do not submit without explicit owner approval** (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)). Make no claims about user numbers, ratings, reviews, awards, or speed.

> **Name risk.** "FrameShot" is already used by other Chrome Web Store screenshot extensions and by a US trademark filing (see [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md), addendum). Resolve this before submitting.

## Name

**FrameShot: Free Screen Recorder & Full Page Screenshot**

(54 characters; the Web Store limit is 75.) Matches the manifest `name`. Built from the owner's proposal "FrameShot: Free Screen Recorder & Full Page Capture", with "Capture" swapped for "Screenshot", the most-searched word in this category; "capture" moves into the summary.

## Short description (summary, ≤ 132 characters)

> Record your screen with sound and camera, or capture a whole web page in one click. Then annotate, blur and share. No watermark.

(128 characters.) Matches the manifest `description`. No list of file formats: the store's review flagged format lists as excessive keywords.

## SEO

The Chrome Web Store ranks mainly on the **name** and **summary**, then the full description. **Store review, first submission:** rejected for excessive keywords (violation Yellow Argon), quoting the list of file formats "MP4, WebM, PNG, JPEG, WebP or PDF". The revised description (~12,700 characters) answers the same searches in plain sentences, with how-to guides and an FAQ, and contains no lists of formats, specs or keywords; the summary no longer lists formats either. `npm run store:kit` checks this. The copy targets the phrases people search for and that leading screenshot extensions rank on, without keyword stuffing (the store reviews listings that repeat a keyword more than about five times, and its spam policy forbids irrelevant keywords or naming competitors).

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
FrameShot is a screen recorder and screenshot tool that works entirely inside your browser. Record a tab, a window or your whole screen with sound and an optional camera bubble. Save an entire web page as one tall image with a single click. Then add notes, hide private details, and copy or download the result in seconds.

It costs nothing and never adds a watermark. There is no account to create and no trial that runs out. Everything you make stays on your own computer: FrameShot never uploads your screenshots or videos.

━━━━━━━━━━━━━━━━━━━━
WHAT YOU CAN DO WITH FRAMESHOT
━━━━━━━━━━━━━━━━━━━━
Most people install several separate tools to grab their screen, mark it up and keep track of what they saved. FrameShot puts all of that in one place. It records videos of your screen for tutorials, demos and bug reports. It takes full page screenshots of long web pages that normally need a lot of scrolling. It has an editor for arrows, text and redaction, and it keeps everything in a private library so you can find it again later.

━━━━━━━━━━━━━━━━━━━━
RECORD YOUR SCREEN
━━━━━━━━━━━━━━━━━━━━
• Pick what to record in the browser's own sharing dialog: a single tab, one app window or your entire screen. You stay in control of exactly what is shared, and the browser shows a clear sharing bar while it is on.
• Talk over your video with your microphone, and mute or unmute it at any moment. You can choose which microphone to use, and a live level meter shows that your voice is coming through.
• Add a round camera bubble so viewers can see you as you explain. Place it in any corner, make it small, medium or large, and move it while you record.
• Start after a short countdown, pause when you need a moment, and resume when you are ready. Paused time is left out of the finished video.
• A live timer, a sound meter and a red REC badge on the toolbar icon show that recording is running. Stop from the recorder page, from the popup, from the sharing bar or with a keyboard shortcut.
• Choose the picture quality and smoothness that suit you, from standard HD up to 4K. Videos play on phones, Macs and Windows PCs without extra software.
• Long videos are welcome, because there is no time limit. Your video is written to your device in small pieces while you record, so a crash or an accidentally closed tab loses only the last few seconds. The next time you open the recorder, it offers to recover the unfinished video.

━━━━━━━━━━━━━━━━━━━━
SOUND IN YOUR VIDEOS
━━━━━━━━━━━━━━━━━━━━
A tab shares everything it plays, such as a video, a call or a presentation, as long as "Also share tab audio" stays switched on in the sharing dialog. Recording your entire screen can include the sound of your whole computer when you tick "Also share system audio". That option is available on Windows and ChromeOS, and on macOS 14.2 or later with an up-to-date browser. A single app window is always shared without sound, so choose a tab or the whole screen when sound matters.

FrameShot switches off the call-style processing that can make music and system sound quiet or distorted, wherever the browser allows it. Before you start, a short hint under the sound switch tells you exactly what to tick for your computer. While you record, a meter shows the sound coming in. If no sound arrives, a clear message explains why and lets you discard the attempt and try again.

━━━━━━━━━━━━━━━━━━━━
WATCH, TRIM AND SHARE
━━━━━━━━━━━━━━━━━━━━
• Every video opens in a built-in player with playback speed controls, frame-by-frame stepping and full-screen viewing.
• Save any single frame as an image, then annotate it like any other screenshot.
• Turn a few seconds of a recording into an animated GIF. Pick the start and end with a live preview, then choose the width, smoothness and whether it loops. It is made on your device and kept small, which makes it handy for documentation, chat replies and support answers.

━━━━━━━━━━━━━━━━━━━━
FULL PAGE SCREENSHOTS
━━━━━━━━━━━━━━━━━━━━
Long pages are hard to save with a normal screen grab. FrameShot scrolls the page for you and joins every part into one seamless image.
• Sticky headers, floating bars and fixed footers appear once in their natural place, instead of repeating on every screen.
• Pictures that only load as you scroll are loaded first, so nothing is left blank or grey.
• Pages with their own inner scrolling area, such as web apps and dashboards, are handled too.
• Endless feeds can be stopped at any point with Stop & save, and a height limit keeps runaway pages under control.
• Extremely tall pages are split into full-resolution parts or scaled to fit, whichever you prefer, and FrameShot always tells you which it did.
• Results stay sharp on high-resolution displays and at any zoom level.

━━━━━━━━━━━━━━━━━━━━
MORE WAYS TO CAPTURE
━━━━━━━━━━━━━━━━━━━━
• Visible area saves exactly what you can see right now. An optional delay of a few seconds gives you time to open a menu or hover over a button first.
• Selected area lets you drag a rectangle around the part you want. Keep dragging past the edge of the window and the page scrolls to extend your selection.
• Element mode highlights parts of the page as you move the mouse. Click a chart, a table, a card or a post to save just that piece.
• Scrolling panel saves the complete contents of an inner scroller, like a chat thread or a long sidebar.
• You can also drop in or paste an existing picture to edit it with the same tools.

━━━━━━━━━━━━━━━━━━━━
EDIT AND ANNOTATE
━━━━━━━━━━━━━━━━━━━━
• Point things out with arrows, lines and boxes, or circle them and draw freely with a pen.
• Explain with text labels that stay readable on any background, add a highlighter, and number the steps of a process.
• Crop away what you do not need, resize for a smaller file, and rotate or flip the picture.
• Every shape can be moved, resized, copied, restyled and layered. Undo and redo cover every change.
• Your original is never altered, so you can reset your edits at any time.

━━━━━━━━━━━━━━━━━━━━
HIDE SENSITIVE INFORMATION
━━━━━━━━━━━━━━━━━━━━
Before you share a screenshot, cover the details that should stay private, such as email addresses, account numbers or personal messages. Use a soft blur or a pixel effect for a light touch. For anything confidential, use a solid redaction box: it permanently replaces those pixels in the saved file, so nobody can recover what was underneath.

━━━━━━━━━━━━━━━━━━━━
MAKE IT READY TO SHARE
━━━━━━━━━━━━━━━━━━━━
Place an image on a coloured or gradient background with padding, rounded corners and a soft shadow. Wrap it in a light or dark browser frame for a polished look. Ready-made sizes fit presentations, social media posts and stories, so your images look right wherever you publish them.

━━━━━━━━━━━━━━━━━━━━
SAVE, COPY AND EXPORT
━━━━━━━━━━━━━━━━━━━━
• Copy an image to your clipboard and paste it straight into a chat, an email or a document.
• Download images as picture files in the quality you choose, or as a PDF document in standard paper sizes. Recordings download as video files.
• Select several items and export them together as one archive or one combined document.
• Name files automatically from the website, the page title and the date, and keep them in their own folder inside Downloads. You can also choose where to save each time.

━━━━━━━━━━━━━━━━━━━━
YOUR PRIVATE LIBRARY
━━━━━━━━━━━━━━━━━━━━
Every screenshot and video is kept in a library on your computer. Search by name, website or tag, filter by site and sort by date or size. Mark favourites and group related items into collections. FrameShot can also spot duplicates and compare two images side by side, as an overlay or as a difference view.

━━━━━━━━━━━━━━━━━━━━
COMFORTABLE TO USE
━━━━━━━━━━━━━━━━━━━━
Start from the toolbar button, the right-click menu or keyboard shortcuts. Choose a light theme, a dark theme or follow your system. Gentle sounds confirm a saved image and mark the start and end of a recording, and you can turn them down or off.

━━━━━━━━━━━━━━━━━━━━
HOW TO USE FRAMESHOT
━━━━━━━━━━━━━━━━━━━━
Getting started
1. After installing, click the puzzle icon in the toolbar and pin FrameShot so its button is always visible.
2. Open any web page and click the FrameShot button to see every option.

Take a full page screenshot
1. Open the page you want to save.
2. Click the FrameShot button and choose Full page, or press Alt+Shift+F.
3. Wait a few seconds while the page scrolls. The result opens in the editor, ready to mark up, copy or download.

Capture part of a page
1. Click the FrameShot button and choose Area or Element (or press Alt+Shift+A or Alt+Shift+E).
2. Drag around the part you want, or click the element you want to keep.
3. Press Esc at any time to cancel.

Record your screen with sound
1. Click the FrameShot button and choose Record screen.
2. Switch on tab and system sound, the microphone and the camera bubble if you want them.
3. Press Start recording and pick a tab, a window or your screen in the sharing dialog. For a tab, keep "Also share tab audio" on.
4. Press Stop & save when you are finished. Your video opens in the player and is kept in your library.

Hide private details
1. Open an image in the editor.
2. Choose Blur, or Redact (solid) for anything confidential, from the toolbar on the left.
3. Drag over the area to hide, then copy or download the finished picture.

Make an animated GIF
1. Open a recording in the player and press Export GIF.
2. Drag the two handles to the part you want and choose the size.
3. Press Create GIF and it is saved to your Downloads folder.

Change the keyboard shortcuts
Visit the shortcuts page of your browser's extension settings (chrome://extensions/shortcuts). There you can change the capture shortcuts and set one to start and stop recording.

━━━━━━━━━━━━━━━━━━━━
FREQUENTLY ASKED QUESTIONS
━━━━━━━━━━━━━━━━━━━━
Is FrameShot really free?
Yes. Every feature is available to everyone, with no subscription, no trial and no locked extras. If you find it useful, you can leave an optional tip on the in-app Support page, but it unlocks nothing.

Does it put a watermark on my videos or images?
Never. Everything you make is yours, exactly as it looks.

Do I need to create an account or sign in?
No. Install it and start using it straight away.

Are my files uploaded anywhere?
No. Your videos and images are stored only on your computer, and they leave it only when you download, copy or share them yourself. The only thing FrameShot sends is an anonymous install count when it is installed, updated or removed. It contains a random ID and basic facts such as the version, and you can turn it off in Settings.

Why is there no sound in my recording?
Check what you shared. A tab includes its sound when "Also share tab audio" is on. Your whole screen includes computer sound when you tick "Also share system audio", where your system offers it. A single app window never includes sound. The recorder shows a hint before you start and a message if no sound is coming in.

Is there a time limit on videos?
No. The only limit is the free space on your computer.

Where are my files saved?
Everything is kept in FrameShot's library on your computer. When you download something, it also goes to your Downloads folder, or to the folder you chose in Settings.

Can I capture pages that need me to sign in?
Yes. FrameShot saves what your browser shows, including pages you are signed in to, and none of it is sent anywhere.

Why can't I capture some pages?
For your security, the browser does not let any extension work on its own settings pages or on the Web Store. Everything else, including local files you allow, can be captured.

Does it work without an internet connection?
Yes. Capturing, recording, editing and exporting all work offline.

What does FrameShot need permission for?
It accesses a page only when you start a capture on it. It saves your settings and library on your device, saves downloads when you ask, adds its right-click menu, and plays its short sounds. It never reads your browsing history.

How do I delete everything?
Delete items from the library one by one or in bulk, or use "Clear all local data" in Settings to remove everything at once.

━━━━━━━━━━━━━━━━━━━━
TIPS
━━━━━━━━━━━━━━━━━━━━
• Long pages take a few seconds to save because the browser limits how often an extension can take a picture of the screen. Keep the tab open until FrameShot finishes.
• Blur can sometimes be reversed on short text, so use the solid redaction box for passwords and account numbers.
• For the clearest voice-overs, use a headset microphone and record a tab rather than the whole screen.

━━━━━━━━━━━━━━━━━━━━
FrameShot is made by Unique Labs and developed by Shahriar Ahmed (www.shahriarahmed.net). If it helps you, a short review on this page is very much appreciated, and it helps other people find a tool that respects their privacy.
```

## Screenshots (1280×800)

Marketing images in the style of Unique Labs' GrowX and UnfollowX listings: a numbered kicker, a two-line headline, the real UI in a window frame, and callout chips. Upload in this order from [`store-assets/screenshots/`](store-assets/screenshots/):

1. `01-overview.png` — Record your screen. Capture full pages.
2. `02-screen-recorder.png` — Record your screen with sound & camera.
3. `03-full-page-editor.png` — Capture whole pages. Annotate in seconds.
4. `04-blur-gif-export.png` — Hide private details. Share it anywhere.
5. `05-free-private.png` — Free. Unlimited. Private.

Regenerate with `npm run store:assets` (captures the real UI, then lays it out).

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

> FrameShot captures what is on the user's screen: screenshots of web pages (visible area, full page, selected area, single element or scrolling panel) and recordings of a tab, window or screen the user chooses in Chrome's share dialog. It lets the user annotate, redact, organize and export these captures locally in the browser. All features serve this one purpose; captures are never uploaded.

## Review prompt (policy notes)

FrameShot asks for a rating in-product (popup after a successful capture, library, player; any time under Settings → About). It is designed to comply with the Chrome Web Store policy against manipulating ratings:

- No incentives of any kind for rating.
- It asks for an honest rating; the text never asks for a particular number of stars. The five stars in the card are a button that opens the store's review page, where the user picks their own rating.
- No review gating: every user gets the same choices ("Rate FrameShot", "Not now", "Don't ask again"); nobody is filtered away from the store based on their opinion.
- Shown only after real use (≥ 3 captures or recordings, ≥ 2 days), at most 3 times, 3 weeks apart, never during a capture or recording, and only for Web Store installs.

The link is `https://chromewebstore.google.com/detail/frameshot/<item id>/reviews` (`REVIEW_URL_SLUG` in `src/core/review.ts`). After publishing, click it once to confirm it opens the listing's Reviews tab, and set the slug to the published listing's slug.

## Data usage disclosure

FrameShot (from 1.0.1) sends anonymous install counts: a random install ID, version, OS family and browser language on install and update, plus Chrome's uninstall page; the server keeps the request's country code. Users can turn this off. Captures and page data are never sent. See [PRIVACY_DISCLOSURE.md](PRIVACY_DISCLOSURE.md) for the form answers and [PRIVACY.md](PRIVACY.md) for the policy.
