/**
 * In-page selection UI (area selection, element picker, scrollable picker).
 *
 * Isolation & safety:
 *  - Rendered inside a *closed* shadow root on a host attached to <html>, so
 *    page CSS cannot style it and page scripts cannot reach into it.
 *  - Styled exclusively via CSSOM (`el.style.setProperty`), which page CSP
 *    cannot block, unlike <style> elements or style attributes.
 *  - Text is only ever set with `textContent` (never innerHTML).
 *  - Removed completely (and given two frames to repaint) before any capture.
 */
import type { Rect } from '../core/types';

const BRAND = '#4f46e5';
const BRAND_LIGHT = '#818cf8';
const Z = '2147483647';

type Styles = Record<string, string>;

function css(el: HTMLElement, styles: Styles): HTMLElement {
  for (const [k, v] of Object.entries(styles)) el.style.setProperty(k, v, 'important');
  return el;
}

function el(tag: string, styles: Styles = {}, text?: string): HTMLElement {
  const node = document.createElement(tag);
  css(node, { 'box-sizing': 'border-box', margin: '0', ...styles });
  if (text !== undefined) node.textContent = text;
  return node;
}

const FONT = "13px/1.35 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function pill(text: string): HTMLElement {
  return el(
    'div',
    {
      position: 'fixed',
      top: '14px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(17,17,24,0.92)',
      color: '#fff',
      font: FONT,
      padding: '8px 14px',
      'border-radius': '999px',
      'box-shadow': '0 8px 24px rgba(0,0,0,0.25)',
      'pointer-events': 'none',
      'white-space': 'nowrap',
      'letter-spacing': '0.01em',
    },
    text,
  );
}

export interface OverlayHandle {
  destroy(): void;
}

function createHost(interactive: boolean): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement('div');
  host.setAttribute('data-frameora-overlay', '');
  css(host, {
    all: 'initial',
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    'z-index': Z,
    'pointer-events': interactive ? 'auto' : 'none',
    cursor: interactive ? 'crosshair' : 'default',
    display: 'block',
    contain: 'strict',
  });
  const root = host.attachShadow({ mode: 'closed' });
  document.documentElement.appendChild(host);
  return { host, root };
}

/** Waits until the browser has painted at least twice (overlay fully gone). */
export function nextPaint(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => (++n >= frames ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
    // rAF does not run in hidden tabs; never hang forever.
    setTimeout(resolve, 250);
  });
}

// ── Area selection ───────────────────────────────────────────────────────

export interface AreaScroller {
  /** Current scroll offset of the scroller. */
  getScroll(): { x: number; y: number };
  scrollBy(dx: number, dy: number): void;
  /** Visible window of the scroller in viewport coords (for content→viewport mapping). */
  viewportOrigin(): { x: number; y: number };
  contentSize(): { w: number; h: number };
}

export interface AreaResult {
  /** Selection in scroller content coordinates. */
  content: Rect;
  /** Selection in viewport coordinates at confirm time. */
  viewport: Rect;
  scrolled: boolean;
}

type DragMode = 'new' | 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function startAreaSelection(
  scroller: AreaScroller,
  onDone: (result: AreaResult | null) => void,
): OverlayHandle {
  const { host, root } = createHost(true);
  // Listeners live on the (closed) shadow root, so they see the real target.
  // This full-size surface receives presses on empty space.
  const surface = root.appendChild(
    el('div', { position: 'fixed', inset: '0', background: 'transparent', 'pointer-events': 'auto', cursor: 'crosshair' }),
  );
  const shades = [0, 1, 2, 3].map(() =>
    root.appendChild(el('div', { position: 'fixed', background: 'rgba(9,9,11,0.45)', 'pointer-events': 'none' })),
  );
  const box = root.appendChild(
    el('div', {
      position: 'fixed',
      border: `1.5px solid ${BRAND_LIGHT}`,
      outline: '1px solid rgba(255,255,255,0.7)',
      display: 'none',
      cursor: 'move',
      'pointer-events': 'auto',
    }),
  );
  const handles: Record<string, HTMLElement> = {};
  const cursors: Record<string, string> = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
  };
  for (const h of Object.keys(cursors)) {
    handles[h] = box.appendChild(
      el('div', {
        position: 'absolute',
        width: '10px',
        height: '10px',
        background: '#fff',
        border: `1.5px solid ${BRAND}`,
        'border-radius': '2px',
        cursor: cursors[h],
        'pointer-events': 'auto',
      }),
    );
    handles[h].dataset.handle = h;
  }
  const sizeLabel = root.appendChild(
    el('div', {
      position: 'fixed',
      display: 'none',
      background: BRAND,
      color: '#fff',
      font: "600 12px/1 ui-sans-serif, system-ui, sans-serif",
      padding: '5px 7px',
      'border-radius': '6px',
      'pointer-events': 'none',
      'font-variant-numeric': 'tabular-nums',
    }),
  );
  const toolbar = root.appendChild(
    el('div', {
      position: 'fixed',
      display: 'none',
      gap: '6px',
      padding: '5px',
      background: 'rgba(17,17,24,0.94)',
      'border-radius': '10px',
      'box-shadow': '0 8px 24px rgba(0,0,0,0.3)',
      'pointer-events': 'auto',
      cursor: 'default',
    }),
  );
  const mkButton = (label: string, primary: boolean) =>
    toolbar.appendChild(
      el(
        'button',
        {
          font: "600 13px/1 ui-sans-serif, system-ui, sans-serif",
          padding: '8px 12px',
          border: '0',
          'border-radius': '7px',
          background: primary ? BRAND : 'transparent',
          color: '#fff',
          cursor: 'pointer',
        },
        label,
      ),
    );
  const cancelBtn = mkButton('Cancel', false);
  const captureBtn = mkButton('Capture', true);
  cancelBtn.setAttribute('type', 'button');
  captureBtn.setAttribute('type', 'button');
  root.appendChild(pill('Drag to select · Scroll to extend · Enter to capture · Esc to cancel'));

  let sel: Rect | null = null; // content coordinates
  let drag: { mode: DragMode; startX: number; startY: number; orig: Rect | null; pointerId: number } | null = null;
  let scrolled = false;
  let lastPointer = { x: 0, y: 0 };
  let autoScrollTimer = 0;
  let done = false;

  const toContent = (vx: number, vy: number) => {
    const s = scroller.getScroll();
    const o = scroller.viewportOrigin();
    return { x: vx - o.x + s.x, y: vy - o.y + s.y };
  };
  const toViewport = (r: Rect): Rect => {
    const s = scroller.getScroll();
    const o = scroller.viewportOrigin();
    return { x: r.x - s.x + o.x, y: r.y - s.y + o.y, w: r.w, h: r.h };
  };

  const render = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!sel || sel.w < 1 || sel.h < 1) {
      css(shades[0], { left: '0', top: '0', width: `${vw}px`, height: `${vh}px` });
      for (const s of shades.slice(1)) css(s, { width: '0', height: '0' });
      css(box, { display: 'none' });
      css(sizeLabel, { display: 'none' });
      css(toolbar, { display: 'none' });
      return;
    }
    const v = toViewport(sel);
    const top = Math.max(0, v.y);
    const btm = Math.min(vh, v.y + v.h);
    css(shades[0], { left: '0', top: '0', width: `${vw}px`, height: `${Math.max(0, top)}px` });
    css(shades[1], { left: '0', top: `${btm}px`, width: `${vw}px`, height: `${Math.max(0, vh - btm)}px` });
    css(shades[2], { left: '0', top: `${top}px`, width: `${Math.max(0, v.x)}px`, height: `${Math.max(0, btm - top)}px` });
    css(shades[3], {
      left: `${v.x + v.w}px`,
      top: `${top}px`,
      width: `${Math.max(0, vw - v.x - v.w)}px`,
      height: `${Math.max(0, btm - top)}px`,
    });
    css(box, { display: 'block', left: `${v.x}px`, top: `${v.y}px`, width: `${v.w}px`, height: `${v.h}px` });
    const pos: Record<string, [string, string]> = {
      nw: ['-6px', '-6px'],
      n: ['calc(50% - 5px)', '-6px'],
      ne: ['calc(100% - 4px)', '-6px'],
      e: ['calc(100% - 4px)', 'calc(50% - 5px)'],
      se: ['calc(100% - 4px)', 'calc(100% - 4px)'],
      s: ['calc(50% - 5px)', 'calc(100% - 4px)'],
      sw: ['-6px', 'calc(100% - 4px)'],
      w: ['-6px', 'calc(50% - 5px)'],
    };
    for (const [h, [l, t]] of Object.entries(pos)) css(handles[h], { left: l, top: t });
    sizeLabel.textContent = `${Math.round(sel.w)} × ${Math.round(sel.h)}`;
    css(sizeLabel, {
      display: 'block',
      left: `${Math.max(4, v.x)}px`,
      top: `${v.y > 30 ? v.y - 26 : Math.min(vh - 26, v.y + 6)}px`,
    });
    const tbTop = v.y + v.h + 48 < vh ? v.y + v.h + 8 : Math.max(8, Math.min(vh - 48, v.y + v.h - 48));
    css(toolbar, {
      display: drag ? 'none' : 'flex',
      left: `${Math.max(8, Math.min(vw - 180, v.x + v.w - 170))}px`,
      top: `${tbTop}px`,
    });
  };

  const clampSel = (r: Rect): Rect => {
    const size = scroller.contentSize();
    const x = Math.max(0, Math.min(r.x, size.w - 1));
    const y = Math.max(0, Math.min(r.y, size.h - 1));
    return { x, y, w: Math.max(0, Math.min(r.w, size.w - x)), h: Math.max(0, Math.min(r.h, size.h - y)) };
  };

  const applyDrag = (vx: number, vy: number) => {
    if (!drag) return;
    const p = toContent(vx, vy);
    const start = drag.orig;
    const s = { x: drag.startX, y: drag.startY };
    if (drag.mode === 'new' || !start) {
      sel = clampSel({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    } else if (drag.mode === 'move') {
      const size = scroller.contentSize();
      sel = {
        ...start,
        x: Math.max(0, Math.min(size.w - start.w, start.x + p.x - s.x)),
        y: Math.max(0, Math.min(size.h - start.h, start.y + p.y - s.y)),
      };
    } else {
      let { x, y } = start;
      let x2 = start.x + start.w;
      let y2 = start.y + start.h;
      if (drag.mode.includes('w')) x = p.x;
      if (drag.mode.includes('e')) x2 = p.x;
      if (drag.mode.includes('n')) y = p.y;
      if (drag.mode.includes('s')) y2 = p.y;
      sel = clampSel({ x: Math.min(x, x2), y: Math.min(y, y2), w: Math.abs(x2 - x), h: Math.abs(y2 - y) });
    }
    render();
  };

  const autoScroll = () => {
    if (!drag) return;
    const edge = 28;
    const vh = window.innerHeight;
    let dy = 0;
    if (lastPointer.y < edge) dy = -Math.ceil((edge - lastPointer.y) / 2);
    else if (lastPointer.y > vh - edge) dy = Math.ceil((lastPointer.y - (vh - edge)) / 2);
    if (dy !== 0) {
      const before = scroller.getScroll().y;
      scroller.scrollBy(0, dy);
      if (scroller.getScroll().y !== before) {
        scrolled = true;
        applyDrag(lastPointer.x, lastPointer.y);
      }
    }
    autoScrollTimer = requestAnimationFrame(autoScroll);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.composedPath()[0] as HTMLElement | undefined;
    void host;
    if (target && toolbar.contains(target)) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = target?.dataset?.handle as DragMode | undefined;
    const p = toContent(e.clientX, e.clientY);
    let mode: DragMode = 'new';
    if (handle) mode = handle;
    else if (target === box) mode = 'move';
    drag = { mode, startX: p.x, startY: p.y, orig: sel ? { ...sel } : null, pointerId: e.pointerId };
    lastPointer = { x: e.clientX, y: e.clientY };
    surface.setPointerCapture(e.pointerId);
    cancelAnimationFrame(autoScrollTimer);
    autoScrollTimer = requestAnimationFrame(autoScroll);
    render();
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    lastPointer = { x: e.clientX, y: e.clientY };
    applyDrag(e.clientX, e.clientY);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    try {
      surface.releasePointerCapture(drag.pointerId);
    } catch {
      /* already released */
    }
    drag = null;
    cancelAnimationFrame(autoScrollTimer);
    if (sel && (sel.w < 3 || sel.h < 3)) sel = null;
    render();
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const before = scroller.getScroll();
    scroller.scrollBy(e.deltaX * factor, e.deltaY * factor);
    const after = scroller.getScroll();
    if (after.x !== before.x || after.y !== before.y) scrolled = true;
    if (drag) applyDrag(lastPointer.x, lastPointer.y);
    else render();
  };

  const finish = (confirmed: boolean) => {
    if (done) return;
    done = true;
    const result = confirmed && sel && sel.w >= 3 && sel.h >= 3 ? { content: { ...sel }, viewport: toViewport(sel), scrolled } : null;
    handle.destroy();
    onDone(result);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      finish(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (sel) finish(true);
    } else if (sel && e.key.startsWith('Arrow')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const d = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
      const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
      sel = clampSel({ ...sel, x: sel.x + dx, y: sel.y + dy });
      render();
    }
  };
  const onDblClick = (e: MouseEvent) => {
    e.preventDefault();
    if (sel) finish(true);
  };
  const onResize = () => render();
  const onScroll = () => render();

  const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) =>
    root.addEventListener(type, fn as EventListener, opts);
  on('pointerdown', onPointerDown);
  on('pointermove', onPointerMove);
  on('pointerup', onPointerUp);
  on('pointercancel', onPointerUp);
  on('wheel', onWheel, { passive: false });
  on('dblclick', onDblClick);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, true);
  captureBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    finish(true);
  });
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    finish(false);
  });
  render();

  const handle: OverlayHandle = {
    destroy() {
      done = true;
      cancelAnimationFrame(autoScrollTimer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      host.remove();
    },
  };
  return handle;
}

// ── Element / scrollable picker ─────────────────────────────────────────

export interface PickerOptions {
  /** Maps the hovered element to the element that should be highlighted. */
  resolve(el: Element): Element | null;
  describe(el: Element): string;
  hint: string;
  emptyLabel: string;
}

export function startElementPicker(opts: PickerOptions, onDone: (el: Element | null) => void): OverlayHandle {
  const { host, root } = createHost(false);
  const box = root.appendChild(
    el('div', {
      position: 'fixed',
      display: 'none',
      border: `2px solid ${BRAND}`,
      background: 'rgba(99,102,241,0.14)',
      'border-radius': '2px',
      'pointer-events': 'none',
      transition: 'all 60ms ease-out',
    }),
  );
  const label = root.appendChild(
    el('div', {
      position: 'fixed',
      display: 'none',
      background: BRAND,
      color: '#fff',
      font: "600 12px/1.2 ui-sans-serif, system-ui, sans-serif",
      padding: '5px 8px',
      'border-radius': '6px',
      'pointer-events': 'none',
      'max-width': '60vw',
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      'white-space': 'nowrap',
    }),
  );
  root.appendChild(pill(opts.hint));

  let current: Element | null = null;
  const stack: Element[] = [];
  let done = false;
  let lastPoint = { x: -1, y: -1 };

  const render = () => {
    if (!current) {
      css(box, { display: 'none' });
      if (lastPoint.x >= 0) {
        label.textContent = opts.emptyLabel;
        css(label, { display: 'block', left: `${lastPoint.x + 12}px`, top: `${lastPoint.y + 12}px` });
      } else css(label, { display: 'none' });
      return;
    }
    const r = current.getBoundingClientRect();
    css(box, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    label.textContent = opts.describe(current);
    const top = r.top > 30 ? r.top - 28 : Math.min(window.innerHeight - 28, Math.max(4, r.top + 4));
    css(label, { display: 'block', left: `${Math.max(4, Math.min(window.innerWidth - 200, r.left))}px`, top: `${top}px` });
  };

  const hoverAt = (x: number, y: number) => {
    lastPoint = { x, y };
    const hit = document.elementFromPoint(x, y);
    const next = hit && !host.contains(hit) && hit !== host ? opts.resolve(hit) : null;
    if (next !== current) {
      current = next;
      stack.length = 0;
    }
    render();
  };

  const swallow = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const onMove = (e: MouseEvent) => hoverAt(e.clientX, e.clientY);
  const onClick = (e: MouseEvent) => {
    swallow(e);
    if (e.button !== 0) return;
    if (!current) hoverAt(e.clientX, e.clientY);
    if (current) finish(current);
  };
  const finish = (target: Element | null) => {
    if (done) return;
    done = true;
    handle.destroy();
    onDone(target);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      swallow(e);
      finish(null);
    } else if (e.key === 'Enter' && current) {
      swallow(e);
      finish(current);
    } else if (e.key === 'ArrowUp' && current) {
      swallow(e);
      let parent = current.parentElement;
      while (parent && opts.resolve(parent) !== parent) parent = parent.parentElement;
      if (parent && parent !== document.documentElement) {
        stack.push(current);
        current = parent;
        render();
      }
    } else if (e.key === 'ArrowDown' && current) {
      swallow(e);
      const prev = stack.pop();
      if (prev) {
        current = prev;
        render();
      }
    }
  };
  const onScroll = () => render();

  const blocked = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'auxclick'];
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('click', onClick, true);
  for (const type of blocked) window.addEventListener(type, swallow, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);
  const hadStyleAttr = document.documentElement.hasAttribute('style');
  const prevCursor = document.documentElement.style.getPropertyValue('cursor');
  const prevPriority = document.documentElement.style.getPropertyPriority('cursor');
  document.documentElement.style.setProperty('cursor', 'crosshair', 'important');

  const handle: OverlayHandle = {
    destroy() {
      done = true;
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
      for (const type of blocked) window.removeEventListener(type, swallow, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      if (prevCursor) document.documentElement.style.setProperty('cursor', prevCursor, prevPriority);
      else document.documentElement.style.removeProperty('cursor');
      // Leave no empty style="" attribute behind on pages that had none.
      if (!hadStyleAttr && !document.documentElement.getAttribute('style')) {
        document.documentElement.removeAttribute('style');
      }
      host.remove();
    },
  };
  return handle;
}
