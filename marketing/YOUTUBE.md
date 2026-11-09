# YouTube upload kit: FrameShot showcase

Everything needed to publish `marketing/frameshot-showcase.mp4` (or the higher-bitrate master from `.output/video/`). Replace the two links marked `[ ... ]` before publishing: the Chrome Web Store listing and the website.

## Title

Recommended (66 characters, brand first, then what people search for):

```
FrameShot: Free Screen Recorder & Full-Page Screenshots for Chrome
```

Alternatives:
- `Free Chrome Screen Recorder with Webcam + Full-Page Screenshots` (63)
- `Record Your Screen & Capture Whole Web Pages, Free (No Watermark)` (65)

## Description

The first two lines show in search results and above "...more", so they carry the main message and the install link.

```
FrameShot is a free Chrome extension that records your screen with sound and your webcam, and captures entire web pages in one click. Annotate, blur and share. No watermark, no sign-up, nothing uploaded.

▶ Add FrameShot to Chrome (free): [Chrome Web Store link]
🌐 Website and guides: [website link]

What you'll see in this video:
• Full-page screenshots: FrameShot scrolls, captures every part and stitches it into one sharp image. Sticky headers show once, lazy images load first, and your page is put back as it was.
• Capture just what you need: the visible area (with an optional 3, 5 or 10 second delay), a selected area, a single element or a scrolling panel, each with its own shortcut.
• Annotate in seconds: arrows, boxes, text, a highlighter and numbered steps. Every mark stays editable.
• Hide private details: blur, pixelate, or cover them with a solid box that is flattened into the exported file.
• Screen recorder: record a tab, a window or your whole screen with your microphone and the tab's sound (system sound on Windows, ChromeOS and recent macOS), plus a webcam bubble you can move while you record. From 720p up to 4K, at up to 60 fps. Pause any time; recordings are saved as you go, so a crash won't lose your take.
• GIF export: turn any moment of a recording into a GIF, made on your computer.
• Composer: backgrounds, padding, rounded corners, shadows and a browser frame for posts and slides.
• Library: search by title, site or tag, collections, favourites and a duplicate finder.
• Export images or PDFs, copy to the clipboard, or download a ZIP. Recordings save as MP4 or WebM.

Private by design: FrameShot has no account, no servers and no tracking. Your screenshots and recordings stay on your computer until you download or copy them, and it works offline.

Chapters
0:00 Meet FrameShot
0:10 Full-page screenshots in one click
0:24 Capture an area, an element or the visible part
0:34 Annotate, blur and redact
0:56 Screen recorder with sound and webcam
1:20 GIFs, backgrounds and your library
1:44 Private by design, free forever

FrameShot is made by Unique Labs and developed by Shahriar Ahmed: https://www.shahriarahmed.net
Questions or ideas: https://t.me/igfrostt

Narration: AI voice. Music: original, made for this video.

#FrameShot #ScreenRecorder #ChromeExtension
```

Notes:
- The chapters follow YouTube's rules: they start at 0:00, there are more than three, and each lasts at least 10 seconds, so the video gets a chapter bar.
- The first three hashtags appear above the title.

## Tags

20 tags, 437 characters (YouTube allows 500). Paste into the Tags field:

```
FrameShot, FrameShot Chrome extension, screen recorder, free screen recorder, screen recorder for Chrome, Chrome screen recorder, screen recording with audio, record screen with webcam, full page screenshot, full page screenshot Chrome, screenshot extension, Chrome extension, screenshot tool, annotate screenshots, blur screenshot, redact screenshot, screen recording to GIF, no watermark screen recorder, record Chrome tab, Unique Labs
```

## Thumbnails

1280 × 720 JPEG, each about 110–140 KB (YouTube's limit is 2 MB). Big words are kept short so they read at phone size, and the bottom-right corner stays clear for the length badge.

| File | Message |
|---|---|
| `marketing/thumbnails/frameshot-thumb-a.jpg` | **Screen recorder** + full-page screenshots, "Free · No watermark", a REC badge and the webcam bubble. Recommended as the main thumbnail |
| `marketing/thumbnails/frameshot-thumb-b.jpg` | **The whole page. One click.** with the full-page capture and the popup |
| `marketing/thumbnails/frameshot-thumb-c.jpg` | **No watermark.** with an annotated screenshot |

If your channel has YouTube's **Test & compare**, upload all three and let YouTube pick the one that is watched the most. Regenerate them with `node scripts/video/thumbnails.mjs` (it warns if a headline would run into the artwork).

## Upload settings

| Setting | Value |
|---|---|
| Captions | Upload `marketing/frameshot-showcase.srt` as English subtitles |
| Category | Science & Technology |
| Video language | English |
| Audience | No, it's not made for kids |
| Altered or synthetic content | The narration is a synthetic voice that doesn't imitate a real person, and every screen shown is the real product, so YouTube's disclosure, which covers realistic people, places and events, shouldn't apply. The description credits the AI voice anyway. Check YouTube's current guidance when you upload |
| End screen | Add a "Subscribe" element and a link to the website (or the store listing once it's live) over the last 8 seconds, where the outro shows the logo and "Add to Chrome" |

## Pinned comment

```
Thanks for watching! FrameShot is free, with no account, no watermark and no uploads. What should it do next? Tell us below 👇
```
