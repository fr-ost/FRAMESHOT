/**
 * Typed message contracts between extension contexts.
 *
 *  popup / studio / command ──BgRequest──▶ service worker
 *  service worker ──AgentRequest──▶ content agent (chrome.tabs.sendMessage)
 *  content agent ──AgentEvent──▶ service worker (chrome.runtime.sendMessage)
 *  service worker ──StatusPortMessage──▶ popup (long-lived Port)
 *
 * Large image payloads never travel through messaging: the service worker
 * writes capture results to IndexedDB and only passes ids around.
 */
import type { CaptureErrorCode, CaptureMode, CaptureStatus, Rect } from './types';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: CaptureErrorCode };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: string, code?: CaptureErrorCode): Result<never> => ({ ok: false, error, code });

// ── Requests handled by the service worker ─────────────────────────────────

export type BgRequest =
  | { kind: 'capture.start'; mode: CaptureMode; tabId?: number; delayMs?: number }
  | { kind: 'capture.cancel' }
  | { kind: 'capture.stop' }
  | { kind: 'capture.status' }
  | { kind: 'studio.open'; route?: string }
  | AgentEvent;

export interface BgResponses {
  'capture.start': { started: true };
  'capture.cancel': { cancelled: boolean };
  'capture.stop': { stopping: boolean };
  'capture.status': CaptureStatus;
  'studio.open': { tabId?: number };
  'agent.selection': { accepted: boolean };
  'agent.cancelled': { acknowledged: true };
  'agent.escape': { acknowledged: true };
}

// ── Content agent → service worker events ─────────────────────────────────

export type ScrollerRef = { type: 'window' } | { type: 'element'; token: string };

export type AgentSelection =
  | { type: 'area'; scroller: ScrollerRef; rect: Rect }
  | { type: 'element'; element: string; scroller: ScrollerRef; rect: Rect; label: string }
  | { type: 'scrollable'; element: string; label: string };

export type AgentEvent =
  | { kind: 'agent.selection'; session: string; selection: AgentSelection }
  | { kind: 'agent.cancelled'; session: string }
  | { kind: 'agent.escape'; session: string };

// ── Service worker → content agent requests ──────────────────────────────

export type FixedVisibility = 'all' | 'top' | 'bottom' | 'none';

export interface PrepareOptions {
  /** Convert sticky elements to in-flow positioning (multi-frame captures). */
  unstick: boolean;
  /** Elements that must keep their visibility (the captured element + ancestors). */
  keepElement?: string;
  /** The scroller being captured; it and its ancestors are never hidden. */
  scroller?: ScrollerRef;
}

export interface PageMetrics {
  url: string;
  title: string;
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
  /** The main scroller: window, or an element for app-shell pages. */
  mainScroller: ScrollerRef;
  /** Scroll size of the main scroller's content. */
  scrollWidth: number;
  scrollHeight: number;
  /** Visible window of the main scroller in viewport coordinates. */
  viewport: Rect;
}

/** Geometry of the scroller's visible window after a scroll step. */
export interface FrameGeometry {
  /** Visible window in scroller content coordinates. */
  content: Rect;
  /** Same window in viewport (CSS px) coordinates. */
  viewport: Rect;
  /** Current content size of the scroller (for growth detection). */
  scrollWidth: number;
  scrollHeight: number;
  /** Height of bottom-anchored fixed elements currently shown. */
  bottomFixedHeight: number;
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
}

export interface ScrollerInfo {
  scroller: ScrollerRef;
  scrollWidth: number;
  scrollHeight: number;
  viewport: Rect;
  /** Same visible window, in scroller content coordinates. */
  content: Rect;
  /** Region of interest in scroller content coordinates. */
  region: Rect;
}

export type AgentRequest =
  | { kind: 'agent.ping' }
  | { kind: 'agent.measure' }
  | { kind: 'agent.resolve'; selection: AgentSelection }
  | { kind: 'agent.prepare'; session: string; options: PrepareOptions }
  | { kind: 'agent.preload'; session: string; scroller: ScrollerRef; maxHeight: number }
  | {
      kind: 'agent.scroll';
      session: string;
      scroller: ScrollerRef;
      x: number;
      y: number;
      fixed: FixedVisibility;
      settleMs: number;
    }
  | { kind: 'agent.restore'; session: string }
  | { kind: 'agent.pick'; session: string; mode: 'area' | 'element' | 'scrollable' }
  | { kind: 'agent.cancelPick' };

export interface AgentResponses {
  'agent.ping': { ready: true; version: number };
  'agent.measure': PageMetrics;
  'agent.resolve': ScrollerInfo;
  'agent.prepare': { prepared: true; fixedCount: number; stickyCount: number };
  'agent.preload': { scrollHeight: number; scrollWidth: number; truncated: boolean };
  'agent.scroll': FrameGeometry;
  'agent.restore': { restored: true };
  'agent.pick': { picking: true };
  'agent.cancelPick': { cancelled: true };
}

/** Bump when the agent protocol changes so stale injected agents are replaced. */
export const AGENT_PROTOCOL_VERSION = 1;

// ── Status port ───────────────────────────────────────────────────────────

export const STATUS_PORT = 'frameshot-status';
export type StatusPortMessage = { kind: 'status'; status: CaptureStatus };

// ── Broadcast channel between extension pages and the service worker ─────

export const LIBRARY_CHANNEL = 'frameshot-library';
export type LibraryEvent =
  | { kind: 'items-changed'; ids?: string[] }
  | { kind: 'collections-changed' }
  | { kind: 'cleared' };

// ── Helpers ───────────────────────────────────────────────────────────────

type BgKind = BgRequest['kind'];

/** Send a typed request to the service worker. */
export async function sendToBackground<K extends BgKind>(
  message: Extract<BgRequest, { kind: K }>,
): Promise<Result<BgResponses[K]>> {
  try {
    const response = (await chrome.runtime.sendMessage(message)) as Result<BgResponses[K]> | undefined;
    if (!response) return fail('No response from FrameShot background service.');
    return response;
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}
