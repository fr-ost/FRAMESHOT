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
  abandonPendingPick,
  cancelCapture,
  onEscape,
  onPickCancelled,
  onSelection,
  startCapture,
  stopCapture,
} from './capture-session';
import { initReviewState } from '../core/review';
import { askStudioToOpen, findStudioPages, isLibraryRoute, isRecorderRoute, type StudioPresence } from '../core/studio-channel';
import { isActivePhase, queryRecorder, sendRecorderCommand } from '../recorder/channel';
import { playBackgroundSound } from './sound';
import { getStatus, registerStatusPort, restoreStatus, setStatus, watchRecorderBadge } from './status';

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
  const path = route.startsWith('/') ? route : `/${route}`;
  const url = `${base}#${path}`;
  const focus = async (page: StudioPresence) => {
    await chrome.tabs.update(page.tabId, { active: true }).catch(() => {});
    if (page.windowId !== undefined) await chrome.windows.update(page.windowId, { focused: true }).catch(() => {});
    return page.tabId;
  };
  if (path === '/' || path === '/record') {
    const pages = await findStudioPages();
    if (path === '/record') {
      // One recorder: bring the recording (or an open recorder) forward.
      const target = pages.find((p) => p.recording) ?? pages.find((p) => isRecorderRoute(p.route));
      if (target) {
        if (!isRecorderRoute(target.route)) askStudioToOpen(target.tabId, path);
        return focus(target);
      }
    } else {
      // Re-use an open library (or settings/welcome) tab to avoid tab clutter;
      // never take over a tab where someone is editing, composing or watching.
      const target = pages.find((p) => isLibraryRoute(p.route)) ?? pages.find((p) => !p.recording && /^#\/(settings|welcome)\b/.test(p.route));
      if (target) {
        if (!isLibraryRoute(target.route)) askStudioToOpen(target.tabId, path);
        return focus(target);
      }
    }
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

/** E2E builds only: sounds the offscreen document reports having played. */
const testSounds: { name: string; state: string }[] = [];

async function handleMessage(msg: BgRequest, sender: chrome.runtime.MessageSender): Promise<Result<unknown>> {
  if (__FRAMESHOT_E2E__ && (msg as { kind: string }).kind === 'test.sound') {
    const m = msg as unknown as { name: string; state: string };
    testSounds.push({ name: m.name, state: m.state });
    return ok({ recorded: true });
  }
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
    chrome.contextMenus.create({ id: 'frameshot-record', parentId: MENU_ROOT, title: 'Record screen…', contexts: ['page', 'frame', 'selection', 'image', 'link'] });
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
  if (command === 'toggle-recording') {
    const live = await queryRecorder(500);
    // Recording (or counting down): stop. Otherwise open the recorder to start one.
    if (live && isActivePhase(live.phase)) sendRecorderCommand('stop');
    else await openStudio('/record');
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
  watchRecorderBadge();

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
    if (info.menuItemId === 'frameshot-record') {
      void openStudio('/record');
      return;
    }
    const item = MENU_ITEMS.find((m) => m.id === info.menuItemId);
    if (!item) return;
    beginCapture(item.mode, tab?.id).catch((err) => reportStartError(err, item.mode));
  });

  // A pending area/element pick ends if its tab closes or loads a new page.
  chrome.tabs.onRemoved.addListener((tabId) => {
    void abandonPendingPick(tabId);
  });
  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === 'loading') void abandonPendingPick(tabId);
  });

  chrome.runtime.onInstalled.addListener((details) => {
    createMenus();
    // Starts the clock for the (rare, polite) review prompt; keeps existing state on updates.
    void initReviewState();
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
      sounds: () => [...testSounds],
      playSound: (name: string) => playBackgroundSound(name as never),
    };
  }
}
