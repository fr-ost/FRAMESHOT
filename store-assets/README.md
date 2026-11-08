# Chrome Web Store assets

Everything here is made from the **real FrameShot interface**, driven by a script, on a **fictional demo page**. Nothing depicts a real company, website, person or trademark.

| Folder | What |
|---|---|
| `screenshots/` | Store screenshots, 1280×800, 24-bit PNG without transparency (the format the store asks for) |
| `promo/small-440x280.png` | Small promotional tile |
| `promo/marquee-1400x560.png` | Marquee promotional image |
| `demo/board.html` | The fictional "Demo workspace" page that is captured and recorded |
| `promo/tile.html` | Template for the two promotional images (uses the screenshots) |
| `promo/inter.woff2` | Inter font (SIL Open Font License 1.1, see `promo/Inter-OFL.txt`), the same file the extension bundles |

## Upload order and captions

Upload screenshots 01–05 in this order; `06-composer.png` is an alternative. The captions are in [STORE_LISTING.md](../STORE_LISTING.md#screenshot-captions-1280800).

| File | Shows |
|---|---|
| `01-screen-recorder.png` | The recorder mid-recording: preview, timer, camera bubble, pause/stop |
| `02-full-page-editor.png` | A full-page capture in the editor with a highlight, a box, a note with an arrow and numbered steps |
| `03-gif-export.png` | Export as GIF from the player (dark theme): trim, width, frame rate, loop |
| `04-blur-and-redact.png` | A blurred email and a redacted card number, with the redaction settings |
| `05-library-dark.png` | The library (dark theme) with screenshots, a composition and a recording |
| `06-composer.png` | The composer: gradient background and a browser frame |

## Regenerate

```bash
npm run store:assets
```

This builds the E2E variant (identical UI; it only adds a hook so the script can start captures without clicking the toolbar), then runs `scripts/store-assets.mjs` in headless Chromium. It takes about a minute and overwrites the PNGs.

What is simulated, and why:
- The demo page is served from this machine under **app.example.com**, a domain reserved for documentation (RFC 2606), so the editor and library show a neutral address.
- The recorder's "shared screen" and "camera" are drawn on canvases (a still of the demo page with a moving pointer, and an illustrated avatar), because a headless browser has no screen or camera. Everything else, including the recording, the saved MP4 and the GIF dialog, is the real extension.
- The people, numbers and email on the demo page are made up; the card number is the widely published test number 4242 4242 4242 4242.
- Sound effects are turned off and the review prompt is suppressed while the script runs.

Review the images before uploading; the timestamp in titles is the time the script ran.
