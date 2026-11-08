# FrameShot — Chrome Web Store kit

Everything needed to fill in the Chrome Web Store Developer Dashboard, in the order the dashboard asks for it. Paste the `.txt` files as they are. Rebuild with `npm run store:kit` (it validates lengths, keywords, image sizes and the manifest, then writes `release/frameshot-store-kit.zip`).

**Do not submit without the owner's approval.** Before submitting, resolve the name/trademark risk noted in `COMPETITOR_RESEARCH.md`.

## 0. Package

Upload `release/frameshot-1.0.0-chrome.zip` (Package tab).

## 1. Store listing tab

| Field | File | Notes |
|---|---|---|
| Name (from the manifest) | `1-store-listing/name.txt` | 54 / 75 characters |
| Summary (from the manifest) | `1-store-listing/summary.txt` | 130 / 132 characters |
| Description | `1-store-listing/description.txt` | ~3,700 / 16,000 characters; no keyword more than 5 times |
| Category, language, URLs | `1-store-listing/other-fields.md` | Tools · English |
| Store icon | `images/icon-128.png` | 128 × 128 |
| Screenshots | `images/screenshot-1.png` … `screenshot-5.png` | 1280 × 800, 24-bit PNG, upload in order |
| Small promo tile | `images/small-promo-440x280.png` | 440 × 280 |
| Marquee promo tile | `images/marquee-1400x560.png` | 1400 × 560 |

### Screenshot captions

The store shows screenshots without captions, so each one already explains itself. For your reference (and for social posts):

1. **Free screen recorder with sound and camera.** Record a tab, window or your whole screen, with a camera bubble. No watermark, no time limit.
2. **Full page screenshots you can annotate.** Capture an entire page in one click, then add arrows, boxes, text, highlights and numbered steps.
3. **Turn any part of a recording into a GIF.** Trim it, pick the size and frame rate. Made on your device.
4. **Blur or redact sensitive information.** Redacted areas are replaced with solid colour in every export.
5. **One private library for screenshots and recordings.** Search, favourites and collections, stored only on your device. Light and dark themes.

All images come from the real extension (`npm run store:assets`) on a made-up demo page at `app.example.com`; no real site, brand or person appears.

## 2. Privacy practices tab

| Field | File |
|---|---|
| Single purpose description | `2-privacy-practices/single-purpose.txt` |
| Permission justifications (one box each) | `2-privacy-practices/permissions/<permission>.txt` — activeTab, scripting, storage, unlimitedStorage, downloads, contextMenus, offscreen |
| Host permissions | None are requested (nothing to justify) |
| Are you using remote code? | **No** — `2-privacy-practices/remote-code.txt` |
| Data usage (tick nothing) and the three certifications | `2-privacy-practices/data-usage.md` |
| Privacy policy URL | Host `2-privacy-practices/privacy-policy.html` publicly (for example `https://www.shahriarahmed.net/frameshot/privacy`) and paste the URL |

## 3. Distribution tab

Free · Public · all regions.

## After publishing

- Open FrameShot's "Rate FrameShot" link once and check it lands on the listing's Reviews tab; if the store gives the listing a different URL slug, update `REVIEW_URL_SLUG` in `src/core/review.ts`.
- Keep `name.txt` and `summary.txt` identical to the manifest (`wxt.config.ts`); the build script checks this.
