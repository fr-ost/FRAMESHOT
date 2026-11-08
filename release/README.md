# FrameShot 1.1.0 — release package

`frameshot-1.1.0-chrome.zip` is the production Manifest V3 build produced by
`npm run build && npm run zip` (identical to `.output/frameshot-1.1.0-chrome.zip`).

- Install for testing: unzip it, open `chrome://extensions`, enable Developer mode,
  click **Load unpacked**, and select the unzipped folder.
- Chrome Web Store: this ZIP is the upload artifact. **Do not submit** until the
  owner approves and the items in `RELEASE_CHECKLIST.md` are complete (including
  the trademark review noted in `COMPETITOR_RESEARCH.md`).
- Verify integrity with `cd release && sha256sum -c SHA256SUMS.txt`.

Rebuild from source at any time to regenerate this file.
