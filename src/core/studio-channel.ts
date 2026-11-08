/**
 * Finding open Studio tabs without the "tabs" permission.
 *
 * Chrome hides tab URLs (even of the extension's own pages) from extensions
 * without the "tabs" permission, and FrameShot does not ask for it. Instead,
 * each Studio page answers a "who is there?" question on a BroadcastChannel
 * with its own tab id (from chrome.tabs.getCurrent, which needs no
 * permission) and the screen it shows. The service worker uses that to bring
 * an existing tab forward instead of opening duplicates.
 */

export const STUDIO_CHANNEL = 'frameshot-studio';

export interface StudioPresence {
  tabId: number;
  windowId?: number;
  /** The page's hash route, e.g. "#/record". */
  route: string;
  /** True while this page is running a screen recording. */
  recording: boolean;
}

export type StudioMessage =
  | { type: 'who'; nonce: string }
  | ({ type: 'here'; nonce: string } & StudioPresence)
  | { type: 'open'; tabId: number; route: string };

/** Collects the Studio pages that answer within `timeoutMs`. */
export function findStudioPages(timeoutMs = 300): Promise<StudioPresence[]> {
  if (typeof BroadcastChannel === 'undefined') return Promise.resolve([]);
  const ch = new BroadcastChannel(STUDIO_CHANNEL);
  const nonce = Math.random().toString(36).slice(2);
  const found = new Map<number, StudioPresence>();
  return new Promise((resolve) => {
    ch.onmessage = (e: MessageEvent<StudioMessage>) => {
      const m = e.data;
      if (m?.type === 'here' && m.nonce === nonce && typeof m.tabId === 'number') {
        found.set(m.tabId, { tabId: m.tabId, windowId: m.windowId, route: m.route, recording: m.recording });
      }
    };
    ch.postMessage({ type: 'who', nonce } satisfies StudioMessage);
    setTimeout(() => {
      ch.close();
      resolve([...found.values()]);
    }, timeoutMs);
  });
}

/** Asks one Studio page to show `route` (in-app navigation, no reload). */
export function askStudioToOpen(tabId: number, route: string): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const ch = new BroadcastChannel(STUDIO_CHANNEL);
  ch.postMessage({ type: 'open', tabId, route } satisfies StudioMessage);
  setTimeout(() => ch.close(), 50);
}

/** Route helpers shared by the page and the service worker. */
export function isRecorderRoute(route: string): boolean {
  return /^#?\/record(\b|$)/.test(route);
}

export function isLibraryRoute(route: string): boolean {
  return route === '' || route === '#' || route === '#/' || route === '/';
}
