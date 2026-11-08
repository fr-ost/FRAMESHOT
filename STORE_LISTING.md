# Chrome Web Store Listing

Draft listing copy for *FrameShot*. **Do not submit without explicit owner approval** (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)). Make no claims about user numbers, ratings, reviews, awards, or speed.

> **Name risk.** "FrameShot" is already used by other Chrome Web Store screenshot extensions and by a US trademark filing (see [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md), addendum). Resolve this before submitting.

## Name

**FrameShot: Free Full Page Screenshot, Screen Capture & Editor**

(61 characters; the Web Store limit is 75.) Matches the manifest `name`.

## Short description (summary, ≤ 132 characters)

> Full page screenshot tool: capture scrolling pages, areas & elements. Annotate, blur, export PNG, JPG, PDF. Private, no watermark.

(130 characters.) Matches the manifest `description`.

## SEO

The Chrome Web Store ranks mainly on the **name** and **summary**, then the full description. The copy targets the phrases people search for and that leading screenshot extensions rank on, without keyword stuffing (the store reviews listings that repeat a keyword more than about five times, and its spam policy forbids irrelevant keywords or naming competitors).

| Where | Target phrases |
|---|---|
| Name | full page screenshot · screen capture · screenshot editor · free |
| Summary | screenshot tool · scrolling (pages) · capture areas & elements · annotate · blur · PNG / JPG / PDF · private · no watermark |
| Full description (each ≤ 5×, written naturally) | full page screenshot · scrolling screenshot · capture an entire web page · screen capture · screenshot tool · visible area · selected area · element / scrolling panel capture · screenshot editor · annotate · blur and redact sensitive information · save as PDF / PNG / JPEG / WebP · browser mockup · free, no watermark, no sign-up · works offline, no uploads |

Deliberately avoided: "screen recorder" (not a feature), competitor names, and the exact phrase "Annotate & Blur" used in a competitor's title.

## Category

Suggested: **Tools** (alternative: Productivity). Both are where users browse for screenshot extensions.

## Full description

```
Capture the web. Edit every detail. Free forever.

FrameShot is a free full page screenshot tool and screenshot editor for Chrome, by Unique Labs. Take a scrolling screenshot of an entire web page in one click, capture the visible area, a selected area, or a single element, then annotate, blur sensitive information, and save as PNG, JPEG, WebP or PDF. Everything happens locally in your browser: no sign-up, no uploads, no watermark.

FREE, WITH NOTHING LOCKED
• Unlimited captures (limited only by your device's storage and memory)
• No watermark, no subscription, no paid tier, no account
• Every feature is available to everyone

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
• Save as PNG, JPEG, WebP or PDF (long pages continue across PDF pages)
• Copy to the clipboard
• Bulk export as ZIP or one combined PDF
• Custom file name templates

ORGANIZE
• A private, local library with search, website filter, favourites, collections and tags
• Duplicate detection and side-by-side comparison
• Import images by drag and drop or paste

PRIVATE BY DESIGN
• No servers, accounts, analytics, tracking or ads
• Works offline; FrameShot's pages block all network connections
• FrameShot can only access a tab when you ask it to
• Light and dark themes

Good to know: Chrome blocks extensions from browser pages (chrome://) or the Chrome Web Store, and allows two screenshots per second, so long pages take a few seconds. Blur and pixelation can sometimes be reversed for short text; use Redact for confidential information.

A Product of Unique Labs. Developed by Shahriar Ahmed (www.shahriarahmed.net).
```

## Screenshot captions (1280×800)

1. **Full page screenshot in one click.** A scrolling capture of an entire web page, sticky header shown once, opened in the editor.
2. **A screenshot editor that's fast.** Arrows, shapes, text, highlights and numbered steps.
3. **Blur or redact sensitive information.** Redactions are flattened into the exported image.
4. **Presentation-ready visuals.** Gradient backgrounds, shadows and a browser mockup frame.
5. **Private screenshot library.** Search, collections and favourites, stored only on your device. Light and dark themes.

Produce these from real captures of FrameShot's own fixture or demo pages. Don't depict real companies' pages or trademarks.

## Promotional images
- Small tile 440×280 and marquee 1400×560: the logo (frame corners plus spark) on brand indigo `#4F46E5` with the tagline. *To be produced.*
- Store icon: `public/icon/128.png`.

## Permission justifications

| Permission | Why FrameShot needs it |
|---|---|
| `activeTab` | Temporary access to the current tab **only when you start a capture** (toolbar, right-click menu, or shortcut). There is no permanent access to any site. |
| `scripting` | Runs FrameShot's bundled capture script in that tab to scroll and measure the page, show the selection overlay, and restore the page afterwards. |
| `storage` | Saves your settings on this device. |
| `unlimitedStorage` | Keeps your full-resolution screenshot library from being evicted by the browser. Long screenshots can be large. |
| `downloads` | Saves exported images, PDFs, and ZIP files to your Downloads folder and confirms they finished. |
| `contextMenus` | Adds FrameShot capture options to the right-click menu. |

- **Host permissions:** none.
- **Remote code:** none. All code ships inside the extension package.

## Single purpose statement

> FrameShot captures screenshots of web pages and lets the user edit, organize, and export them locally.

## Data usage disclosure

FrameShot collects **no user data**. See [PRIVACY_DISCLOSURE.md](PRIVACY_DISCLOSURE.md) for the form answers and [PRIVACY.md](PRIVACY.md) for the policy.
