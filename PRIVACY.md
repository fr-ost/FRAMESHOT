# FrameShot Privacy Policy

*Last updated: 2026-11-08. Applies to FrameShot: Free Screen Recorder & Full Page Screenshot, by Unique Labs.*

## The short version

**FrameShot does not collect, transmit, sell, or share any data.** Your screenshots, screen recordings, edits, and settings stay in your browser, on your device. There are no accounts, servers, analytics, ads, or tracking.

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

None of this is sent anywhere. Chrome's sync feature does not copy it, because FrameShot deliberately uses local storage, not synced storage.

## What FrameShot can access

- **Pages you capture.** FrameShot reads a page only when you start a capture on it: by clicking the toolbar button, using the right-click menu, or pressing a FrameShot shortcut. Chrome grants this one-time access through the `activeTab` permission. FrameShot has **no permanent access to any website**.
- During a capture, FrameShot temporarily scrolls the page and adjusts sticky and fixed elements so the screenshot comes out right. Afterwards it restores your scroll position and removes every temporary change.
- FrameShot does not read the text of pages, your form inputs, passwords, cookies, or browsing history.
- **Screen recording.** FrameShot records only what you choose in **Chrome's own share picker** (a tab, a window, or your screen), and only until you stop. Chrome shows that the screen is being shared for the whole time. FrameShot's own recorder tab is never offered as a source.
- **Microphone and camera.** Used only when you switch them on in the recorder, and Chrome asks for your permission the first time. While switched on, the recorder shows a live preview and level meter; the sound and camera images go only into your recording, on your device. They are turned off when the recording ends or you switch them off.

## Network use

FrameShot makes **no network requests**. Its pages and background process run under a security policy that blocks network connections entirely, and an automated test verifies this. FrameShot works fully offline.

Files leave FrameShot only when you choose to:
- **Download**: saved to your Downloads folder by Chrome.
- **Copy**: placed on your system clipboard.

GIFs are made from your recordings entirely on your device. Sound effects are generated on your device; for captures started from the toolbar, menu or keyboard, a hidden FrameShot page (an "offscreen document") plays them. It reads no page content.

FrameShot may occasionally ask whether you would rate it on the Chrome Web Store. The store page opens only if you click **Rate FrameShot**; nothing is sent to the store or anyone else otherwise, and you can choose **Don't ask again**.

The footer credit links to the developer's website (www.shahriarahmed.net). It is an ordinary link: nothing is loaded unless you click it, and clicking opens the site in a new browser tab without sending any FrameShot data.

## Deleting your data

- Delete individual screenshots, recordings, or collections in the library (or a recording from its player).
- Discarding a recording, or deleting an unfinished one the recorder offers to recover, removes all of its data.
- **Settings → Storage → Clear all local data** deletes every screenshot, recording, edit, and collection.
- Uninstalling FrameShot removes all of its stored data from your browser.
- Files you already downloaded are yours and are not affected.

## Sensitive information

FrameShot includes blur, pixelation, and solid redaction tools. When you export, these are **flattened into the image pixels**, so the hidden content does not exist in the exported file. Blur and pixelation can sometimes be reversed for short text, so use **Redact** for passwords, card numbers, and personal data.

FrameShot keeps your **original** capture in your local library so you can keep editing. To remove the hidden content from the library copy too, use **Apply edits permanently** in the editor's menu.

## Children

FrameShot collects no personal information from anyone, including children.

## Changes

If this policy ever changes, the new version will be included with the extension update and in this file. FrameShot's core commitment (no data collection, no accounts, free forever) is permanent.

## Contact

Unique Labs: *contact address to be added before publication* (placeholder).
