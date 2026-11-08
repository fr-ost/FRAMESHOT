# Chrome Web Store: Privacy Practices Disclosure

Prepared answers for the **Privacy practices** tab of the Chrome Web Store Developer Dashboard for *FrameShot: Free Screenshot & Full Page Capture*. Review against the current form wording before submitting.

## Single purpose

> FrameShot captures screenshots of web pages (visible area, full page, selected area, element, or scrolling panel), and lets the user edit, organize, and export them locally in the browser.

## Permission justifications

| Permission | Justification |
|---|---|
| `activeTab` | Grants temporary access to the tab only when the user starts a capture (toolbar button, context menu, or keyboard shortcut), so FrameShot can take the screenshot and inject its capture script. No permanent site access is requested. |
| `scripting` | Injects FrameShot's bundled capture script into the user-invoked tab to measure and scroll the page for full-page, element, and area captures, show selection overlays, and restore the page afterwards. It also inserts and removes temporary capture CSS. No remote code is executed. |
| `storage` | Saves the user's settings locally (`chrome.storage.local`) and keeps short-lived capture state (`chrome.storage.session`) across service-worker restarts. |
| `unlimitedStorage` | The local screenshot library stores full-resolution images in IndexedDB. Long full-page screenshots can be tens of megabytes, and without this permission the browser could evict the user's library. |
| `downloads` | Saves exported images, PDFs, and ZIP archives to the user's Downloads folder when the user clicks Download, and confirms the download completed before telling the user it was saved. |
| `contextMenus` | Adds a "FrameShot" right-click menu with capture options and a shortcut to the library. |

**Host permissions:** none.
**Remote code:** none. All JavaScript is packaged with the extension; the extension's CSP forbids remote scripts and blocks network connections (`connect-src 'self' blob: data:`).

## Data usage

Answer **No** to every data-collection category. FrameShot does not collect or transmit:

| Category | Collected? |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No |

Note: Screenshots, and the page title and URL of captured pages, are stored **only locally** on the user's device for the user's own library. They are never transmitted to the developer or any third party. Under the Chrome Web Store definitions, data that never leaves the device is not "collected", but this note is included for transparency.

## Certifications

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Privacy policy URL

Host [PRIVACY.md](PRIVACY.md) at a public URL (for example a project website or GitHub Pages) and enter it in the dashboard. *Placeholder: URL to be decided by Unique Labs.*
