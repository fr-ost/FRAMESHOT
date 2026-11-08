/**
 * Page-wide micro-interactions, installed once per page:
 *  - Pointer spotlight: elements with `.fr-spot` get --mx/--my set to the
 *    mouse position (at most once per frame, only on the hovered element).
 *  - Tap ripple on primary buttons (`.fr-btn-primary`, `.fr-rec-btn`, `[data-ripple]`).
 * Both are pure transform/opacity/custom-property work and skip touch input
 * and reduced-motion users.
 */
let installed = false;

export function installFx(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let frame = 0;
  let target: HTMLElement | null = null;
  let x = 0;
  let y = 0;
  const apply = () => {
    frame = 0;
    if (!target) return;
    const r = target.getBoundingClientRect();
    target.style.setProperty('--mx', `${Math.round(x - r.left)}px`);
    target.style.setProperty('--my', `${Math.round(y - r.top)}px`);
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('.fr-spot') ?? null;
      if (!el) return;
      target = el;
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { passive: true },
  );

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (reduced.matches || e.button !== 0) return;
      const btn = (e.target as Element | null)?.closest?.<HTMLElement>('.fr-btn-primary, .fr-rec-btn, [data-ripple]');
      if (!btn || (btn as HTMLButtonElement).disabled) return;
      const r = btn.getBoundingClientRect();
      const size = Math.hypot(r.width, r.height) * 2;
      const dot = document.createElement('span');
      dot.className = 'fr-ripple';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - r.left}px`;
      dot.style.top = `${e.clientY - r.top}px`;
      btn.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove(), { once: true });
      // Safety net if the animation never runs (e.g. the button is hidden).
      setTimeout(() => dot.remove(), 1200);
    },
    { passive: true },
  );
}
