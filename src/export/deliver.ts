/**
 * Delivering exports to the user: downloads (reported as saved only once
 * Chrome confirms the download completed) and clipboard copy.
 */

export class DownloadCancelledError extends Error {
  constructor() {
    super('Download cancelled.');
    this.name = 'DownloadCancelledError';
  }
}

export interface DownloadResult {
  id: number;
  /** Absolute path chosen by Chrome, when available. */
  path: string;
}

export async function downloadBlob(blob: Blob, filename: string, opts: { saveAs?: boolean } = {}): Promise<DownloadResult> {
  const url = URL.createObjectURL(blob);
  try {
    const id = await chrome.downloads.download({ url, filename, saveAs: !!opts.saveAs, conflictAction: 'uniquify' });
    if (id === undefined) throw new Error(chrome.runtime.lastError?.message || 'The download could not be started.');
    return await waitForDownload(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/USER_CANCELED|cancel/i.test(message)) throw new DownloadCancelledError();
    if (/invalid filename/i.test(message)) throw new Error('The file name contains characters Chrome does not allow. Adjust the file name template in Settings.');
    throw new Error(message || 'The download failed.');
  } finally {
    // Chrome has read the blob once the download finished (or failed).
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function waitForDownload(id: number): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    const check = (item: chrome.downloads.DownloadItem | undefined) => {
      if (!item) return false;
      if (item.state === 'complete') {
        cleanup();
        resolve({ id, path: item.filename });
        return true;
      }
      if (item.state === 'interrupted') {
        cleanup();
        if (item.error === 'USER_CANCELED') reject(new DownloadCancelledError());
        else reject(new Error(`The download failed (${item.error ?? 'unknown error'}).`));
        return true;
      }
      return false;
    };
    const listener = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== id) return;
      if (delta.state?.current === 'complete' || delta.state?.current === 'interrupted' || delta.error) {
        void chrome.downloads.search({ id }).then(([item]) => check(item));
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('The download is taking longer than expected. Check Chrome’s downloads page.'));
    }, 120000);
    const cleanup = () => {
      clearTimeout(timer);
      chrome.downloads.onChanged.removeListener(listener);
    };
    chrome.downloads.onChanged.addListener(listener);
    void chrome.downloads.search({ id }).then(([item]) => check(item));
  });
}

export function displayPath(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts.slice(-2).join('/');
}

/** Copies an image to the clipboard as PNG (the only image type browsers accept). */
export async function copyImageBlob(blob: Blob | Promise<Blob>): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Your browser does not support copying images to the clipboard.');
  }
  const pngPromise = Promise.resolve(blob).then(async (b) => (b.type === 'image/png' ? b : toPng(b)));
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngPromise })]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/focus/i.test(message)) throw new Error('Click inside the FrameShot window and try copying again.');
    if (/denied|not allowed|permission/i.test(message)) throw new Error('Clipboard access was blocked by the browser.');
    throw new Error(`Could not copy the image: ${message}`);
  }
}

async function toPng(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  return c.convertToBlob({ type: 'image/png' });
}
