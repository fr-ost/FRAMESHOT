/**
 * Asking for a Chrome Web Store review — politely, rarely, and within the
 * store's rules.
 *
 * Chrome Web Store policy forbids manipulating ratings: no incentives, no
 * asking for a particular star rating, and no "review gating" (sending only
 * happy users to the store). So FrameShot asks everyone the same way, only
 * after they have had real success with it, never in the middle of a task,
 * and at most a few times. Everything here is stored locally; nothing is sent
 * anywhere, and the store page opens only when the user clicks.
 */

export const REVIEW_KEY = 'frameshot.review';

/**
 * The listing's URL slug. The store redirects a wrong slug to the right one,
 * but update this to the published listing's slug once it is live.
 */
export const REVIEW_URL_SLUG = 'frameshot';

export interface ReviewState {
  /** When FrameShot was installed (or first updated to a version that tracks this). */
  installedAt: number;
  /** Captures and recordings saved. */
  successes: number;
  /** How many times the prompt has been shown. */
  asks: number;
  lastAskedAt: number;
  /** Not shown again before this time. */
  snoozeUntil: number;
  /** The user rated, or asked not to be asked again. */
  done: boolean;
}

export const REVIEW_RULES = {
  minSuccesses: 5,
  minDaysSinceInstall: 3,
  /** Pause between asks. */
  snoozeDays: 30,
  maxAsks: 3,
} as const;

const DAY = 24 * 60 * 60 * 1000;

export function defaultReviewState(now = Date.now()): ReviewState {
  return { installedAt: now, successes: 0, asks: 0, lastAskedAt: 0, snoozeUntil: 0, done: false };
}

function n(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

export function sanitizeReviewState(input: unknown, now = Date.now()): ReviewState {
  const o = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const d = defaultReviewState(now);
  return {
    installedAt: n(o.installedAt, d.installedAt),
    successes: Math.floor(n(o.successes, 0)),
    asks: Math.floor(n(o.asks, 0)),
    lastAskedAt: n(o.lastAskedAt, 0),
    snoozeUntil: n(o.snoozeUntil, 0),
    done: o.done === true,
  };
}

/** Whether to show the review prompt now. */
export function shouldAskForReview(state: ReviewState, now = Date.now(), rules: { minSuccesses: number; minDaysSinceInstall: number; maxAsks: number } = REVIEW_RULES): boolean {
  if (state.done) return false;
  if (state.asks >= rules.maxAsks) return false;
  if (now < state.snoozeUntil) return false;
  if (state.successes < rules.minSuccesses) return false;
  return now - state.installedAt >= rules.minDaysSinceInstall * DAY;
}

/** The listing's Reviews tab (its item id is this extension's id once published). */
export function reviewUrl(id: string = chrome.runtime.id): string {
  return `https://chromewebstore.google.com/detail/${REVIEW_URL_SLUG}/${id}/reviews`;
}

// ── Persistence (chrome.storage.local, this device only) ──

export async function loadReviewState(): Promise<ReviewState> {
  try {
    const stored = await chrome.storage.local.get(REVIEW_KEY);
    return sanitizeReviewState(stored[REVIEW_KEY]);
  } catch {
    return defaultReviewState();
  }
}

async function update(patch: (s: ReviewState) => Partial<ReviewState>): Promise<ReviewState> {
  const current = await loadReviewState();
  const next = { ...current, ...patch(current) };
  try {
    await chrome.storage.local.set({ [REVIEW_KEY]: next });
  } catch {
    // Best effort: the prompt is optional.
  }
  return next;
}

/** On install (or the first run of a version that tracks this), start the clock. */
export async function initReviewState(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(REVIEW_KEY);
    if (!stored[REVIEW_KEY]) await chrome.storage.local.set({ [REVIEW_KEY]: defaultReviewState() });
  } catch {
    /* ignore */
  }
}

/** A capture or recording was saved. */
export function recordReviewSuccess(): Promise<ReviewState> {
  return update((s) => ({ successes: s.successes + 1 }));
}

/** The prompt was shown: count it and pause asking for a while. */
export function markReviewAsked(now = Date.now()): Promise<ReviewState> {
  return update((s) => ({ asks: s.asks + 1, lastAskedAt: now, snoozeUntil: now + REVIEW_RULES.snoozeDays * DAY }));
}

/** The user chose to rate, or not to be asked again. */
export function markReviewDone(): Promise<ReviewState> {
  return update(() => ({ done: true }));
}

/**
 * Only store installs have a listing to review. (Unpacked or sideloaded
 * copies would open a page that does not exist.) Test builds also count, so
 * the prompt can be tested.
 */
export async function hasStoreListing(): Promise<boolean> {
  try {
    const self = await chrome.management.getSelf();
    return self.installType === 'normal' || (__FRAMESHOT_E2E__ && self.installType === 'development');
  } catch {
    return false;
  }
}
