/** Small motion helpers: rolling counters and a sliding navigation highlight. */
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from './primitives';

/** A number that rolls in when it changes (not on first render). */
export function AnimatedNumber({ value, className }: { value: number | string; className?: string }) {
  const first = useRef(true);
  const animate = !first.current;
  first.current = false;
  return (
    <span key={String(value)} className={cx('tabular-nums', animate && 'fr-tick', className)}>
      {value}
    </span>
  );
}

/**
 * One highlight behind a vertical list that glides to the active item
 * (any `[aria-current]` inside its parent). Place it as the first child of
 * a `position: relative` list. It moves with a transform, so the list itself
 * never re-lays out.
 */
export function SlidingHighlight({ activeKey }: { activeKey: string }) {
  const self = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ y: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const root = self.current?.parentElement;
    if (!root) return;
    const measure = () => {
      const el = root.querySelector<HTMLElement>('[aria-current]:not([aria-current="false"])');
      setBox(el ? { y: el.getBoundingClientRect().top - root.getBoundingClientRect().top, h: el.offsetHeight } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    // Glide only after the first placement.
    const t = requestAnimationFrame(() => setReady(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(t);
    };
  }, [activeKey]);
  const style: CSSProperties = box ? { transform: `translateY(${box.y}px)`, height: box.h, opacity: 1 } : { opacity: 0, height: 36 };
  if (!ready) style.transition = 'none';
  return <span ref={self} aria-hidden className="fr-slide-hl" style={style} />;
}
