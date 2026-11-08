# FrameShot 1.0.0 — release package (first public release)

`frameshot-1.0.0-chrome.zip` is the production Manifest V3 build produced by
`npm run build && npm run zip` (identical to `.output/frameshot-1.0.0-chrome.zip`).

The first public version: full-page, visible-area, area and element
screenshots with an annotation editor (blur and redact included); a screen
recorder for a tab, window or the whole screen, with sound and a camera bubble;
GIF export; sound effects that can be turned off; and a private local library.
Permissions: activeTab, scripting, storage, unlimitedStorage, downloads,
contextMenus, offscreen; no host permissions. See `CHANGELOG.md`.

- Install for testing: unzip it, open `chrome://extensions`, enable Developer mode,
  click **Load unpacked**, and select the unzipped folder.
- Chrome Web Store: this ZIP is the upload artifact. Store screenshots and promo
  tiles are in `store-assets/`, captions in `STORE_LISTING.md`. **Do not submit**
  until the owner approves and the items in `RELEASE_CHECKLIST.md` are complete
  (including the trademark review noted in `COMPETITOR_RESEARCH.md`).
- Verify integrity with `cd release && sha256sum -c SHA256SUMS.txt`.

Rebuild from source at any time to regenerate this file.
