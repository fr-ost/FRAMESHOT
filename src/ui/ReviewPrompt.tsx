/**
 * The review prompt: a small, friendly card shown after real success (see
 * core/review.ts for when). Every user sees the same choices, and the Chrome
 * Web Store opens only if they click.
 */
import { Heart, Star, X } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hasStoreListing, loadReviewState, markReviewAsked, markReviewDone, reviewUrl, shouldAskForReview } from '../core/review';
import { cx } from './primitives';

export interface ReviewPromptControls {
  visible: boolean;
  rate(): void;
  later(): void;
  never(): void;
}

/** Shows the prompt (once per mount) when `enabled` and the rules allow it. */
export function useReviewPrompt(enabled: boolean, delayMs = 0): ReviewPromptControls {
  const [visible, setVisible] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (!enabled || asked.current) return;
    let alive = true;
    const timer = setTimeout(() => {
      void (async () => {
        const [state, listed] = await Promise.all([loadReviewState(), hasStoreListing()]);
        if (!alive || asked.current || !listed || !shouldAskForReview(state)) return;
        asked.current = true;
        // Counting the impression also pauses asking (here and in other views).
        await markReviewAsked();
        if (alive) setVisible(true);
      })();
    }, delayMs);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [enabled, delayMs]);

  return {
    visible,
    rate() {
      void markReviewDone();
      void chrome.tabs.create({ url: reviewUrl() });
      setVisible(false);
    },
    later() {
      setVisible(false);
    },
    never() {
      void markReviewDone();
      setVisible(false);
    },
  };
}

function Stars({ size = 18 }: { size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill="currentColor" className="fr-star-pop text-amber-400 drop-shadow-[0_1px_2px_rgb(245_158_11/0.35)]" style={{ animationDelay: `${120 + i * 70}ms` } as CSSProperties} />
      ))}
    </span>
  );
}

/**
 * `stacked` fits the popup; `inline` sits at the top of a Studio screen.
 */
export function ReviewCard({ controls, layout = 'inline' }: { controls: ReviewPromptControls; layout?: 'inline' | 'stacked' }) {
  if (!controls.visible) return null;
  const text = (
    <>
      <p className="flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-fg">
        Enjoying FrameShot? <Heart size={14} className="text-rose-500" fill="currentColor" aria-hidden />
      </p>
      <p className="mt-0.5 text-[12.5px] leading-snug text-fg-muted">
        It’s free forever, with no ads or tracking. If it helps you, a rating on the Chrome Web Store helps more people find it. It only takes a moment.
      </p>
    </>
  );
  const actions = (
    <div className={cx('flex flex-wrap items-center gap-x-2 gap-y-1', layout === 'stacked' && 'mt-3')}>
      <button type="button" onClick={controls.rate} data-testid="review-rate" className="fr-btn-primary fr-press inline-flex h-9 items-center gap-1.5 rounded-[11px] px-3.5 text-[13px] font-semibold">
        <Star size={14} fill="currentColor" /> Rate FrameShot
      </button>
      <button type="button" onClick={controls.later} data-testid="review-later" className="fr-press inline-flex h-9 items-center rounded-[11px] px-3 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
        Not now
      </button>
      <button type="button" onClick={controls.never} data-testid="review-never" className="px-1 text-[12px] text-fg-subtle underline-offset-2 hover:text-fg-muted hover:underline">
        Don’t ask again
      </button>
    </div>
  );
  return (
    <section
      aria-label="Rate FrameShot"
      data-testid="review-card"
      className={cx('fr-card relative overflow-hidden', layout === 'stacked' ? 'p-4' : 'flex flex-wrap items-center gap-x-5 gap-y-3 p-4 pr-10')}
      style={{ animation: 'fr-rise 520ms var(--fr-ease) both' }}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
      <button type="button" aria-label="Close" title="Close" onClick={controls.later} className="fr-press absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-[9px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg">
        <X size={14} />
      </button>
      {layout === 'stacked' ? (
        <>
          <Stars size={17} />
          <div className="mt-2 pr-5">{text}</div>
          {actions}
        </>
      ) : (
        <>
          <Stars size={20} />
          <div className="min-w-[220px] flex-1">{text}</div>
          {actions}
        </>
      )}
    </section>
  );
}
