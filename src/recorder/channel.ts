/**
 * How other extension contexts see and control a recording.
 *
 * The recording itself runs in a Studio page (screen capture needs a page).
 * That page publishes a small public state to chrome.storage.session (read by
 * the popup and by the service worker for the toolbar badge) and answers
 * pings/commands on a BroadcastChannel (same-origin extension pages and the
 * service worker only; nothing leaves the browser).
 */

export const RECORDER_CHANNEL = 'frameshot-recorder';
export const RECORDER_STATE_KEY = 'frameshot.recorder';

export type RecorderPhase = 'idle' | 'acquiring' | 'countdown' | 'recording' | 'paused' | 'stopping' | 'saving' | 'done' | 'error';

/** The part of the recorder state other contexts need (no streams, no blobs). */
export interface RecorderPublicState {
  phase: RecorderPhase;
  sessionId?: string;
  /** Seconds left before recording starts. */
  countdown?: number;
  /** Recorded time up to `since`, excluding pauses. */
  activeMs: number;
  /** Epoch ms when the current uninterrupted stretch began (absent while paused). */
  since?: number;
  hasMic: boolean;
  micMuted: boolean;
  updatedAt: number;
}

export type RecorderCommand = 'pause' | 'resume' | 'stop' | 'discard' | 'toggle-mic' | 'focus';

export type RecorderMessage =
  | { type: 'ping'; nonce: string }
  | { type: 'pong'; nonce: string; state: RecorderPublicState }
  | { type: 'command'; command: RecorderCommand }
  | { type: 'state'; state: RecorderPublicState };

/** Phases in which a recording exists and the recorder page must stay open. */
export const ACTIVE_PHASES: ReadonlySet<RecorderPhase> = new Set(['countdown', 'recording', 'paused', 'stopping', 'saving']);

export function isActivePhase(phase: RecorderPhase | undefined): boolean {
  return !!phase && ACTIVE_PHASES.has(phase);
}

export function elapsedMs(state: Pick<RecorderPublicState, 'activeMs' | 'since'>, now = Date.now()): number {
  return state.activeMs + (state.since ? Math.max(0, now - state.since) : 0);
}

function channel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(RECORDER_CHANNEL);
}

/**
 * Asks whether a recorder page is alive. Resolves with its state, or null when
 * no page answers (no recording, or the page was closed or crashed).
 */
export function queryRecorder(timeoutMs = 400): Promise<RecorderPublicState | null> {
  const ch = channel();
  if (!ch) return Promise.resolve(null);
  const nonce = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const done = (state: RecorderPublicState | null) => {
      clearTimeout(timer);
      ch.close();
      resolve(state);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    ch.onmessage = (e: MessageEvent<RecorderMessage>) => {
      if (e.data?.type === 'pong' && e.data.nonce === nonce) done(e.data.state);
    };
    ch.postMessage({ type: 'ping', nonce } satisfies RecorderMessage);
  });
}

export function sendRecorderCommand(command: RecorderCommand): void {
  const ch = channel();
  if (!ch) return;
  ch.postMessage({ type: 'command', command } satisfies RecorderMessage);
  // Give the message a moment to be dispatched before closing.
  setTimeout(() => ch.close(), 50);
}

export async function readRecorderState(): Promise<RecorderPublicState | null> {
  try {
    const stored = await chrome.storage.session.get(RECORDER_STATE_KEY);
    return (stored[RECORDER_STATE_KEY] as RecorderPublicState | undefined) ?? null;
  } catch {
    return null;
  }
}

export function onRecorderState(listener: (state: RecorderPublicState | null) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'session' && RECORDER_STATE_KEY in changes) listener((changes[RECORDER_STATE_KEY].newValue as RecorderPublicState | undefined) ?? null);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

/** Toolbar badge for a recorder state (null = no recording badge). */
export function recorderBadge(state: RecorderPublicState | null): { text: string; color: string } | null {
  if (!state) return null;
  switch (state.phase) {
    case 'countdown':
      return { text: String(state.countdown ?? ''), color: '#dc2626' };
    case 'recording':
      return { text: 'REC', color: '#dc2626' };
    case 'paused':
      return { text: 'II', color: '#d97706' };
    case 'stopping':
    case 'saving':
      return { text: '…', color: '#dc2626' };
    default:
      return null;
  }
}
