/**
 * Rate-limited wrapper around chrome.tabs.captureVisibleTab.
 *
 * Chrome allows at most two calls per second per extension; exceeding it
 * throws MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND. We pace calls and retry
 * with backoff if Chrome still rejects one.
 */
import { MIN_CAPTURE_INTERVAL_MS } from '../core/capture-plan';
import { dataUrlToBlob } from '../imaging/image-io';

let lastCaptureAt = 0;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class TabChangedError extends Error {
  constructor(message = 'The capture stopped because you switched tabs or windows. Keep the tab visible while FrameShot captures it.') {
    super(message);
    this.name = 'TabChangedError';
  }
}

/** Verifies the captured tab is still the visible tab of its window. */
export async function assertTabVisible(tabId: number, windowId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab) throw new Error('The tab was closed before the capture finished.');
  if (!tab.active || tab.windowId !== windowId) throw new TabChangedError();
  const win = await chrome.windows.get(windowId).catch(() => null);
  if (win?.state === 'minimized') {
    throw new TabChangedError('The capture stopped because the window was minimized.');
  }
}

export async function captureFrame(windowId: number): Promise<ImageBitmap> {
  let attempt = 0;
  for (;;) {
    const wait = lastCaptureAt + MIN_CAPTURE_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCaptureAt = Date.now();
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
      const blob = await dataUrlToBlob(dataUrl);
      return await createImageBitmap(blob);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') && attempt < 4) {
        attempt++;
        await sleep(400 * attempt);
        continue;
      }
      throw err;
    }
  }
}
