/**
 * Service worker wiring. All listeners are registered synchronously at startup
 * (MV3 requirement) and no state is assumed to survive a restart: anything a
 * later event needs is kept in chrome.storage.session or IndexedDB.
 */
import { errorMessage, fail, ok, STATUS_PORT, type BgRequest, type Result } from '../core/messages';
import { friendlyCaptureError } from '../core/restricted';
import type { CaptureMode } from '../core/types';
import {
  CaptureError,
  cancelCapture,
  onEscape,
  onPickCancelled,
  onSelection,
  startCapture,
  stopCapture,
} from './capture-session';
import { getStatus, registerStatusPort, restoreStatus, setStatus } from './status';

const MENU_ROOT = 'frameshot';
const MENU_ITEMS: { id: string; title: string; mode: CaptureMode }[] = [
  { id: 'frameshot-visible', title: 'Capture visible area', mode: 'visible' },
  { id: 'frameshot-full', title: 'Capture full page', mode: 'full' },
  { id: 'frameshot-area', title: 'Capture selected area', mode: 'area' },
  { id: 'frameshot-element', title: 'Capture an element', mode: 'element' },
  { id: 'frameshot-scrollable', title: 'Capture a scrolling area', mode: 'scrollable' },
];

const COMMAND_MODES: Record<string, CaptureMode> = {
  'capture-visible': 'visible',
  'capture-full': 'full',
  'capture-area': 'area',
  'capture-element': 'element',
};

export async function openStudio(route = '/'): Promise<number | undefined> {
  const base = chrome.runtime.getURL('/studio.html');
  const url = `${base}#${route.startsWith('/') ? route : `/${route}`}`;
  // Re-use an open Studio tab for the library to avoid tab clutter.
  const existing = (await chrome.tabs.query({ url: `${base}*` }).catch(() => [])) as chrome.tabs.Tab[];
  const reusable = route === '/' ? existing[0] : undefined;
  if (reusable?.id !== undefined) {
    await chrome.tabs.update(reusable.id, { active: true, url });
    if (reusable.windowId !== undefined) await chrome.windows.update(reusable.windowId, { focused: true }).catch(() => {});
    return reusable.id;
  }
  const tab = await chrome.tabs.create({ url });
  return tab.id;
}

async function beginCapture(mode: CaptureMode, tabId: number | undefined, delayMs?: number): Promise<void> {
  if (tabId === undefined) throw new CaptureError('There is no tab to capture.', 'no-tab');
  await startCapture({ tabId, mode, delayMs });
}

function reportStartError(err: unknown, mode: CaptureMode): string {
  const code = err instanceof CaptureError ? err.code : 'unknown';
  const message = friendlyCaptureError(errorMessage(err));
  // A "busy" error must not overwrite the status of the capture in progress.
  if (code !== 'busy') setStatus({ phase: 'error', mode, errorCode: code, message });
  return message;
}

async function handleMessage(msg: BgRequest, sender: chrome.runtime.MessageSender): Promise<Result<unknown>> {
  switch (msg.kind) {
    case 'capture.start': {
      let tabId = msg.tabId;
      if (tabId === undefined) {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tabId = tab?.id;
      }
      try {
        await beginCapture(msg.mode, tabId, msg.delayMs);
        return ok({ started: true });
      } catch (err) {
        const code = err instanceof CaptureError ? err.code : 'unknown';
        return fail(reportStartError(err, msg.mode), code);
      }
    }
    case 'capture.cancel':
      return ok({ cancelled: cancelCapture() });
    case 'capture.stop':
      return ok({ stopping: stopCapture() });
    case 'capture.status':
      return ok(getStatus());
    case 'studio.open':
      return ok({ tabId: await openStudio(msg.route) });
    case 'agent.selection':
      return ok({ accepted: await onSelection(msg.session, msg.selection, sender.tab?.id) });
    case 'agent.cancelled':
      await onPickCancelled(msg.session);
      return ok({ acknowledged: true });
    case 'agent.escape':
      onEscape(msg.session);
      return ok({ acknowledged: true });
    default:
      return fail('Unknown request.');
  }
}

function createMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ROOT, title: 'FrameShot', contexts: ['page', 'frame', 'selection', 'image', 'link'] });
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create({ id: item.id, parentId: MENU_ROOT, title: item.title, contexts: ['page', 'frame', 'selection', 'image', 'link'] });
    }
    chrome.contextMenus.create({ id: 'frameshot-sep', parentId: MENU_ROOT, type: 'separator', contexts: ['page', 'frame', 'selection', 'image', 'link'] });
    chrome.contextMenus.create({ id: 'frameshot-library', parentId: MENU_ROOT, title: 'Open screenshot library', contexts: ['page', 'frame', 'selection', 'image', 'link'] });
  });
}

export async function handleCommand(command: string, tab?: chrome.tabs.Tab): Promise<void> {
  if (command === 'open-studio' || command === 'open-library') {
    await openStudio('/');
    return;
  }
  if (command === 'cancel-capture') {
    cancelCapture();
    return;
  }
  const mode = COMMAND_MODES[command];
  if (!mode) return;
  let tabId = tab?.id;
  if (tabId === undefined) {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tabId = active?.id;
  }
  try {
    await beginCapture(mode, tabId);
  } catch (err) {
    reportStartError(err, mode);
  }
}

export function registerBackground(): void {
  void restoreStatus();

  chrome.runtime.onMessage.addListener((msg: BgRequest, sender, sendResponse) => {
    if (!msg || typeof msg.kind !== 'string') return false;
    // Only our own extension contexts (pages, SW, and our injected agent) may talk to us.
    if (sender.id !== chrome.runtime.id) return false;
    handleMessage(msg, sender).then(sendResponse, (err: unknown) => sendResponse(fail(errorMessage(err))));
    return true;
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === STATUS_PORT) registerStatusPort(port);
  });

  chrome.commands.onCommand.addListener((command, tab) => {
    void handleCommand(command, tab);
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'frameshot-library') {
      void openStudio('/');
      return;
    }
    const item = MENU_ITEMS.find((m) => m.id === info.menuItemId);
    if (!item) return;
    beginCapture(item.mode, tab?.id).catch((err) => reportStartError(err, item.mode));
  });

  chrome.runtime.onInstalled.addListener((details) => {
    createMenus();
    if (details.reason === 'install' && !__FRAMESHOT_E2E__) void openStudio('/welcome');
  });
  chrome.runtime.onStartup.addListener(createMenus);

  if (__FRAMESHOT_E2E__) {
    // Test-only hook (excluded from production builds by a compile-time flag).
    (globalThis as unknown as Record<string, unknown>).__frameshotTest = {
      start: (tabId: number, mode: CaptureMode, delayMs?: number) => beginCapture(mode, tabId, delayMs),
      status: () => getStatus(),
      command: (command: string, tabId?: number) =>
        handleCommand(command, tabId === undefined ? undefined : ({ id: tabId } as chrome.tabs.Tab)),
      cancel: () => cancelCapture(),
      stop: () => stopCapture(),
    };
  }
}
