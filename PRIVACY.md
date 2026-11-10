# FrameShot Privacy Policy

*Last updated: 2026-11-10. Applies to FrameShot: Free Screen Recorder & Full Page Screenshot, by Unique Labs.*

## The short version

**Your screenshots, screen recordings, edits, and settings stay in your browser, on your device.** FrameShot never uploads them, and it has no accounts or ads. Nothing is sold or shared.

The only thing FrameShot sends is an **anonymous install count**: when it is installed, updated or removed, it tells its own server a random ID, the FrameShot version, your operating system and your browser language. You can turn this off in **Settings → Privacy**. Details are under [Anonymous install counts](#anonymous-install-counts).

## What FrameShot stores, and where

| Data | Where it is stored | Why |
|---|---|---|
| Screenshots you capture or import | Your browser's IndexedDB storage for the FrameShot extension | So you can view, edit, and export them in the library |
| Screen recordings you make (video, and sound or camera images if you switched them on) | Same IndexedDB storage, saved in small pieces while you record | So you can play and download them, and recover a recording if the browser closes unexpectedly |
| Thumbnails | Same IndexedDB storage | Fast library browsing |
| Edits (annotations, crops, redactions) | Same IndexedDB storage | Non-destructive editing; you can keep changing them |
| Screenshot details: page title, page address (URL), website domain, capture time, image size | Same IndexedDB storage | Shown in the library and used for search, filters, and file names |
| Recording details: length, size, format, whether it has sound, what kind of surface was shared (tab, window or screen), and the shared tab's title when Chrome provides it | Same IndexedDB storage | Shown in the library and the player |
| Your settings | `chrome.storage.local` (this browser only, not synced) | Remember your preferences |
| Small interface preferences (theme, last tool style, composer layout) | The extension's local storage | Convenience |
| Review prompt state: when FrameShot was installed, how many captures and recordings you saved, and whether you rated or dismissed the prompt | `chrome.storage.local` | To ask for a Chrome Web Store review only after you have used FrameShot for a while, and rarely |
| A random install ID (32 letters and digits made up on your device), and an install count that could not be sent yet | `chrome.storage.local` | For the anonymous install counts below. Deleted when you turn them off |

None of this is sent anywhere, apart from the random ID as described below. Chrome's sync feature does not copy it, because FrameShot deliberately uses local storage, not synced storage.

## What FrameShot can access

- **Pages you capture.** FrameShot reads a page only when you start a capture on it: by clicking the toolbar button, using the right-click menu, or pressing a FrameShot shortcut. Chrome grants this one-time access through the `activeTab` permission. FrameShot has **no permanent access to any website**.
- During a capture, FrameShot temporarily scrolls the page and adjusts sticky and fixed elements so the screenshot comes out right. Afterwards it restores your scroll position and removes every temporary change.
- FrameShot does not read the text of pages, your form inputs, passwords, cookies, or browsing history.
- **Screen recording.** FrameShot records only what you choose in **Chrome's own share picker** (a tab, a window, or your screen), and only until you stop. Chrome shows that the screen is being shared for the whole time. FrameShot's own recorder tab is never offered as a source.
- **Microphone and camera.** Used only when you switch them on in the recorder, and Chrome asks for your permission the first time. While switched on, the recorder shows a live preview and level meter; the sound and camera images go only into your recording, on your device. They are turned off when the recording ends or you switch them off.

## Anonymous install counts

To know how many people use FrameShot and whether they keep it, FrameShot sends a small message to its own server (`frameshot.shahriarahmed614.workers.dev`, run by the developer on Cloudflare):

| When | What is sent |
|---|---|
| FrameShot is installed | `install`, the random install ID, the FrameShot version, the operating system family (Windows, macOS, Linux, ChromeOS or other), and the browser language (for example `en`) |
| FrameShot is updated | the same, plus the previous version |
| FrameShot is removed | Chrome opens a short "FrameShot was removed" page on the same server; its address carries the random ID and the version |

**Never sent:** the pages you visit or capture, their addresses or titles, screenshots, recordings, sound or camera images, file names, what you type, your settings, your name, email or any account. FrameShot doesn't report how you use it.

The server records the country Cloudflare reports for each request (a two-letter code such as `DE`), so the developer can see where FrameShot is used. It doesn't store your IP address. With these records the developer sees totals: installs, updates and removals per day, how long installs are kept, and the share of versions, countries, operating systems and languages. The random ID isn't linked to you, your Google account, or anything else, and the data is never sold or shared. If an install count can't be sent (for example while you are offline), FrameShot tries once more the next time the browser starts.

**Turning it off:** switch off **Settings → Privacy → Share anonymous install counts**. FrameShot then sends nothing, deletes the random ID, and Chrome no longer opens the removal page. Developer test builds never send anything.

## Network use

Apart from the install counts above, FrameShot makes **no network requests**. Its pages and background process run under a security policy that blocks connections to every other server, and an automated test verifies this. FrameShot works fully offline.

Files leave FrameShot only when you choose to:
- **Download**: saved to your Downloads folder by Chrome.
- **Copy**: placed on your system clipboard.

GIFs are made from your recordings entirely on your device. Sound effects are generated on your device; for captures started from the toolbar, menu or keyboard, a hidden FrameShot page (an "offscreen document") plays them. It reads no page content.

The optional **Support FrameShot** page shows donation addresses and QR codes stored inside the extension. Copying an address puts it on your clipboard; links to Telegram or the Chrome Web Store open only when you click them. FrameShot never sees, processes or records donations.

FrameShot may occasionally ask whether you would rate it on the Chrome Web Store. The store page opens only if you click **Rate FrameShot**; nothing is sent to the store or anyone else otherwise, and you can choose **Don't ask again**.

The footer credit links to the developer's website (www.shahriarahmed.net). It is an ordinary link: nothing is loaded unless you click it, and clicking opens the site in a new browser tab without sending any FrameShot data.

## Deleting your data

- Delete individual screenshots, recordings, or collections in the library (or a recording from its player).
- Discarding a recording, or deleting an unfinished one the recorder offers to recover, removes all of its data.
- **Settings → Storage → Clear all local data** deletes every screenshot, recording, edit, and collection.
- Uninstalling FrameShot removes all of its stored data from your browser.
- Turning off install counts stops all further records. The server's anonymous records can't be tied to you; if you want them deleted anyway, contact the developer (below).
- Files you already downloaded are yours and are not affected.

## Sensitive information

FrameShot includes blur, pixelation, and solid redaction tools. When you export, these are **flattened into the image pixels**, so the hidden content does not exist in the exported file. Blur and pixelation can sometimes be reversed for short text, so use **Redact** for passwords, card numbers, and personal data.

FrameShot keeps your **original** capture in your local library so you can keep editing. To remove the hidden content from the library copy too, use **Apply edits permanently** in the editor's menu.

## Children

FrameShot collects no personal information from anyone, including children. The anonymous install counts contain no personal information.

## Changes

If this policy ever changes, the new version will be included with the extension update and in this file. FrameShot's core commitment (your captures never leave your device, no accounts, free forever) is permanent.

## Contact

Questions about privacy: contact the developer, Shahriar Ahmed (Unique Labs), at [www.shahriarahmed.net](https://www.shahriarahmed.net) or on Telegram at [t.me/igfrostt](https://t.me/igfrostt).
