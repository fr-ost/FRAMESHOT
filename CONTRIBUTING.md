# Contributing to FrameShot

Thanks for helping make FrameShot better. These rules keep the product what it promises to be.

## Non-negotiable principles

1. **Free forever.** No paid features, upsells, feature flags for tiers, watermarks, or usage limits.
2. **Local-first.** No network requests, no analytics or telemetry SDKs, no remote code, no accounts. The CSP (`connect-src 'self' blob: data:`) must not be loosened.
3. **Minimal permissions.** Don't add permissions, especially host permissions, without a written justification. Prefer optional permissions requested at the moment of use.
4. **Honesty.** Never claim success that didn't happen. For example, report downloads as saved only after completion, and never save incomplete captures. Document limitations instead of hiding them.
5. **No dead controls.** Every visible control must do what it says.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

Load `.output/chrome-mv3-dev` (dev) or `.output/chrome-mv3` (after `npm run build`) with **Load unpacked** in `chrome://extensions`.

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md). In short:
- Pure, testable logic goes in `src/core`, `src/imaging`, `src/editor/model`, `src/composer/layout.ts`, `src/export/{pdf,zip}.ts`, and `src/recorder/{formats,webm,gif}.ts`.
- Browser and extension glue lives in `src/background`, `src/content`, `src/db`, and `src/recorder/{recorder,compositor,mixer,channel}.ts`.
- UI lives in `src/app`, `src/library`, `src/editor/ui`, `src/composer`, `src/popup`, `src/settings`, `src/recorder/*Page.tsx`, and `src/ui`.

## Coding guidelines

- TypeScript strict mode; `npm run compile` must pass.
- Keep message types in `src/core/messages.ts`; never pass large images through messaging (use IndexedDB).
- Treat page content as untrusted: in the content agent use CSSOM styling and `textContent` only, and keep UI inside the closed shadow root.
- Validate anything read from storage (`sanitizeSettings`, `isValidDoc`, `sanitizeComposer`).
- Clean up object URLs, listeners, observers, timers, canvases, and page modifications.
- Use design tokens (`bg-surface`, `text-fg-muted`, …) rather than raw colours. Support light and dark themes, keyboard focus, and accessible labels.
- No new runtime dependencies without discussion. Bundle size and auditability matter.

## Tests

```bash
npm test
```

```bash
npm run test:e2e
```

- Add unit tests for any pure logic you change.
- Add or extend E2E tests (`tests/e2e/`) for user-visible behaviour. Prefer pixel-level verification with the band fixtures over screenshot comparisons.
- Never skip, disable, or weaken a test to get a green run. Fix the cause.
- Test hooks must stay behind `__FRAMESHOT_E2E__`.

## Commits and pull requests

- Small, focused commits with descriptive messages.
- Describe user-visible changes and update [CHANGELOG.md](CHANGELOG.md) and [FEATURES.md](FEATURES.md) when relevant.
- PRs must pass type checking, unit tests, and E2E tests.

## Reporting bugs

Include your Chrome version, OS, display scale and zoom, the page or kind of page (if shareable), the capture mode, and the message FrameShot showed. **Never attach screenshots that contain private information.** For security issues see [SECURITY.md](SECURITY.md).
