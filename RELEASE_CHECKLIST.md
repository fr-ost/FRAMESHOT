# Release Checklist

> ⚠️ **Do not submit or publish to the Chrome Web Store without explicit approval from the owner (Unique Labs).**

## 1. Legal & brand
- [ ] **Trademark clearance for "Frameora"** by counsel (US, EU, UK, WIPO; Classes 9 and 42). Research found a **moderate risk** from the registered mark **FRAMEO** (frameo ApS), which is contained in the first six letters. See [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md) §8.
- [ ] A fallback name is prepared in case clearance fails.
- [ ] Domains and social handles are checked and secured, if desired.
- [ ] The privacy policy ([PRIVACY.md](PRIVACY.md)) is hosted at a public URL, and the contact address placeholders are replaced in PRIVACY.md and SECURITY.md.

## 2. Version & code
- [ ] Bump `version` in `package.json` (the manifest version comes from it).
- [ ] Update [CHANGELOG.md](CHANGELOG.md).
- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm run compile` passes with no type errors.
- [ ] `npm test` passes all unit tests.
- [ ] `npm run test:e2e` passes all E2E tests; record the counts in [TESTING.md](TESTING.md).
- [ ] No `console.log` of page content or URLs; no debug code outside `__FRAMEORA_E2E__`.

## 3. Build & package
- [ ] `npm run build`, then confirm `.output/chrome-mv3/manifest.json`:
  - [ ] name "Frameora: Free Screenshot & Full Page Capture", correct description and version
  - [ ] permissions are exactly `activeTab, scripting, storage, unlimitedStorage, downloads, contextMenus`
  - [ ] **no `host_permissions`**
  - [ ] the CSP includes `connect-src 'self' blob: data:` and `script-src 'self'`
  - [ ] icons 16/32/48/96/128 are present
- [ ] The production bundle contains no `__frameoraTest` (`grep -r __frameoraTest .output/chrome-mv3` finds nothing).
- [ ] The production bundle loads no remote URLs (no `https://` script, style, or font loads; XML namespace strings are fine).
- [ ] `npm run zip` produces `.output/frameora-<version>-chrome.zip`. Unzip it and verify the contents match `.output/chrome-mv3`.
- [ ] **Never** package `.output/chrome-mv3-e2e`, which has `<all_urls>` and test hooks.

## 4. Manual QA (real Chrome, installed via Load unpacked or from the ZIP)
- [ ] Toolbar popup: visible, full page, selected area, element, and scrolling panel all work from a **real click**.
- [ ] Physical shortcuts Alt+Shift+V/F/A/E work, or show as "Not set" in Settings if they conflict.
- [ ] Right-click menu: every capture item and "Open screenshot library".
- [ ] Full-page capture on long real sites (news, docs, app shells, feeds). Sticky headers are not repeated, the page is restored, and the scroll position is unchanged.
- [ ] 1× and 2× displays; browser zoom at 90%, 110%, 125%, and 150%.
- [ ] Cancel with Esc; Stop & save on an endless feed; the max-height warning appears.
- [ ] Restricted pages show a clear message; `file://` works when file access is enabled.
- [ ] Editor: every tool, crop/rotate/flip/resize, undo/redo, text editing, and layers.
- [ ] Redaction: export PNG, JPEG, WebP, and PDF and visually confirm the hidden areas are solid.
- [ ] Clipboard paste into another app.
- [ ] Composer presets and export.
- [ ] Library: search, filter, favourites, collections, tags, rename, delete, bulk ZIP, combined PDF, import, compare, duplicates.
- [ ] Settings changes persist after restarting the browser; Clear all local data works.
- [ ] Light, dark, and system themes; keyboard-only navigation; focus is visible.
- [ ] Offline (DevTools → Network → Offline): the Studio, editor, and exports still work.
- [ ] Uninstall and reinstall: the welcome page opens and the library starts empty.

## 5. Store assets
- [ ] Listing copy from [STORE_LISTING.md](STORE_LISTING.md) reviewed: no unverifiable claims, and "unlimited" qualified.
- [ ] Five 1280×800 screenshots made from non-sensitive demo pages (no third-party trademarks).
- [ ] Promotional tiles (440×280; optionally 1400×560).
- [ ] Privacy practices form filled from [PRIVACY_DISCLOSURE.md](PRIVACY_DISCLOSURE.md).
- [ ] Permission justifications pasted from [STORE_LISTING.md](STORE_LISTING.md).
- [ ] Category, language (English), and support contact set.

## 6. Submission (only after owner approval)
- [ ] Owner approval recorded (who, when).
- [ ] Upload the ZIP; set visibility (unlisted first is recommended); submit for review.
- [ ] Tag the release in git (`v<version>`) after acceptance.
