# FrameShot Privacy Policy

*Last updated: 2026-11-07. Applies to FrameShot: Free Screenshot & Full Page Capture, by Unique Labs.*

## The short version

**FrameShot does not collect, transmit, sell, or share any data.** Your screenshots, edits, and settings stay in your browser, on your device. There are no accounts, servers, analytics, ads, or tracking.

## What FrameShot stores, and where

| Data | Where it is stored | Why |
|---|---|---|
| Screenshots you capture or import | Your browser's IndexedDB storage for the FrameShot extension | So you can view, edit, and export them in the library |
| Thumbnails | Same IndexedDB storage | Fast library browsing |
| Edits (annotations, crops, redactions) | Same IndexedDB storage | Non-destructive editing; you can keep changing them |
| Screenshot details: page title, page address (URL), website domain, capture time, image size | Same IndexedDB storage | Shown in the library and used for search, filters, and file names |
| Your settings | `chrome.storage.local` (this browser only, not synced) | Remember your preferences |
| Small interface preferences (theme, last tool style, composer layout) | The extension's local storage | Convenience |

None of this is sent anywhere. Chrome's sync feature does not copy it, because FrameShot deliberately uses local storage, not synced storage.

## What FrameShot can access

- **Pages you capture.** FrameShot reads a page only when you start a capture on it: by clicking the toolbar button, using the right-click menu, or pressing a FrameShot shortcut. Chrome grants this one-time access through the `activeTab` permission. FrameShot has **no permanent access to any website**.
- During a capture, FrameShot temporarily scrolls the page and adjusts sticky and fixed elements so the screenshot comes out right. Afterwards it restores your scroll position and removes every temporary change.
- FrameShot does not read the text of pages, your form inputs, passwords, cookies, or browsing history.

## Network use

FrameShot makes **no network requests**. Its pages and background process run under a security policy that blocks network connections entirely, and an automated test verifies this. FrameShot works fully offline.

Files leave FrameShot only when you choose to:
- **Download**: saved to your Downloads folder by Chrome.
- **Copy**: placed on your system clipboard.

The footer credit links to the developer's website (www.shahriarahmed.net). It is an ordinary link: nothing is loaded unless you click it, and clicking opens the site in a new browser tab without sending any FrameShot data.

## Deleting your data

- Delete individual screenshots or collections in the library.
- **Settings → Storage → Clear all local data** deletes every screenshot, edit, and collection.
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
