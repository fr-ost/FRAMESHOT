# FrameShot 1.0.2 — release package

`frameshot-1.0.2-chrome.zip` is the production Manifest V3 build produced by
`npm run build && npm run zip` (identical to `.output/frameshot-1.0.2-chrome.zip`).

New in 1.0.2: the store name is **FrameShot: Screen Recorder & Full Page
Screenshot** (no "Free"), and the store images and popup no longer show
"Free", "Unlimited" or "new", after the store rejected 1.0.1 (violation
"Red Nickel"). Upload the new images from `store-kit/images/` together with
this ZIP.

Since 1.0.1: **anonymous install counts**. On install and update FrameShot
sends a random install ID, its version, the OS family and the browser language
to `https://frameshot.shahriarahmed614.workers.dev` (source and setup in
`server/telemetry/`), and Chrome opens that Worker's "FrameShot was removed"
page on uninstall. Users turn it off in Settings → Privacy. That origin is the
only remote host in the CSP's `connect-src`. Permissions are unchanged:
activeTab, scripting, storage, unlimitedStorage, downloads, contextMenus,
offscreen; no host permissions. See `CHANGELOG.md`.

Before uploading:

1. Set up the Worker (`server/telemetry/README.md`) and check that
   `https://frameshot.shahriarahmed614.workers.dev/health` says `ok`.
2. In the Chrome Web Store dashboard, update **Privacy practices → Data usage**
   as in `store-kit/2-privacy-practices/data-usage.md` (Location: Yes, for the
   country code), and update the privacy policy page from `PRIVACY.md`
   (the website's `/privacy` already has it once deployed).

- Install for testing: unzip it, open `chrome://extensions`, enable Developer mode,
  click **Load unpacked**, and select the unzipped folder.
- Chrome Web Store: this ZIP is the upload artifact. **Do not submit** until the
  owner approves.
- Verify integrity with `cd release && sha256sum -c SHA256SUMS.txt`.
