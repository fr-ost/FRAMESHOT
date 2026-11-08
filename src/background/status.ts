/**
 * Capture status: broadcast to connected popups (long-lived ports), mirrored
 * to chrome.storage.session (so a re-opened popup sees it), and summarized on
 * the toolbar badge (visible even when the popup is closed).
 */
import { STATUS_PORT, type StatusPortMessage } from '../core/messages';
import type { CaptureStatus } from '../core/types';

const ports = new Set<chrome.runtime.Port>();
let current: CaptureStatus = { phase: 'idle', updatedAt: Date.now() };
let badgeTimer: ReturnType<typeof setTimeout> | undefined;

export function registerStatusPort(port: chrome.runtime.Port): void {
  if (port.name !== STATUS_PORT) return;
  ports.add(port);
  port.onDisconnect.addListener(() => ports.delete(port));
  safePost(port, { kind: 'status', status: current });
}

function safePost(port: chrome.runtime.Port, msg: StatusPortMessage): void {
  try {
    port.postMessage(msg);
  } catch {
    ports.delete(port);
  }
}

export function getStatus(): CaptureStatus {
  return current;
}

export async function restoreStatus(): Promise<void> {
  try {
    const stored = await chrome.storage.session.get('frameshot.status');
    const s = stored['frameshot.status'] as CaptureStatus | undefined;
    if (s && s.updatedAt > current.updatedAt) {
      // A capture cannot survive a service-worker restart; report it honestly.
      const busy = ['waiting', 'preparing', 'loading', 'capturing', 'stitching', 'saving'].includes(s.phase);
      current = busy
        ? { phase: 'error', message: 'The capture was interrupted. Please try again.', errorCode: 'unknown', updatedAt: Date.now() }
        : s;
    }
  } catch {
    // session storage unavailable; keep in-memory status
  }
}

export function setStatus(patch: Omit<CaptureStatus, 'updatedAt'>): void {
  current = { ...patch, updatedAt: Date.now() };
  for (const port of ports) safePost(port, { kind: 'status', status: current });
  void chrome.storage.session.set({ 'frameshot.status': current }).catch(() => {});
  updateBadge(current);
}

function updateBadge(s: CaptureStatus): void {
  clearTimeout(badgeTimer);
  const set = (text: string, color?: string) => {
    void chrome.action.setBadgeText({ text }).catch(() => {});
    if (color) void chrome.action.setBadgeBackgroundColor({ color }).catch(() => {});
    if (text) void chrome.action.setBadgeTextColor?.({ color: '#ffffff' })?.catch?.(() => {});
  };
  switch (s.phase) {
    case 'waiting':
      set(s.message && /^\d+$/.test(s.message) ? s.message : '…', '#4f46e5');
      break;
    case 'selecting':
      set('', undefined);
      break;
    case 'preparing':
    case 'loading':
    case 'stitching':
    case 'saving':
      set('…', '#4f46e5');
      break;
    case 'capturing':
      set(s.progress !== undefined ? `${Math.min(99, Math.round(s.progress * 100))}%` : '…', '#4f46e5');
      break;
    case 'done':
      set('✓', '#15803d');
      badgeTimer = setTimeout(() => set(''), 2500);
      break;
    case 'error':
      set('!', '#dc2626');
      badgeTimer = setTimeout(() => set(''), 6000);
      break;
    default:
      set('');
  }
}
