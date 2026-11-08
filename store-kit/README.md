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
| Description | `1-store-listing/description.txt` | ~11,000 / 16,000 characters: sections, how-to steps and FAQ; every tracked search phrase 5 times or fewer |
| Category, language, URLs | `1-store-listing/other-fields.md` | Tools · English |
| Store icon | `images/icon-128.png` | 128 × 128 |
| Screenshots | `images/screenshot-1.png` … `screenshot-5.png` | 1280 × 800, 24-bit PNG, upload in order |
| Small promo tile | `images/small-promo-440x280.png` | 440 × 280 |
| Marquee promo tile | `images/marquee-1400x560.png` | 1400 × 560 |

### The five screenshots

Each is a 1280 × 800 marketing image (headline, callouts and the real UI), and together they cover the whole feature set:

1. **Overview** — "Record your screen. Capture full pages." The popup, four headline features, Unlimited and No watermark.
2. **Screen recorder** — "Record your screen with sound & camera." System audio + mic, camera bubble, MP4 · 4K · 60 fps, crash-safe.
3. **Full page screenshot & editor** — "Capture whole pages. Annotate in seconds." One-click full page, arrows/text/steps, crop/resize/rotate, 5 capture modes.
4. **Blur · GIF · Export** — "Hide private details. Share it anywhere." Redaction, GIF from any clip, every export format.
5. **Free. Unlimited. Private.** — Library, beautify, bulk ZIP & PDF, duplicates, shortcuts & sounds, offline; the developer credit.

They are rebuilt from the real extension by `npm run store:assets` (capture: `scripts/store-assets.mjs`, layout: `scripts/store-render.mjs`) on a made-up demo page at `app.example.com`; no real site, brand or person appears.

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
