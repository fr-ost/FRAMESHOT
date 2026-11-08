# FrameShot Security

## Reporting a vulnerability

Please report security issues privately to **security@uniquelabs.example**. *(Placeholder: replace with the real Unique Labs security contact before publication.)* Include steps to reproduce, the affected version (shown in Settings → About), and your Chrome version. Please don't open public issues for vulnerabilities.

## Security model

FrameShot is a local-first Chrome extension with no backend. The assets worth protecting are:

1. **The user's screenshots**, which may contain sensitive information, and their metadata (page titles and URLs).
2. **The pages being captured**: FrameShot must not break them, leak their content, or let them influence FrameShot.
3. **The user's trust** in redaction: hidden content must really be gone from exports.

### Threats and mitigations

| Threat | Mitigation |
|---|---|
| Exfiltration of screenshots or metadata | No servers, no analytics, no telemetry. The CSP sets `connect-src 'self' blob: data:` for every extension page and the service worker, so even a bug cannot send data over the network. Tested in `tests/e2e/privacy.spec.ts`: `fetch`, `sendBeacon`, and remote images are blocked. |
| Remote code execution / supply-chain injection | `script-src 'self'`; no remote scripts, `eval`, or `new Function`. All dependencies are bundled at build time and the font is bundled locally. No WASM (so no `'wasm-unsafe-eval'`). |
| Over-broad access to websites | No host permissions. Access to a tab comes only from `activeTab`, granted when the user invokes FrameShot. The capture script is injected on demand, never declared as an always-on content script. |
| Malicious pages tampering with the capture UI | Overlays live in a **closed** shadow root attached to `<html>`, so page scripts cannot reach inside. They are styled with CSSOM `setProperty(..., 'important')` (immune to page CSS and to page CSP), and text is only ever set via `textContent`. |
| Malicious pages forging messages | The agent runs in Chrome's isolated world. The service worker ignores messages whose `sender.id` is not FrameShot, and the agent ignores non-`agent.*` messages and messages from other extensions. A selection is accepted only if its session id matches the pending pick stored in `chrome.storage.session` **and** it comes from the same tab. |
| Pages reading or altering FrameShot's references to elements | Elements are tracked by random, unguessable tokens kept in the isolated world, never by selectors derived from page content. |
| Leaving pages broken after a capture | All temporary changes are data attributes plus a USER-origin stylesheet, removed with the identical CSS string. Scroll positions are restored. A 30 s watchdog and a `pagehide` handler restore the page if the service worker disappears. E2E tests compare `outerHTML` before and after. |
| Untrusted data rendered in Studio | Page titles, URLs, and names are rendered as React text (escaped). Only `http:`/`https:` URLs are rendered as links, with `rel="noopener noreferrer"`. No `dangerouslySetInnerHTML` is used. |
| Corrupted or hostile stored data | Settings pass through `sanitizeSettings` (type checks, clamping, enum validation). Editor documents pass through `isValidDoc`. Composer settings pass through `sanitizeComposer`. Download folders are sanitized to safe relative paths (no `..`, no reserved characters). Filenames are sanitized for all major operating systems. |
| Redaction not really removing data | Export flattening uses `getImageData` → process → `putImageData`, which **replaces** pixels. Redaction output is fully opaque. E2E tests decode the exported PNG, JPEG, WebP, and PDF files and the clipboard image, and confirm the redacted region contains only the redaction colour. |
| Weak redaction methods | The UI warns that blur and pixelation can sometimes be reversed and recommends solid redaction for confidential data. Defaults use strong settings (blur radius 14, pixel blocks 14 px). |
| Logging of sensitive content | FrameShot does not log page content, screenshots, or URLs. |

## Content Security Policy

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:;
font-src 'self'; connect-src 'self' blob: data:; media-src 'self' blob: data:; worker-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'
```

`style-src 'unsafe-inline'` is kept for UI library inline styles. It does not allow script execution.

## Permissions

`activeTab`, `scripting`, `storage`, `unlimitedStorage`, `downloads`, `contextMenus`. See [STORE_LISTING.md](STORE_LISTING.md) for the justification of each.

## Test builds

`npm run build:e2e` produces a **test-only** build with `host_permissions: ["<all_urls>"]` and test hooks (`__frameshotTest`, `__frameshotEditor`), so automation can run without a real toolbar click. These are gated by the compile-time constant `__FRAMESHOT_E2E__` and are absent from production builds. Never distribute the E2E build.

## Known limitations

- Images on the clipboard and in your Downloads folder are outside FrameShot's control once you export them.
- The local library keeps the **original** capture for non-destructive editing. Use **Apply edits permanently** to remove hidden content from the library copy.
- Anyone with access to your browser profile can open the FrameShot library, as with any locally stored browser data.
