# Chrome Web Store: Privacy Practices Disclosure

Paste-ready versions of these answers are in [`store-kit/2-privacy-practices/`](store-kit/2-privacy-practices/). Prepared answers for the **Privacy practices** tab of the Chrome Web Store Developer Dashboard for *FrameShot: Free Screen Recorder & Full Page Screenshot*. Review against the current form wording before submitting.

## Single purpose

> FrameShot captures what is on the user's screen: screenshots of web pages (visible area, full page, selected area, element, or scrolling panel) and screen recordings of a tab, window or screen the user chooses. It lets the user edit, organize, and export these captures locally in the browser.

## Permission justifications

| Permission | Justification |
|---|---|
| `activeTab` | Grants temporary access to the tab only when the user starts a capture (toolbar button, context menu, or keyboard shortcut), so FrameShot can take the screenshot and inject its capture script. No permanent site access is requested. |
| `scripting` | Injects FrameShot's bundled capture script into the user-invoked tab to measure and scroll the page for full-page, element, and area captures, show selection overlays, and restore the page afterwards. It also inserts and removes temporary capture CSS. No remote code is executed. |
| `storage` | Saves the user's settings locally (`chrome.storage.local`) and keeps short-lived capture state (`chrome.storage.session`) across service-worker restarts. |
| `unlimitedStorage` | The local library stores full-resolution images and screen recordings in IndexedDB. Long full-page screenshots can be tens of megabytes and recordings hundreds; without this permission the browser could evict the user's library. |
| `downloads` | Saves exported images, PDFs, and ZIP archives to the user's Downloads folder when the user clicks Download, and confirms the download completed before telling the user it was saved. |
| `contextMenus` | Adds a "FrameShot" right-click menu with capture options and a shortcut to the library. |
| `offscreen` | Creates a hidden offscreen document (reason: audio playback) that plays FrameShot's sound effects, such as the camera shutter, for captures run by the background service worker, which cannot play audio. It reads no page content and sends nothing. |

**Screen recording, microphone, camera:** no manifest permission is used. Recording goes through Chrome's own share picker (`getDisplayMedia`), and the microphone and camera through Chrome's permission prompt (`getUserMedia`), only after the user switches them on in the recorder.

**Host permissions:** none.
**Remote code:** none. All JavaScript is packaged with the extension; the extension's CSP forbids remote scripts and blocks connections to every server except the install-count Worker (`connect-src 'self' blob: data: https://frameshot.shahriarahmed614.workers.dev`).

## Data usage

Tick **Location** only. Answer **No** to every other category:

| Category | Collected? |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | **Yes** (country only, for anonymous install counts) |
| Web history | No |
| User activity | No |
| Website content | No |

FrameShot 1.0.1 and later send **anonymous install counts** (see [PRIVACY.md](PRIVACY.md#anonymous-install-counts)): on install and update, a random install ID made on the device, the FrameShot version, the OS family and the browser language go to the developer's own Cloudflare Worker, and Chrome opens the Worker's uninstall page (random ID and version) on removal. The Worker records the two-letter **country** Cloudflare derives from the request; the IP address is not stored. Users can turn this off in Settings → Privacy.

Why **Location: Yes**: the store defines Location as "region, IP address, GPS coordinates, or information about things near the user's device". A country code is a region, so ticking it is the accurate answer. Nothing else applies: the random ID identifies no person (not PII), and no web history, user activity or website content is sent. (If you would rather answer No everywhere, remove the country column from the Worker first: in `server/telemetry/worker.js`, store `'XX'` instead of `country(req)`.)

Note: Screenshots, screen recordings (including any microphone sound and camera images the user chose to include), and the page title and URL of captured pages, are stored **only locally** on the user's device for the user's own library. They are never transmitted to the developer or any third party. Under the Chrome Web Store definitions, data that never leaves the device is not "collected", but this note is included for transparency.

## Certifications

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Privacy policy URL

Host `store-kit/2-privacy-practices/privacy-policy.html` (generated from [PRIVACY.md](PRIVACY.md)) at a public URL, for example `https://www.shahriarahmed.net/frameshot/privacy`, and enter it in the dashboard.
