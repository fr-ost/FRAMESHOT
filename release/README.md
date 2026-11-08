# FrameShot 1.3.0 — release package

`frameshot-1.3.0-chrome.zip` is the production Manifest V3 build produced by
`npm run build && npm run zip` (identical to `.output/frameshot-1.3.0-chrome.zip`).

New in 1.3.0: export recordings as animated GIFs, sound effects (shutter,
recording countdown and chimes; can be turned off), a keyboard shortcut sheet,
smoother scrolling and transitions, and the fixes from two internal reviews.
One new permission, `offscreen`, plays sounds for background captures (no
install warning). See `CHANGELOG.md`.

- Install for testing: unzip it, open `chrome://extensions`, enable Developer mode,
  click **Load unpacked**, and select the unzipped folder.
- Chrome Web Store: this ZIP is the upload artifact. Store screenshots and promo
  tiles are in `store-assets/`, captions in `STORE_LISTING.md`. **Do not submit**
  until the owner approves and the items in `RELEASE_CHECKLIST.md` are complete
  (including the trademark review noted in `COMPETITOR_RESEARCH.md`).
- Verify integrity with `cd release && sha256sum -c SHA256SUMS.txt`.

Rebuild from source at any time to regenerate this file.
