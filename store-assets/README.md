# Chrome Web Store assets

Everything here is made from the **real FrameShot interface**, driven by a script, on a **fictional demo page**. Nothing depicts a real company, website, person or trademark.

| Folder | What |
|---|---|
| `screenshots/` | Store screenshots, 1280×800 marketing images (headline, callouts, real UI), 24-bit PNG without transparency |
| `raw/` | 2× captures of the real UI used by the layouts (generated, not committed) |
| `promo/small-440x280.png` | Small promotional tile |
| `promo/marquee-1400x560.png` | Marquee promotional image |
| `demo/board.html` | The fictional "Demo workspace" page that is captured and recorded |
| `promo/tile.html` | Template for the two promotional images (uses the screenshots) |
| `promo/inter.woff2` | Inter font (SIL Open Font License 1.1, see `promo/Inter-OFL.txt`), the same file the extension bundles |

## Upload order

`01-overview.png`, `02-screen-recorder.png`, `03-full-page-editor.png`, `04-blur-gif-export.png`, `05-private.png`. What each one says is in [store-kit/README.md](../store-kit/README.md).

## Regenerate

```bash
npm run store:assets
```

This builds the E2E variant (identical UI; it only adds a hook so the script can start captures without clicking the toolbar), runs `scripts/store-assets.mjs` to capture the real UI at 2× into `raw/`, then `scripts/store-render.mjs` to lay the captures out as the five screenshots, the marquee and the small tile (Inter font, lucide icons). It takes about two minutes and overwrites the PNGs.

What is simulated, and why:
- The demo page is served from this machine under **app.example.com**, a domain reserved for documentation (RFC 2606), so the editor and library show a neutral address.
- The recorder's "shared screen" and "camera" are drawn on canvases (a still of the demo page with a moving pointer, and an illustrated avatar), because a headless browser has no screen or camera. Everything else, including the recording, the saved MP4 and the GIF dialog, is the real extension.
- The people, numbers and email on the demo page are made up; the card number is the widely published test number 4242 4242 4242 4242.
- Sound effects are turned off and the review prompt is suppressed while the script runs.

Review the images before uploading; the timestamp in titles is the time the script ran.
