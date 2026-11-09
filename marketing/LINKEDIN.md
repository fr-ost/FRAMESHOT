# LinkedIn kit: FrameShot

Everything for adding FrameShot to your LinkedIn profile as a project, plus a profile banner and an optional launch post.

## Add the project

Profile → **Add profile section** → **Recommended** → **Add projects** (or the **+** in an existing Projects section).

| Field | What to enter |
|---|---|
| Project name | `FrameShot: Free Screen Recorder & Full-Page Screenshot Extension for Chrome` |
| Description | The text below (1,747 of 2,000 characters) |
| Skills (up to 5) | TypeScript · React.js · Chrome extensions (pick "Google Chrome Extensions", "Chrome Extension Development" or "Browser Extensions", whichever LinkedIn suggests) · Product Design · User Interface Design |
| Media | See the list below |
| I am currently working on this project | Tick it (FrameShot is still being developed) |
| Start date | November 2026 |
| End date | Leave empty |
| Contributors | Leave empty, or add teammates if others worked on it |
| Associated with | Your **Unique Labs** position, if it's in your Experience section |

Other skills that fit if you'd rather swap one: JavaScript, Web Development, Tailwind CSS, Playwright, Product Development, Privacy by Design.

### Description

```
FrameShot is a free Chrome extension that records your screen with sound and your webcam, and captures entire web pages in one click. You can then annotate, blur and share. There's no watermark, no account, and nothing is ever uploaded.

What it does
• Full-page screenshots: scrolls, captures and stitches a page into one sharp image, with sticky headers shown once and lazy images loaded first
• Area, element, visible-area and scrolling-panel capture, each with a keyboard shortcut
• Editor: arrows, shapes, text, highlights, numbered steps, crop, blur, pixelate and solid redaction that is flattened into every export
• Screen recorder: a tab, a window or the whole screen, with microphone and tab or system sound, a movable webcam bubble, pause and resume, 720p to 4K at up to 60 fps, and crash recovery
• GIF export, a composer for backgrounds and browser frames, a searchable library, and export to images, PDF or ZIP

How it's built
• Chrome Manifest V3 extension in TypeScript with React 19, Tailwind CSS 4 and WXT
• A capture engine that plans and stitches frames at any display scale, handling sticky and fixed headers, lazy loading, infinite scroll and inner scrolling panels
• Recording with MediaRecorder and the Web Audio API, camera compositing on canvas, and recordings saved in chunks to IndexedDB so a crash doesn't lose them
• A GIF encoder in a Web Worker that shares one palette and skips unchanged pixels to keep files small
• Private by design: no servers or analytics, a content security policy that blocks network access, and page access only through activeTab
• 146 unit tests (Vitest) and 89 end-to-end browser tests (Playwright), including pixel-by-pixel checks of full-page captures

Website: frameshot.uniquelabs.org
```

### Media

In the project form, **Add media**. Each item takes a title and a short description.

| Order | Add | Title | Description |
|---|---|---|---|
| 1 | Link: `https://frameshot.uniquelabs.org` (LinkedIn pulls the site's own preview image) | FrameShot website | Features, guides and the privacy policy |
| 2 | Image: `marketing/linkedin/frameshot-linkedin-1200x627.jpg` | FrameShot overview | Free screen recorder and full-page screenshots for Chrome |
| 3 | Image: `store-assets/screenshots/02-screen-recorder.png` | Screen recorder | Record a tab, a window or your screen with sound and a webcam bubble |
| 4 | Image: `store-assets/screenshots/03-full-page-editor.png` | Full-page capture and editor | Capture a whole page, then annotate it |
| 5 | Image: `store-assets/screenshots/04-blur-gif-export.png` | Blur, redact and GIF export | Hide private details and turn recordings into GIFs |
| 6 | Image: `store-assets/screenshots/05-free-private.png` | Free and private | No account, no uploads, no watermark |
| 7 | Link: the YouTube video, once published | FrameShot in 2 minutes | A walkthrough of every feature |

The first image is used as the project's thumbnail, so keep the overview image first after the link. LinkedIn's profile media takes links, images and documents rather than video files, so the video goes in as a link.

## Profile banner

`marketing/linkedin/frameshot-linkedin-cover-1584x396.jpg` is sized for LinkedIn's profile background (1584 × 396). The left third has no text, because your profile photo covers the bottom left on desktop and in the app.

Profile → the pencil on your background image → **Change photo** → upload.

## Featured section (optional)

Add the website link and, once you post it, the launch post below to **Featured**, so they show at the top of your profile.

## Launch post (optional)

Post the video natively (upload `marketing/frameshot-showcase.mp4` in a new post) rather than as a YouTube link: LinkedIn plays native video in the feed. In the post's video settings, add `marketing/frameshot-showcase.srt` as captions, since many people watch without sound.

```
I built FrameShot: a free Chrome extension that records your screen with sound and your webcam, and captures entire web pages in one click. 🎬📸

I wanted one tool that does both, without the usual catches. So FrameShot has no watermark, no account, and it never uploads anything. Your screenshots and recordings stay on your computer.

What it does:
✅ Full-page screenshots that handle sticky headers and lazy-loaded images
✅ Screen recording of a tab, a window or the whole screen, with mic, system sound and a webcam bubble
✅ An editor for arrows, text, numbered steps, blur and solid redaction
✅ GIF export, backgrounds and frames, and a searchable library

Under the hood: TypeScript, React and Chrome's Manifest V3, with a stitching engine for pixel-accurate full-page captures, the Web Audio API for mixing sound, and more than 230 automated tests.

Free forever. Try it: [Chrome Web Store link]
More at frameshot.uniquelabs.org

What would you add next? 👇

#ChromeExtension #ScreenRecorder #ProductLaunch #TypeScript #BuildInPublic
```

Post it once the Chrome Web Store listing is live and replace `[Chrome Web Store link]`. Until then, the website's "Add to Chrome" buttons lead to a coming-soon page; if you post earlier, change that line to `Coming soon to the Chrome Web Store. See it at frameshot.uniquelabs.org`.

## Regenerating the images

```bash
node scripts/marketing/linkedin-images.mjs
```

The script builds both images from the website's screenshots and warns if any text would run into the artwork.
