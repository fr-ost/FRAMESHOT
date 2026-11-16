/**
 * Chrome does not allow extensions to capture or script some pages. Detecting
 * them up front lets us show an honest message instead of a confusing error.
 */
/**
 * Browser pages where Chrome lets FrameShot take a screenshot of the screen
 * (captureVisibleTab, granted by activeTab when the user starts the capture)
 * but never lets it run a script: other extensions' pages, chrome:// pages and
 * the like. Full page, area, element and scrolling-panel captures need a script
 * on the page, so on these pages FrameShot saves what is on screen instead and
 * says why.
 */
const SCREEN_ONLY_PROTOCOLS = [
  'chrome:',
  'chrome-extension:',
  'chrome-search:',
  'chrome-untrusted:',
  'devtools:',
  'edge:',
  'brave:',
  'opera:',
  'vivaldi:',
  'about:',
  'view-source:',
];

/** Pages Chrome does not let any extension capture. */
const BLOCKED_PROTOCOLS = ['javascript:'];
const BLOCKED_HOSTS = ['chrome.google.com', 'chromewebstore.google.com', 'microsoftedge.microsoft.com'];

export type PageKind = 'normal' | 'screen-only' | 'blocked';

export function pageKind(url: string | undefined): PageKind {
  if (!url) return 'normal'; // Unknown: let the capture attempt find out.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'normal';
  }
  if (BLOCKED_PROTOCOLS.includes(parsed.protocol)) return 'blocked';
  if (SCREEN_ONLY_PROTOCOLS.includes(parsed.protocol)) return 'screen-only';
  if (parsed.hostname === 'chrome.google.com' && !parsed.pathname.startsWith('/webstore')) return 'normal';
  if (BLOCKED_HOSTS.includes(parsed.hostname)) return 'blocked';
  return 'normal';
}

export type PageAccess = { allowed: true } | { allowed: false; reason: string };

export function checkPageAccess(url: string | undefined): PageAccess {
  if (pageKind(url) !== 'blocked') return { allowed: true };
  return { allowed: false, reason: 'Chrome does not allow extensions to capture the Web Store.' };
}

/** Shown on a capture that fell back to the visible part of a browser page. */
export const SCREEN_ONLY_NOTE =
  'Chrome does not let extensions scroll or select on this page (another extension’s page or a browser page), so FrameShot saved what was on screen. You can crop it in the editor.';

/** True when a scripting error means Chrome protects the page from scripts (but may still allow a screenshot). */
export function isScriptBlockedError(raw: string): boolean {
  const m = raw.toLowerCase();
  return (
    m.includes('cannot access a chrome') ||
    m.includes('chrome-extension://') ||
    m.includes('cannot be scripted') ||
    m.includes('cannot access contents of') ||
    m.includes('cannot access a chrome:// url') ||
    m.includes('of different extension')
  );
}

export function domainOf(url: string | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return 'local file';
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Only http(s) URLs are ever rendered as clickable links in the UI. */
export function isSafeLink(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const PROTECTED_PAGE_MESSAGE =
  'Chrome does not allow extensions to capture this page. The Chrome Web Store and some built-in pages are protected.';

/**
 * Converts raw Chrome API errors into user-facing explanations. `urlKnown`
 * tells whether Chrome exposed the tab URL to us: when FrameShot is invoked on
 * a normal page the URL is visible, so a hidden URL plus a permission error
 * means the page is protected by Chrome.
 */
export function friendlyCaptureError(raw: string, urlKnown = true): string {
  const m = raw.toLowerCase();
  if (!urlKnown && (m.includes('activetab') || m.includes('not been invoked') || m.includes('cannot access'))) {
    return PROTECTED_PAGE_MESSAGE;
  }
  if (m.includes('max_capture_visible_tab_calls_per_second')) {
    return 'Chrome limited how fast screenshots can be taken. Please try again.';
  }
  if (m.includes('cannot access') || m.includes('cannot be scripted') || m.includes('extensions gallery')) {
    return PROTECTED_PAGE_MESSAGE;
  }
  if (m.includes('activetab') || m.includes('permission') || m.includes('not been invoked')) {
    return 'FrameShot needs you to start the capture from the toolbar button, the right-click menu, or a keyboard shortcut on this tab.';
  }
  if (m.includes('file://') || m.includes('file:')) {
    return 'To capture local files, enable "Allow access to file URLs" for FrameShot in chrome://extensions.';
  }
  if (m.includes('no tab with id') || m.includes('tab was closed')) {
    return 'The tab was closed before the capture finished.';
  }
  if (m.includes('receiving end does not exist') || m.includes('message port closed')) {
    return 'The page changed or reloaded during capture. Please try again.';
  }
  return raw;
}
