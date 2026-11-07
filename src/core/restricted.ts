/**
 * Chrome does not allow extensions to capture or script some pages. Detecting
 * them up front lets us show an honest message instead of a confusing error.
 */
const RESTRICTED_PROTOCOLS = [
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
  'javascript:',
];

const RESTRICTED_HOSTS = ['chrome.google.com', 'chromewebstore.google.com', 'microsoftedge.microsoft.com'];

export type PageAccess = { allowed: true } | { allowed: false; reason: string };

export function checkPageAccess(url: string | undefined): PageAccess {
  if (!url) return { allowed: true }; // Unknown: let the capture attempt report precisely.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: true };
  }
  if (RESTRICTED_PROTOCOLS.includes(parsed.protocol)) {
    return { allowed: false, reason: 'Chrome does not allow extensions to capture browser pages like this one.' };
  }
  if (parsed.hostname === 'chrome.google.com' && !parsed.pathname.startsWith('/webstore')) return { allowed: true };
  if (RESTRICTED_HOSTS.includes(parsed.hostname)) {
    return { allowed: false, reason: 'Chrome does not allow extensions to capture the Web Store.' };
  }
  return { allowed: true };
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
  'Chrome does not allow extensions to capture this page. Browser pages (chrome://), the Chrome Web Store, and some built-in pages are protected.';

/**
 * Converts raw Chrome API errors into user-facing explanations. `urlKnown`
 * tells whether Chrome exposed the tab URL to us: when Frameora is invoked on
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
    return 'Frameora needs you to start the capture from the toolbar button, the right-click menu, or a keyboard shortcut on this tab.';
  }
  if (m.includes('file://') || m.includes('file:')) {
    return 'To capture local files, enable "Allow access to file URLs" for Frameora in chrome://extensions.';
  }
  if (m.includes('no tab with id') || m.includes('tab was closed')) {
    return 'The tab was closed before the capture finished.';
  }
  if (m.includes('receiving end does not exist') || m.includes('message port closed')) {
    return 'The page changed or reloaded during capture. Please try again.';
  }
  return raw;
}
