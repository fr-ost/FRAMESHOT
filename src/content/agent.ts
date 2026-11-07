/**
 * Frameora capture agent — injected on demand (chrome.scripting.executeScript)
 * into the tab being captured. It never runs on pages the user did not invoke
 * Frameora on, never reads page text, and never sends page content anywhere.
 *
 * Responsibilities:
 *  - measure pages and find the main scroller (window or app-shell panel)
 *  - scroll step by step for multi-frame captures and report exact geometry
 *  - classify fixed/sticky elements and toggle them per frame
 *  - show selection UI (area / element / scrollable)
 *  - restore every temporary change afterwards (scroll positions, attributes)
 */
import {
  AGENT_PROTOCOL_VERSION,
  type AgentRequest,
  type AgentResponses,
  type AgentSelection,
  type FixedVisibility,
  type FrameGeometry,
  type PageMetrics,
  type ScrollerInfo,
  type ScrollerRef,
} from '../core/messages';
import { ATTR_HIDE, ATTR_UNSTICK } from '../core/page-css';
import type { Rect } from '../core/types';
import { nextPaint, startAreaSelection, startElementPicker, type OverlayHandle } from './overlay';

interface FixedEntry {
  el: Element;
  anchor: 'top' | 'bottom';
}

interface SessionState {
  id: string;
  fixed: FixedEntry[];
  touched: Set<Element>;
  scrollOrigins: Map<Element | Window, { x: number; y: number }>;
  watchdog: number;
}

const tokens = new Map<string, Element>();
let tokenCounter = 0;
let session: SessionState | null = null;
let overlay: OverlayHandle | null = null;
let pickSession: string | null = null;

// ── Scroller abstraction ─────────────────────────────────────────────────

function tokenFor(el: Element): string {
  for (const [t, e] of tokens) if (e === el) return t;
  const t = `el-${++tokenCounter}-${Math.random().toString(36).slice(2, 8)}`;
  tokens.set(t, el);
  return t;
}

function resolveToken(token: string): Element {
  const el = tokens.get(token);
  if (!el || !el.isConnected) throw new Error('The selected element is no longer on the page.');
  return el;
}

function viewportSize(): { w: number; h: number } {
  const de = document.documentElement;
  const backCompat = document.compatMode === 'BackCompat';
  const w = backCompat ? window.innerWidth : de.clientWidth || window.innerWidth;
  const h = backCompat ? window.innerHeight : de.clientHeight || window.innerHeight;
  return { w: Math.min(w, window.innerWidth), h: Math.min(h, window.innerHeight) };
}

function documentScrollSize(): { w: number; h: number } {
  const de = document.documentElement;
  const body = document.body;
  return {
    w: Math.max(de.scrollWidth, body?.scrollWidth ?? 0, de.clientWidth),
    h: Math.max(de.scrollHeight, body?.scrollHeight ?? 0, de.clientHeight),
  };
}

function isScrollable(el: Element, axis: 'y' | 'x' | 'any' = 'any'): boolean {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return false;
  if (el === document.documentElement || el === document.body) return false;
  const style = getComputedStyle(el);
  const canY = /(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
  const canX = /(auto|scroll|overlay)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
  return axis === 'y' ? canY : axis === 'x' ? canX : canY || canX;
}

function windowScrolls(): boolean {
  const vs = viewportSize();
  const ds = documentScrollSize();
  if (ds.h <= vs.h + 1) return false;
  const se = document.scrollingElement;
  const style = se ? getComputedStyle(se) : null;
  const bodyStyle = document.body ? getComputedStyle(document.body) : null;
  const hidden = (s: CSSStyleDeclaration | null) => !!s && /(hidden|clip)/.test(s.overflowY);
  return !(hidden(style) && hidden(bodyStyle));
}

/**
 * App-shell pages (overflow hidden on body, content scrolling in a panel) are
 * detected by finding the largest visible vertically-scrollable element.
 */
function detectMainScroller(): ScrollerRef {
  if (windowScrolls()) return { type: 'window' };
  const vs = viewportSize();
  const viewportArea = vs.w * vs.h;
  let best: { el: Element; area: number } | null = null;
  for (const el of allElements(4000)) {
    if (!isScrollable(el, 'y')) continue;
    const r = el.getBoundingClientRect();
    const visible = intersectRect({ x: r.left, y: r.top, w: r.width, h: r.height }, { x: 0, y: 0, w: vs.w, h: vs.h });
    const area = visible.w * visible.h;
    if (area < viewportArea * 0.25) continue;
    if (!best || area > best.area) best = { el, area };
  }
  return best ? { type: 'element', token: tokenFor(best.el) } : { type: 'window' };
}

function intersectRect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
}

interface ScrollerOps {
  getScroll(): { x: number; y: number };
  setScroll(x: number, y: number): void;
  contentSize(): { w: number; h: number };
  /** Visible window in viewport coords. */
  visibleViewport(): Rect;
  /** Visible window in content coords. */
  visibleContent(): Rect;
  key: Element | Window;
}

function windowOps(): ScrollerOps {
  return {
    key: window,
    getScroll: () => ({ x: window.scrollX, y: window.scrollY }),
    setScroll: (x, y) => window.scrollTo({ left: x, top: y, behavior: 'instant' as ScrollBehavior }),
    contentSize: () => documentScrollSize(),
    visibleViewport: () => {
      const v = viewportSize();
      return { x: 0, y: 0, w: v.w, h: v.h };
    },
    visibleContent() {
      const v = viewportSize();
      return { x: window.scrollX, y: window.scrollY, w: v.w, h: v.h };
    },
  };
}

function elementOps(el: Element): ScrollerOps {
  const clientBox = (): Rect => {
    const r = el.getBoundingClientRect();
    return { x: r.left + el.clientLeft, y: r.top + el.clientTop, w: el.clientWidth, h: el.clientHeight };
  };
  const visibleViewport = (): Rect => {
    const v = viewportSize();
    return intersectRect(clientBox(), { x: 0, y: 0, w: v.w, h: v.h });
  };
  return {
    key: el,
    getScroll: () => ({ x: el.scrollLeft, y: el.scrollTop }),
    setScroll: (x, y) => el.scrollTo({ left: x, top: y, behavior: 'instant' as ScrollBehavior }),
    contentSize: () => ({ w: el.scrollWidth, h: el.scrollHeight }),
    visibleViewport,
    visibleContent() {
      const box = clientBox();
      const vis = visibleViewport();
      return { x: el.scrollLeft + (vis.x - box.x), y: el.scrollTop + (vis.y - box.y), w: vis.w, h: vis.h };
    },
  };
}

function opsFor(ref: ScrollerRef): ScrollerOps {
  return ref.type === 'window' ? windowOps() : elementOps(resolveToken(ref.token));
}

function rememberScroll(ops: ScrollerOps): void {
  if (session && !session.scrollOrigins.has(ops.key)) session.scrollOrigins.set(ops.key, ops.getScroll());
}

function nearestScroller(el: Element): Element | null {
  let node: Element | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }
  return null;
}

// ── DOM traversal ───────────────────────────────────────────────────────

function* allElements(limit = 60000): Generator<Element> {
  let count = 0;
  const stack: (Document | ShadowRoot | Element)[] = [document];
  while (stack.length) {
    const root = stack.pop()!;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode() as Element | null;
    while (node) {
      if (++count > limit) return;
      if (!(node as HTMLElement).hasAttribute?.('data-frameora-overlay')) {
        yield node;
        if (node.shadowRoot) stack.push(node.shadowRoot);
      }
      node = walker.nextNode() as Element | null;
    }
  }
}

// ── Session lifecycle ───────────────────────────────────────────────────

function touchWatchdog(): void {
  if (!session) return;
  clearTimeout(session.watchdog);
  // If the service worker disappears mid-capture, never leave the page modified.
  session.watchdog = window.setTimeout(() => restore(), 30000);
}

function ensureSession(id: string): SessionState {
  if (session && session.id !== id) restore();
  if (!session) {
    session = { id, fixed: [], touched: new Set(), scrollOrigins: new Map(), watchdog: 0 };
    window.addEventListener('keydown', onCaptureKey, true);
  }
  touchWatchdog();
  return session;
}

function onCaptureKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && session) {
    e.preventDefault();
    e.stopImmediatePropagation();
    void chrome.runtime.sendMessage({ kind: 'agent.escape', session: session.id }).catch(() => {});
  }
}

function prepare(id: string, unstick: boolean, keepToken?: string, scroller?: ScrollerRef): AgentResponses['agent.prepare'] {
  const s = ensureSession(id);
  const keeps = [keepToken ? tokens.get(keepToken) : undefined, scroller?.type === 'element' ? tokens.get(scroller.token) : undefined].filter(
    (e): e is Element => !!e,
  );
  const vs = viewportSize();
  let stickyCount = 0;
  s.fixed = [];
  for (const el of allElements()) {
    const style = getComputedStyle(el);
    const pos = style.position;
    if (pos !== 'fixed' && pos !== 'sticky') continue;
    if (keeps.some((k) => el.contains(k) || k.contains(el))) continue;
    if (pos === 'sticky') {
      if (unstick) {
        el.setAttribute(ATTR_UNSTICK, '');
        s.touched.add(el);
        stickyCount++;
      }
      continue;
    }
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const centerY = r.top + r.height / 2;
    const anchor: 'top' | 'bottom' = r.height >= vs.h * 0.8 || centerY < vs.h / 2 ? 'top' : 'bottom';
    s.fixed.push({ el, anchor });
  }
  return { prepared: true, fixedCount: s.fixed.length, stickyCount };
}

function setFixedVisibility(mode: FixedVisibility): number {
  if (!session) return 0;
  const vs = viewportSize();
  let bottomFixedTop = vs.h;
  for (const { el, anchor } of session.fixed) {
    if (!el.isConnected) continue;
    const hide = mode === 'none' || (mode === 'top' && anchor === 'bottom') || (mode === 'bottom' && anchor === 'top');
    if (hide) {
      el.setAttribute(ATTR_HIDE, '');
      session.touched.add(el);
    } else {
      el.removeAttribute(ATTR_HIDE);
      if (anchor === 'bottom') {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top < vs.h) bottomFixedTop = Math.min(bottomFixedTop, Math.max(0, r.top));
      }
    }
  }
  return Math.max(0, vs.h - bottomFixedTop);
}

function restore(): void {
  if (!session) return;
  const s = session;
  session = null;
  clearTimeout(s.watchdog);
  window.removeEventListener('keydown', onCaptureKey, true);
  for (const el of s.touched) {
    el.removeAttribute(ATTR_HIDE);
    el.removeAttribute(ATTR_UNSTICK);
  }
  // Restore inner scrollers first, then the window.
  const entries = [...s.scrollOrigins.entries()].sort(([a], [b]) => (a === window ? 1 : 0) - (b === window ? 1 : 0));
  for (const [key, pos] of entries) {
    if (key === window) window.scrollTo({ left: pos.x, top: pos.y, behavior: 'instant' as ScrollBehavior });
    else (key as Element).scrollTo({ left: pos.x, top: pos.y, behavior: 'instant' as ScrollBehavior });
  }
}

// ── Waiting helpers ─────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Waits (bounded) for images intersecting the viewport to finish loading. */
async function waitForVisibleImages(maxMs: number): Promise<void> {
  const deadline = Date.now() + maxMs;
  const vs = viewportSize();
  const pending = () =>
    [...document.images].filter((img) => {
      if (img.complete) return false;
      const r = img.getBoundingClientRect();
      return r.bottom > -50 && r.top < vs.h + 50 && r.width > 0;
    });
  while (Date.now() < deadline) {
    const list = pending();
    if (list.length === 0) return;
    await Promise.race([
      Promise.all(list.map((img) => img.decode().catch(() => {}))),
      sleep(Math.min(200, Math.max(0, deadline - Date.now()))),
    ]);
  }
}

async function preload(ref: ScrollerRef, maxHeight: number): Promise<AgentResponses['agent.preload']> {
  const ops = opsFor(ref);
  rememberScroll(ops);
  const start = Date.now();
  const budgetMs = 25000;
  let truncated = false;
  let y = 0;
  let lastHeight = ops.contentSize().h;
  let stable = 0;
  for (;;) {
    touchWatchdog();
    const view = ops.visibleContent();
    const size = ops.contentSize();
    if (size.h > maxHeight && y + view.h >= maxHeight) {
      truncated = size.h > maxHeight;
      break;
    }
    if (y + view.h >= size.h) {
      // At the bottom; give infinite-scroll pages a moment to append content.
      await sleep(350);
      const grown = ops.contentSize().h;
      if (grown <= size.h + 1 || ++stable > 3) break;
    }
    if (Date.now() - start > budgetMs) {
      truncated = ops.contentSize().h > y + view.h;
      break;
    }
    y = Math.min(y + Math.max(200, Math.floor(view.h * 0.9)), Math.max(0, ops.contentSize().h - view.h));
    ops.setScroll(0, y);
    await sleep(110);
    const h = ops.contentSize().h;
    if (h !== lastHeight) lastHeight = h;
  }
  await waitForVisibleImages(1500);
  ops.setScroll(0, 0);
  await nextPaint();
  const final = ops.contentSize();
  return { scrollHeight: final.h, scrollWidth: final.w, truncated };
}

async function scrollStep(req: Extract<AgentRequest, { kind: 'agent.scroll' }>): Promise<FrameGeometry> {
  ensureSession(req.session);
  const ops = opsFor(req.scroller);
  rememberScroll(ops);
  // Translate the requested visible-window origin into a scroll offset.
  const before = ops.visibleContent();
  const cur = ops.getScroll();
  const offX = before.x - cur.x;
  const offY = before.y - cur.y;
  ops.setScroll(req.x - offX, req.y - offY);
  const bottomFixedHeight = setFixedVisibility(req.fixed);
  await nextPaint();
  if (req.settleMs > 0) await sleep(req.settleMs);
  await waitForVisibleImages(1200);
  await nextPaint(1);
  const size = ops.contentSize();
  return {
    content: ops.visibleContent(),
    viewport: ops.visibleViewport(),
    scrollWidth: size.w,
    scrollHeight: size.h,
    bottomFixedHeight: req.fixed === 'all' || req.fixed === 'bottom' ? bottomFixedHeight : 0,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  };
}

function measure(): PageMetrics {
  const main = detectMainScroller();
  const ops = opsFor(main);
  const size = ops.contentSize();
  return {
    url: location.href,
    title: document.title,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    mainScroller: main,
    scrollWidth: size.w,
    scrollHeight: size.h,
    viewport: ops.visibleViewport(),
  };
}

function clampToContent(r: Rect, size: { w: number; h: number }): Rect {
  return intersectRect(r, { x: 0, y: 0, w: size.w, h: size.h });
}

function resolveSelection(sel: AgentSelection): ScrollerInfo {
  if (sel.type === 'area') {
    const ops = opsFor(sel.scroller);
    const size = ops.contentSize();
    return {
      scroller: sel.scroller,
      scrollWidth: size.w,
      scrollHeight: size.h,
      viewport: ops.visibleViewport(),
      content: ops.visibleContent(),
      region: clampToContent(sel.rect, size),
    };
  }
  if (sel.type === 'scrollable') {
    const el = resolveToken(sel.element);
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
    const ops = elementOps(el);
    const size = ops.contentSize();
    return {
      scroller: { type: 'element', token: sel.element },
      scrollWidth: size.w,
      scrollHeight: size.h,
      viewport: ops.visibleViewport(),
      content: ops.visibleContent(),
      region: { x: 0, y: 0, w: size.w, h: size.h },
    };
  }
  // Element: recompute the region now (layout may have changed since picking).
  const el = resolveToken(sel.element);
  const ops = opsFor(sel.scroller);
  const size = ops.contentSize();
  const r = el.getBoundingClientRect();
  const vis = ops.visibleViewport();
  const content = ops.visibleContent();
  const region = clampToContent(
    { x: r.left - vis.x + content.x, y: r.top - vis.y + content.y, w: r.width, h: r.height },
    size,
  );
  return { scroller: sel.scroller, scrollWidth: size.w, scrollHeight: size.h, viewport: vis, content, region };
}

// ── Picking ─────────────────────────────────────────────────────────────

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id.slice(0, 24)}` : '';
  const cls =
    typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).map((c) => c.slice(0, 20)).join('.')
      : '';
  const r = el.getBoundingClientRect();
  return `${tag}${id}${cls}  ${Math.round(r.width)} × ${Math.round(r.height)}`;
}

function sendSelection(sessionId: string, selection: AgentSelection | null): void {
  pickSession = null;
  overlay = null;
  // Give the browser time to repaint without the overlay before capture starts.
  void nextPaint().then(() => {
    const msg = selection
      ? { kind: 'agent.selection', session: sessionId, selection }
      : { kind: 'agent.cancelled', session: sessionId };
    void chrome.runtime.sendMessage(msg).catch(() => {});
  });
}

function startPick(sessionId: string, mode: 'area' | 'element' | 'scrollable'): void {
  overlay?.destroy();
  pickSession = sessionId;
  if (mode === 'area') {
    const main = detectMainScroller();
    const ops = opsFor(main);
    overlay = startAreaSelection(
      {
        getScroll: () => ops.getScroll(),
        scrollBy: (dx, dy) => {
          const s = ops.getScroll();
          ops.setScroll(s.x + dx, s.y + dy);
        },
        viewportOrigin: () => {
          const content = ops.visibleContent();
          const vis = ops.visibleViewport();
          const s = ops.getScroll();
          // Point mapping: viewport = content - scroll + origin.
          return { x: vis.x - (content.x - s.x), y: vis.y - (content.y - s.y) };
        },
        contentSize: () => ops.contentSize(),
      },
      (result) => {
        if (!result) return sendSelection(sessionId, null);
        const vs = viewportSize();
        const v = result.viewport;
        const insideViewport = v.x >= -0.5 && v.y >= -0.5 && v.x + v.w <= vs.w + 0.5 && v.y + v.h <= vs.h + 0.5;
        if (insideViewport || main.type === 'window') {
          // Express the selection in document coordinates (window scroller).
          const rect = insideViewport
            ? { x: v.x + window.scrollX, y: v.y + window.scrollY, w: v.w, h: v.h }
            : result.content;
          sendSelection(sessionId, { type: 'area', scroller: { type: 'window' }, rect });
        } else {
          sendSelection(sessionId, { type: 'area', scroller: main, rect: result.content });
        }
      },
    );
    return;
  }
  const scrollableOnly = mode === 'scrollable';
  overlay = startElementPicker(
    {
      resolve: (el) => {
        if (!scrollableOnly) return el === document.documentElement || el === document.body ? null : el;
        let node: Element | null = el;
        while (node && node !== document.documentElement) {
          if (isScrollable(node)) return node;
          node = node.parentElement;
        }
        return null;
      },
      describe: (el) =>
        scrollableOnly
          ? `${describeElement(el)} · scrolls to ${Math.round(el.scrollWidth)} × ${Math.round(el.scrollHeight)}`
          : describeElement(el),
      hint: scrollableOnly
        ? 'Click a scrolling panel to capture all its content · Esc to cancel'
        : 'Click an element to capture · ↑ ↓ to adjust · Enter to capture · Esc to cancel',
      emptyLabel: scrollableOnly ? 'No scrolling area here — use Full page for the whole page' : '',
    },
    (picked) => {
      if (!picked) return sendSelection(sessionId, null);
      const token = tokenFor(picked);
      if (scrollableOnly) {
        sendSelection(sessionId, { type: 'scrollable', element: token, label: describeElement(picked) });
        return;
      }
      const scrollerEl = nearestScroller(picked);
      const scroller: ScrollerRef = scrollerEl ? { type: 'element', token: tokenFor(scrollerEl) } : { type: 'window' };
      const info = resolveSelection({ type: 'element', element: token, scroller, rect: { x: 0, y: 0, w: 0, h: 0 }, label: '' });
      sendSelection(sessionId, {
        type: 'element',
        element: token,
        scroller,
        rect: info.region,
        label: describeElement(picked),
      });
    },
  );
}

// ── Message handling ────────────────────────────────────────────────────

async function handle(msg: AgentRequest): Promise<unknown> {
  switch (msg.kind) {
    case 'agent.ping':
      return { ready: true, version: AGENT_PROTOCOL_VERSION };
    case 'agent.measure':
      return measure();
    case 'agent.resolve':
      return resolveSelection(msg.selection);
    case 'agent.prepare':
      return prepare(msg.session, msg.options.unstick, msg.options.keepElement, msg.options.scroller);
    case 'agent.preload':
      ensureSession(msg.session);
      return preload(msg.scroller, msg.maxHeight);
    case 'agent.scroll':
      return scrollStep(msg);
    case 'agent.restore':
      restore();
      await nextPaint(1);
      return { restored: true };
    case 'agent.pick':
      startPick(msg.session, msg.mode);
      return { picking: true };
    case 'agent.cancelPick':
      overlay?.destroy();
      overlay = null;
      pickSession = null;
      return { cancelled: true };
  }
}

export function installAgent(): void {
  const w = window as unknown as { __frameoraAgent?: number };
  if (w.__frameoraAgent === AGENT_PROTOCOL_VERSION) return;
  w.__frameoraAgent = AGENT_PROTOCOL_VERSION;

  chrome.runtime.onMessage.addListener((msg: AgentRequest, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !msg || typeof msg.kind !== 'string' || !msg.kind.startsWith('agent.')) {
      return false;
    }
    handle(msg).then(
      (data) => sendResponse({ ok: true, data }),
      (err: unknown) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
    );
    return true;
  });

  // Navigating away or closing: make sure nothing is left behind.
  window.addEventListener('pagehide', () => {
    overlay?.destroy();
    overlay = null;
    if (pickSession) pickSession = null;
    restore();
  });
}
