/**
 * Temporary CSS applied to a page during multi-frame captures. It is injected
 * with chrome.scripting.insertCSS (origin USER, immune to page CSP) and
 * removed with removeCSS using the exact same string afterwards.
 *
 * Elements are targeted through data attributes set by the content agent, so
 * removing the attributes plus the stylesheet fully restores the page.
 */
export const ATTR_HIDE = 'data-frameora-hide';
export const ATTR_UNSTICK = 'data-frameora-unstick';

/** Always applied during multi-frame captures. */
export const CAPTURE_CSS = `
html, body { scroll-behavior: auto !important; }
*, *::before, *::after { scroll-snap-type: none !important; }
[${ATTR_UNSTICK}] { position: relative !important; top: auto !important; bottom: auto !important; left: auto !important; right: auto !important; }
[${ATTR_HIDE}] { visibility: hidden !important; opacity: 0 !important; transition: none !important; animation: none !important; }
`;

/** Optional: finish CSS transitions/animations instantly so frames match. */
export const FREEZE_CSS = `
*, *::before, *::after {
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  caret-color: transparent !important;
}
`;
