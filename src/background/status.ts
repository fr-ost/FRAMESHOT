/**
 * Capture status: broadcast to connected popups (long-lived ports), mirrored
 * to chrome.storage.session (so a re-opened popup sees it), and summarized on
 * the toolbar badge (visible even when the popup is closed).
 */
import { STATUS_PORT, type StatusPortMessage } from '../core/messages';
import type { CaptureStatus } from '../core/types';
import { isActivePhase, onRecorderState, queryRecorder, readRecorderState, RECORDER_STATE_KEY, recorderBadge, type RecorderPublicState } from '../recorder/channel';

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

// The badge shows capture progress first; otherwise a running screen recording.
type Badge = { text: string; color: string };
let captureBadge: Badge | null = null;
let recordingBadge: Badge | null = null;

function applyBadge(): void {
  const b = captureBadge ?? recordingBadge;
  void chrome.action.setBadgeText({ text: b?.text ?? '' }).catch(() => {});
  if (b) {
    void chrome.action.setBadgeBackgroundColor({ color: b.color }).catch(() => {});
    void chrome.action.setBadgeTextColor?.({ color: '#ffffff' })?.catch?.(() => {});
  }
}

function updateBadge(s: CaptureStatus): void {
  clearTimeout(badgeTimer);
  const later = (ms: number) => {
    badgeTimer = setTimeout(() => {
      captureBadge = null;
      applyBadge();
    }, ms);
  };
  switch (s.phase) {
    case 'waiting':
      captureBadge = { text: s.message && /^\d+$/.test(s.message) ? s.message : '…', color: '#4f46e5' };
      break;
    case 'preparing':
    case 'loading':
    case 'stitching':
    case 'saving':
      captureBadge = { text: '…', color: '#4f46e5' };
      break;
    case 'capturing':
      captureBadge = { text: s.progress !== undefined ? `${Math.min(99, Math.round(s.progress * 100))}%` : '…', color: '#4f46e5' };
      break;
    case 'done':
      captureBadge = { text: '✓', color: '#15803d' };
      later(2500);
      break;
    case 'error':
      captureBadge = { text: '!', color: '#dc2626' };
      later(6000);
      break;
    default:
      captureBadge = null;
  }
  applyBadge();
}

function setRecordingBadge(state: RecorderPublicState | null): void {
  recordingBadge = recorderBadge(state);
  applyBadge();
}

/** Mirrors a screen recording (running in a Studio tab) on the toolbar badge. */
export function watchRecorderBadge(): void {
  onRecorderState(setRecordingBadge);
  void readRecorderState().then(async (state) => {
    if (state && isActivePhase(state.phase)) {
      // A recorder page that crashed cannot clear its state: check it is alive.
      const live = await queryRecorder(800);
      if (!live) {
        await chrome.storage.session.remove(RECORDER_STATE_KEY).catch(() => {});
        setRecordingBadge(null);
        return;
      }
      setRecordingBadge(live);
      return;
    }
    setRecordingBadge(null);
  });
}
