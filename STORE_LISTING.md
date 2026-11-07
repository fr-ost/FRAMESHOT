# Chrome Web Store Listing

Draft listing copy for *Frameora*. **Do not submit without explicit owner approval** (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)). Make no claims about user numbers, ratings, reviews, awards, or speed.

## Name

**Frameora: Free Screenshot & Full Page Capture**

(45 characters; the Web Store limit is 75.)

## Short description (summary, ≤ 132 characters)

> Capture, edit, organize, and export screenshots with a complete browser-based toolkit. Free forever. Local-first.

(113 characters; matches the manifest `description`.)

## Category

Suggested: **Productivity** (alternative: Tools / Developer Tools).

## Full description

```
Capture the web. Edit every detail. Free forever.

Frameora is a complete screenshot toolkit for Chrome by Unique Labs. Capture full webpages, selected areas, and individual elements. Annotate screenshots, hide sensitive information, compose polished visuals, and export in multiple formats. Everything happens locally in your browser.

FREE FOREVER
• Unlimited captures (limited only by your device's storage and memory)
• No watermarks
• No subscriptions or paid tiers
• No account required
• No locked features
• Your screenshots stay on your device

CAPTURE
• Visible area, with an optional 3, 5, or 10 second delay
• Full page: scrolls and stitches the whole page; sticky headers and fixed footers appear once, not repeated
• Loads lazy images and infinite-scroll content first, with a maximum height and a Stop & save button
• Selected area: drag to select and scroll to extend the selection
• Element: hover and click any part of a page
• Scrolling panel: captures the full content of chat panels, tables, and feeds
• Very large pages are split into full-resolution parts (or scaled, your choice), and Frameora always tells you which
• Start from the toolbar, the right-click menu, or keyboard shortcuts

EDIT
• Crop, resize, rotate, and flip
• Arrows, lines, rectangles, rounded rectangles, ellipses, pen, highlighter, text, numbered steps, and symbols
• Move, resize, duplicate, layer, undo, and redo
• Blur, pixelate, or permanently redact sensitive details; redactions are flattened into the exported image

COMPOSE
• Backgrounds (solid, gradient, or transparent), padding, rounded corners, shadows
• Presets for 16:9, 1:1, 4:5, 9:16, 1200×630 social cards, 1920×1080, or a custom size
• Optional browser-window frame

EXPORT
• PNG, JPEG, WebP, and PDF (long pages continue across PDF pages)
• Copy to clipboard
• Bulk export as ZIP or as one combined PDF
• Custom file name templates

ORGANIZE
• Local screenshot library with search, website filter, favourites, collections, and tags
• Duplicate detection and side-by-side comparison
• Import images by drag and drop or paste

PRIVATE BY DESIGN
• No servers, accounts, analytics, tracking, or ads
• Frameora's pages block all network connections
• Frameora accesses a tab only when you start a capture on it
• Works offline

Good to know: Chrome does not allow extensions to capture browser pages (chrome://) or the Chrome Web Store, and limits screenshots to two per second, so long pages take a few seconds. Blur and pixelation can sometimes be reversed for short text; use Redact for confidential information.

Frameora by Unique Labs. Useful technology. Accessible to everyone.
```

## Screenshot captions (1280×800)

1. **Capture any page, all of it.** A full-page capture with the sticky header shown once, opened in the editor.
2. **Annotate in seconds.** Arrows, shapes, text, highlights, and numbered steps on a product page.
3. **Hide what matters.** Blur, pixelate, and permanent redaction over personal details.
4. **Make it presentation-ready.** The composer with a gradient background, shadow, and window frame.
5. **Your library, on your device.** The library grid with search, collections, and favourites.

Produce these from real captures of Frameora's own fixture or demo pages. Don't depict real companies' pages or trademarks.

## Promotional images
- Small tile 440×280 and marquee 1400×560: the logo (frame corners plus spark) on brand indigo `#4F46E5` with the tagline. *To be produced.*
- Store icon: `public/icon/128.png`.

## Permission justifications

| Permission | Why Frameora needs it |
|---|---|
| `activeTab` | Temporary access to the current tab **only when you start a capture** (toolbar, right-click menu, or shortcut). There is no permanent access to any site. |
| `scripting` | Runs Frameora's bundled capture script in that tab to scroll and measure the page, show the selection overlay, and restore the page afterwards. |
| `storage` | Saves your settings on this device. |
| `unlimitedStorage` | Keeps your full-resolution screenshot library from being evicted by the browser. Long screenshots can be large. |
| `downloads` | Saves exported images, PDFs, and ZIP files to your Downloads folder and confirms they finished. |
| `contextMenus` | Adds Frameora capture options to the right-click menu. |

- **Host permissions:** none.
- **Remote code:** none. All code ships inside the extension package.

## Single purpose statement

> Frameora captures screenshots of web pages and lets the user edit, organize, and export them locally.

## Data usage disclosure

Frameora collects **no user data**. See [PRIVACY_DISCLOSURE.md](PRIVACY_DISCLOSURE.md) for the form answers and [PRIVACY.md](PRIVACY.md) for the policy.
