/**
 * Capture orchestration (service worker).
 *
 * Flow for every mode:
 *   resolve target → (optionally) prepare page → capture frame(s) → stitch →
 *   verify completeness → save to IndexedDB → restore page → open editor.
 *
 * The page is always restored in a `finally` block; the content agent also has
 * its own watchdog in case this service worker is terminated mid-capture.
 */
import {
  DEFAULT_CANVAS_LIMITS,
  StitchPlanner,
  fitScale,
  frameScale,
  overlapFor,
  planScrollSteps,
  retryScrollTarget,
  type CanvasLimits,
  type ScrollStep,
} from '../core/capture-plan';
import { defaultItemName } from '../core/filename';
import { intersect, isEmpty } from '../core/geometry';
import type { AgentSelection, FixedVisibility, FrameGeometry, ScrollerRef } from '../core/messages';
import { CAPTURE_CSS, FREEZE_CSS } from '../core/page-css';
import { checkPageAccess, domainOf, friendlyCaptureError } from '../core/restricted';
import { loadSettings, type Settings } from '../core/settings';
import type { CaptureErrorCode, CaptureMode, CaptureSource, LibraryItem, Rect } from '../core/types';
import { newId } from '../core/format';
import { addItem } from '../db/db';
import { canvasToBlob, createCanvas, dHash, get2d, makeThumbnail, probeMaxCanvasDimension } from '../imaging/image-io';
import { callAgent, ensureAgent } from './agent-client';
import { assertTabVisible, captureFrame, TabChangedError } from './frame-capture';
import { setStatus } from './status';
import { SegmentedCanvas, type FinishedSegment } from './stitcher';

export class CaptureError extends Error {
  constructor(
    message: string,
    readonly code: CaptureErrorCode = 'unknown',
  ) {
    super(message);
    this.name = 'CaptureError';
  }
}

interface ActiveCapture {
  id: string;
  tabId: number;
  windowId: number;
  mode: CaptureMode;
  cancelled: boolean;
  stopRequested: boolean;
  delayTimer?: ReturnType<typeof setTimeout>;
}

let active: ActiveCapture | null = null;

const PENDING_KEY = 'frameshot.pendingPick';

interface PendingPick {
  session: string;
  tabId: number;
  windowId: number;
  mode: CaptureMode;
  startedAt: number;
}

export function isBusy(): boolean {
  return active !== null;
}

export function cancelCapture(): boolean {
  if (!active) {
    // Possibly waiting for the user to pick an area/element: abandon that.
    void abandonPendingPick();
    return false;
  }
  active.cancelled = true;
  if (active.delayTimer) {
    clearTimeout(active.delayTimer);
    const tabId = active.tabId;
    active = null;
    setStatus({ phase: 'cancelled', message: 'Capture cancelled.' });
    void callAgent(tabId, { kind: 'agent.cancelPick' }, 1000).catch(() => {});
  }
  return true;
}

export function stopCapture(): boolean {
  if (!active || active.mode === 'visible') return false;
  active.stopRequested = true;
  return true;
}

async function clearPendingPick(): Promise<void> {
  await chrome.storage.session.remove(PENDING_KEY).catch(() => {});
}

// ── Entry points ─────────────────────────────────────────────────────────

export interface StartOptions {
  tabId: number;
  mode: CaptureMode;
  delayMs?: number;
}

/**
 * Starts a capture. Resolves once the capture is underway (or, for interactive
 * modes, once the selection UI is showing). Progress is reported via status.
 */
export async function startCapture(opts: StartOptions): Promise<void> {
  if (active) throw new CaptureError('A capture is already in progress.', 'busy');
  const tab = await chrome.tabs.get(opts.tabId).catch(() => null);
  if (!tab || tab.id === undefined) throw new CaptureError('No tab to capture.', 'no-tab');
  const access = checkPageAccess(tab.url);
  if (!access.allowed) throw new CaptureError(access.reason, 'restricted-page');

  const capture: ActiveCapture = {
    id: newId(),
    tabId: tab.id,
    windowId: tab.windowId,
    mode: opts.mode,
    cancelled: false,
    stopRequested: false,
  };

  if (opts.mode === 'area' || opts.mode === 'element' || opts.mode === 'scrollable') {
    try {
      await ensureAgent(tab.id);
    } catch (err) {
      throw new CaptureError(friendlyCaptureError(String((err as Error)?.message ?? err), !!tab.url), 'permission');
    }
    const pending: PendingPick = {
      session: capture.id,
      tabId: tab.id,
      windowId: tab.windowId,
      mode: opts.mode,
      startedAt: Date.now(),
    };
    await chrome.storage.session.set({ [PENDING_KEY]: pending });
    await callAgent(tab.id, { kind: 'agent.pick', session: capture.id, mode: opts.mode });
    setStatus({ phase: 'selecting', mode: opts.mode, message: 'Select what to capture on the page…' });
    return;
  }

  active = capture;
  const delay = Math.max(0, Math.min(30000, opts.delayMs ?? 0));
  if (delay > 0 && opts.mode === 'visible') {
    await runCountdown(capture, delay);
    return;
  }
  setStatus({ phase: 'preparing', mode: opts.mode, message: 'Preparing capture…' });
  void runCapture(capture, null);
}

function runCountdown(capture: ActiveCapture, delayMs: number): Promise<void> {
  let remaining = Math.ceil(delayMs / 1000);
  const tick = () => {
    if (capture.cancelled || active !== capture) return;
    if (remaining <= 0) {
      void runCapture(capture, null);
      return;
    }
    setStatus({ phase: 'waiting', mode: capture.mode, message: String(remaining) });
    remaining--;
    capture.delayTimer = setTimeout(tick, 1000);
  };
  tick();
  return Promise.resolve();
}

/** Called when the content agent reports a confirmed selection. */
export async function onSelection(
  sessionId: string,
  selection: AgentSelection,
  senderTabId: number | undefined,
): Promise<boolean> {
  const stored = (await chrome.storage.session.get(PENDING_KEY))[PENDING_KEY] as PendingPick | undefined;
  if (!stored || stored.session !== sessionId || stored.tabId !== senderTabId) return false;
  await clearPendingPick();
  if (active) return false;
  const capture: ActiveCapture = {
    id: sessionId,
    tabId: stored.tabId,
    windowId: stored.windowId,
    mode: stored.mode,
    cancelled: false,
    stopRequested: false,
  };
  active = capture;
  setStatus({ phase: 'preparing', mode: capture.mode, message: 'Preparing capture…' });
  void runCapture(capture, selection);
  return true;
}

/**
 * Abandons a pending area/element pick (cancel button, or the tab closed or
 * navigated away while the selection UI was showing). Without this the
 * status would stay on "selecting" forever.
 */
export async function abandonPendingPick(tabId?: number): Promise<void> {
  const all = (await chrome.storage.session.get(PENDING_KEY).catch(() => ({}))) as Record<string, unknown>;
  const stored = all[PENDING_KEY] as PendingPick | undefined;
  if (!stored || (tabId !== undefined && stored.tabId !== tabId)) return;
  await clearPendingPick();
  if (tabId === undefined) void callAgent(stored.tabId, { kind: 'agent.cancelPick' }, 1000).catch(() => {});
  setStatus({ phase: 'cancelled', mode: stored.mode, message: 'Capture cancelled.' });
}

export async function onPickCancelled(sessionId: string): Promise<void> {
  const stored = (await chrome.storage.session.get(PENDING_KEY))[PENDING_KEY] as PendingPick | undefined;
  if (stored?.session === sessionId) {
    await clearPendingPick();
    setStatus({ phase: 'cancelled', message: 'Capture cancelled.' });
  }
}

export function onEscape(sessionId: string): void {
  if (active && active.id === sessionId) cancelCapture();
}

// ── Core capture ─────────────────────────────────────────────────────────

interface CaptureOutcome {
  segments: FinishedSegment[];
  warnings: string[];
  partial: boolean;
  scale: number;
}

async function runCapture(capture: ActiveCapture, selection: AgentSelection | null): Promise<void> {
  const settings = await loadSettings();
  let source: CaptureSource = { url: '', title: '', domain: '' };
  try {
    setStatus({ phase: 'preparing', mode: capture.mode, message: 'Preparing capture…' });
    const tab = await chrome.tabs.get(capture.tabId);
    source = { url: tab.url ?? '', title: tab.title ?? '', domain: domainOf(tab.url) };

    const outcome =
      capture.mode === 'visible'
        ? await captureVisible(capture)
        : await captureMultiFrame(capture, settings, selection);

    if (capture.cancelled) throw new CaptureError('Capture cancelled.', 'cancelled');

    setStatus({ phase: 'saving', mode: capture.mode, message: 'Saving to your library…' });
    const ids = await saveOutcome(capture, outcome, source, settings);

    setStatus({
      phase: 'done',
      mode: capture.mode,
      itemIds: ids,
      warnings: outcome.warnings,
      message: outcome.segments.length > 1 ? `Saved as ${outcome.segments.length} parts.` : 'Saved to your library.',
    });
    if (settings.afterCapture === 'editor') await openEditor(ids[0], capture.tabId);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (capture.cancelled || (err instanceof CaptureError && err.code === 'cancelled')) {
      setStatus({ phase: 'cancelled', mode: capture.mode, message: 'Capture cancelled.' });
    } else {
      const code: CaptureErrorCode =
        err instanceof CaptureError ? err.code : err instanceof TabChangedError ? 'tab-changed' : 'unknown';
      setStatus({ phase: 'error', mode: capture.mode, errorCode: code, message: friendlyCaptureError(raw, !!source.url) });
    }
  } finally {
    if (active === capture) active = null;
  }
}

async function captureVisible(capture: ActiveCapture): Promise<CaptureOutcome> {
  // Measuring is best-effort: on pages where scripting is blocked we still
  // capture, just without trimming scrollbars.
  let viewport: Rect | null = null;
  let innerWidth = 0;
  let dpr = 0;
  try {
    await ensureAgent(capture.tabId);
    const m = await callAgent(capture.tabId, { kind: 'agent.measure' }, 5000);
    innerWidth = m.innerWidth;
    dpr = m.devicePixelRatio;
    viewport = { x: 0, y: 0, w: Math.min(m.innerWidth, Math.round(windowViewportWidth(m))), h: m.innerHeight };
    const vh = await windowViewportHeight(capture.tabId, m.innerHeight);
    viewport.h = vh;
  } catch {
    viewport = null;
  }
  setStatus({ phase: 'capturing', mode: 'visible', progress: 0.5, message: 'Capturing…' });
  let bitmap: ImageBitmap;
  try {
    bitmap = await captureFrame(capture.windowId);
  } catch (err) {
    throw new CaptureError((err as Error).message, 'permission');
  }
  const scale = innerWidth > 0 ? frameScale(bitmap.width, innerWidth, dpr) : 1;
  const crop = viewport
    ? {
        x: 0,
        y: 0,
        w: Math.min(bitmap.width, Math.round(viewport.w * scale)),
        h: Math.min(bitmap.height, Math.round(viewport.h * scale)),
      }
    : { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
  const canvas = createCanvas(crop.w, crop.h);
  get2d(canvas).drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  bitmap.close();
  const [blob, thumb] = await Promise.all([canvasToBlob(canvas, 'png'), makeThumbnail(canvas)]);
  return {
    segments: [{ index: 0, blob, thumb, dhash: dHash(canvas), width: crop.w, height: crop.h }],
    warnings: [],
    partial: false,
    scale,
  };
}

// Viewport width excluding a classic vertical scrollbar (window scroller only).
function windowViewportWidth(m: { mainScroller: ScrollerRef; viewport: Rect; innerWidth: number }): number {
  return m.mainScroller.type === 'window' ? m.viewport.w : m.innerWidth;
}

async function windowViewportHeight(tabId: number, fallback: number): Promise<number> {
  try {
    const info = await scrollerInfo(tabId, { type: 'window' });
    return info.viewport.h || fallback;
  } catch {
    return fallback;
  }
}

function fixedFor(settings: Settings, row: number, rows: number): FixedVisibility {
  switch (settings.capture.fixedElements) {
    case 'keep':
      return 'all';
    case 'hide':
      return 'none';
    default:
      if (rows <= 1) return 'all';
      if (row === 0) return 'top';
      if (row === rows - 1) return 'bottom';
      return 'none';
  }
}

interface Target {
  scroller: ScrollerRef;
  region: Rect;
  view: { w: number; h: number };
  contentSize: { w: number; h: number };
  /** Full-page captures may grow with infinite-scroll pages. */
  growable: boolean;
  keepElement?: string;
}

async function resolveTarget(
  capture: ActiveCapture,
  settings: Settings,
  selection: AgentSelection | null,
  warnings: string[],
): Promise<Target> {
  if (capture.mode === 'full') {
    const m = await callAgent(capture.tabId, { kind: 'agent.measure' });
    const wide = settings.capture.includeHorizontalOverflow && m.scrollWidth > m.viewport.w + 2;
    if (m.mainScroller.type === 'element') {
      warnings.push('This page scrolls inside a panel, so FrameShot captured the full content of that panel.');
    }
    return {
      scroller: m.mainScroller,
      region: { x: 0, y: 0, w: wide ? m.scrollWidth : m.viewport.w, h: m.scrollHeight },
      view: { w: m.viewport.w, h: m.viewport.h },
      contentSize: { w: m.scrollWidth, h: m.scrollHeight },
      growable: true,
    };
  }
  if (!selection) throw new CaptureError('Nothing was selected.', 'unknown');
  const info = await callAgent(capture.tabId, { kind: 'agent.resolve', selection });
  if (isEmpty(info.region)) throw new CaptureError('The selected area is empty or no longer visible.', 'unknown');
  return {
    scroller: info.scroller,
    region: info.region,
    view: { w: info.viewport.w, h: info.viewport.h },
    contentSize: { w: info.scrollWidth, h: info.scrollHeight },
    growable: false,
    keepElement: selection.type === 'element' ? selection.element : undefined,
  };
}

async function scrollerInfo(tabId: number, scroller: ScrollerRef) {
  return callAgent(tabId, {
    kind: 'agent.resolve',
    selection: { type: 'area', scroller, rect: { x: 0, y: 0, w: 1, h: 1 } },
  });
}

async function captureMultiFrame(
  capture: ActiveCapture,
  settings: Settings,
  selection: AgentSelection | null,
): Promise<CaptureOutcome> {
  const tabId = capture.tabId;
  const warnings: string[] = [];
  try {
    await ensureAgent(tabId);
  } catch (err) {
    throw new CaptureError((err as Error).message, 'permission');
  }

  const target = await resolveTarget(capture, settings, selection, warnings);
  if (target.view.w < 1 || target.view.h < 1) {
    throw new CaptureError('The area to capture is not visible on screen. Scroll it into view and try again.');
  }

  // Single-frame captures of something already fully visible are taken as-is:
  // no scrolling and no page modifications (what you see is what you get).
  const visibleNow = await currentVisibleContent(tabId, target.scroller);
  const fitsInView = target.region.h <= target.view.h + 0.5 && target.region.w <= target.view.w + 0.5;
  const alreadyVisible =
    fitsInView &&
    intersect(target.region, visibleNow).w >= target.region.w - 0.5 &&
    intersect(target.region, visibleNow).h >= target.region.h - 0.5;

  let cssInserted: string[] = [];
  try {
    if (!alreadyVisible) {
      cssInserted = [CAPTURE_CSS, ...(settings.capture.freezeAnimations ? [FREEZE_CSS] : [])];
      for (const css of cssInserted) {
        await chrome.scripting.insertCSS({ target: { tabId, frameIds: [0] }, css, origin: 'USER' });
      }
      await callAgent(tabId, {
        kind: 'agent.prepare',
        session: capture.id,
        options: { unstick: true, keepElement: target.keepElement, scroller: target.scroller },
      });
    }

    const maxHeight = settings.capture.maxPageHeight;
    if (capture.mode === 'full' && settings.capture.preloadLazyContent && target.region.h > target.view.h) {
      setStatus({ phase: 'loading', mode: capture.mode, message: 'Loading page content…', canStop: false });
      const pre = await callAgent(
        tabId,
        { kind: 'agent.preload', session: capture.id, scroller: target.scroller, maxHeight },
        60000,
      );
      target.region.h = pre.scrollHeight;
      target.contentSize = { w: pre.scrollWidth, h: pre.scrollHeight };
      if (settings.capture.includeHorizontalOverflow && pre.scrollWidth > target.view.w + 2) {
        target.region.w = pre.scrollWidth;
      }
    }
    if (capture.cancelled) throw new CaptureError('Capture cancelled.', 'cancelled');

    let limitedByMaxHeight = false;
    if (capture.mode === 'full' && target.region.h > maxHeight) {
      target.region.h = maxHeight;
      limitedByMaxHeight = true;
    }

    return await runFrames(capture, settings, target, alreadyVisible, visibleNow, warnings, limitedByMaxHeight);
  } finally {
    // Always restore the page, even on cancel/error.
    if (!alreadyVisible) {
      await callAgent(tabId, { kind: 'agent.restore', session: capture.id }, 5000).catch(() => {});
    }
    for (const css of cssInserted) {
      await chrome.scripting.removeCSS({ target: { tabId, frameIds: [0] }, css, origin: 'USER' }).catch(() => {});
    }
  }
}

async function currentVisibleContent(tabId: number, scroller: ScrollerRef): Promise<Rect> {
  return (await scrollerInfo(tabId, scroller)).content;
}

function frameStatus(capture: ActiveCapture, done: number, total: number): void {
  setStatus({
    phase: 'capturing',
    mode: capture.mode,
    progress: total > 0 ? done / total : undefined,
    frame: done,
    frames: total,
    canStop: capture.mode === 'full',
    message: total > 1 ? `Capturing ${done} of ${total}…` : 'Capturing…',
  });
}

async function captureLimits(): Promise<CanvasLimits> {
  const limits: CanvasLimits = { ...DEFAULT_CANVAS_LIMITS, maxDimension: Math.min(32767, probeMaxCanvasDimension()) };
  if (__FRAMESHOT_E2E__) {
    // Test-only: lets E2E tests exercise splitting/scaling without huge pages.
    const o = (await chrome.storage.local.get('frameshot.e2e.limits'))['frameshot.e2e.limits'] as Partial<CanvasLimits> | undefined;
    if (o) return { ...limits, ...o };
  }
  return limits;
}

async function runFrames(
  capture: ActiveCapture,
  settings: Settings,
  target: Target,
  alreadyVisible: boolean,
  visibleNow: Rect,
  warnings: string[],
  limitedByMaxHeightInitially: boolean,
): Promise<CaptureOutcome> {
  void visibleNow;
  const { tabId, windowId } = capture;
  const limits = await captureLimits();
  const maxHeight = settings.capture.maxPageHeight;
  let limitedByMaxHeight = limitedByMaxHeightInitially;
  let heightChanged = false;
  let partial = false;

  // ── Frame 0 ──
  const multi = !alreadyVisible;
  const firstRows = target.region.h > target.view.h + 0.5 ? 2 : 1;
  let geom0: FrameGeometry;
  if (multi) {
    const step0 = planScrollSteps(target.region, target.view, {
      x: Math.max(0, target.contentSize.w - target.view.w),
      y: Math.max(0, target.contentSize.h - target.view.h),
    })[0];
    geom0 = await callAgent(tabId, {
      kind: 'agent.scroll',
      session: capture.id,
      scroller: target.scroller,
      x: step0.x,
      y: step0.y,
      fixed: fixedFor(settings, 0, firstRows),
      settleMs: settings.capture.settleDelayMs,
    });
  } else {
    const info = await scrollerInfo(tabId, target.scroller);
    const m = await callAgent(tabId, { kind: 'agent.measure' });
    geom0 = {
      content: info.content,
      viewport: info.viewport,
      scrollWidth: info.scrollWidth,
      scrollHeight: info.scrollHeight,
      bottomFixedHeight: 0,
      innerWidth: m.innerWidth,
      innerHeight: m.innerHeight,
      devicePixelRatio: m.devicePixelRatio,
    };
  }
  if (capture.cancelled) throw new CaptureError('Capture cancelled.', 'cancelled');
  await assertTabVisible(tabId, windowId);
  frameStatus(capture, 0, multi ? 0 : 1);
  const bmp0 = await captureFrame(windowId);
  const captureScale = frameScale(bmp0.width, geom0.innerWidth, geom0.devicePixelRatio);
  if (!Number.isFinite(captureScale) || captureScale <= 0) {
    bmp0.close();
    throw new CaptureError('Could not determine the screen scale of this page.');
  }
  let outputScale = captureScale;
  if (target.region.w * captureScale > limits.maxDimension) {
    outputScale = limits.maxDimension / target.region.w;
    warnings.push(
      `This page is wider than your browser's maximum image size, so it was scaled to ${Math.round((outputScale / captureScale) * 100)}% to fit.`,
    );
  }

  const planner = new StitchPlanner({ ...target.region }, captureScale, outputScale);
  const segs = new SegmentedCanvas(planner.outputWidth, planner.outputHeight, limits);
  const view = { w: geom0.content.w, h: geom0.content.h };
  const overlap = overlapFor(captureScale);
  let contentSize = { ...target.contentSize };
  const maxScrollOf = () => ({ x: Math.max(0, contentSize.w - view.w), y: Math.max(0, contentSize.h - view.h) });
  let steps: ScrollStep[] = multi
    ? planScrollSteps(planner.region, view, maxScrollOf(), { x: overlap, y: overlap })
    : [{ row: 0, col: 0, rows: 1, cols: 1, x: geom0.content.x, y: geom0.content.y }];

  try {
    const op0 = planner.addFrame(
      {
        row: 0,
        col: 0,
        content: geom0.content,
        viewport: geom0.viewport,
        bottomFixedHeight: geom0.bottomFixedHeight,
        isLastRow: steps[0].rows === 1,
      },
      bmp0,
    );
    if (op0) segs.draw(bmp0, op0);
    bmp0.close();
    frameStatus(capture, 1, steps.length);

    // ── Remaining frames ──
    for (let i = 1; i < steps.length; i++) {
      if (capture.cancelled) throw new CaptureError('Capture cancelled.', 'cancelled');
      if (capture.stopRequested) break;
      const step = steps[i];
      const geom = await callAgent(tabId, {
        kind: 'agent.scroll',
        session: capture.id,
        scroller: target.scroller,
        x: step.x,
        y: step.y,
        fixed: fixedFor(settings, step.row, step.rows),
        settleMs: settings.capture.settleDelayMs,
      });
      if (Math.abs(geom.innerWidth - geom0.innerWidth) > 0.5) {
        throw new CaptureError('The window was resized or zoomed during capture. Please try again without resizing.');
      }

      // Infinite scroll / lazy content: the page may grow (or shrink) as we go.
      if (target.growable) {
        const pageH = geom.scrollHeight - planner.region.y;
        const curH = planner.region.h;
        let newH = curH;
        if (pageH > curH + 1 && !limitedByMaxHeight) {
          newH = Math.min(pageH, maxHeight);
          if (pageH > maxHeight) limitedByMaxHeight = true;
        } else if (pageH < curH - 1) {
          newH = pageH;
        }
        if (newH !== curH) {
          heightChanged = true;
          planner.setRegionHeight(newH);
          segs.setTotalHeight(planner.outputHeight);
          contentSize = { w: geom.scrollWidth, h: geom.scrollHeight };
          const replanned = planScrollSteps(planner.region, view, maxScrollOf(), { x: overlap, y: overlap });
          const next = replanned.findIndex((s) => s.row > step.row || (s.row === step.row && s.col > step.col));
          steps = [...steps.slice(0, i + 1), ...(next >= 0 ? replanned.slice(next) : [])];
          // The current step keeps its scroll, but its row count may differ now.
          steps[i] = { ...step, rows: replanned[0]?.rows ?? step.rows };
        }
      }

      await assertTabVisible(tabId, windowId);
      const bmp = await captureFrame(windowId);
      try {
        if (Math.abs(frameScale(bmp.width, geom.innerWidth, geom.devicePixelRatio) - captureScale) / captureScale > 0.01) {
          throw new CaptureError('The page zoom changed during capture. Please try again.');
        }
        const cur = steps[i];
        const op = planner.addFrame(
          {
            row: cur.row,
            col: cur.col,
            content: geom.content,
            viewport: geom.viewport,
            bottomFixedHeight: geom.bottomFixedHeight,
            isLastRow: cur.row === cur.rows - 1,
          },
          bmp,
        );
        if (op) segs.draw(bmp, op);
      } finally {
        bmp.close();
      }
      // Segments well above the current frame can no longer change; encode them now.
      const safeTop = (geom.content.y - view.h - planner.region.y) * outputScale;
      if (safeTop > 0) segs.finalizeAbove(Math.floor(safeTop));
      frameStatus(capture, i + 1, steps.length);
    }

    if (capture.stopRequested) {
      const h = planner.contiguousHeight();
      if (h < 1) throw new CaptureError('Capture cancelled.', 'cancelled');
      const full = planner.region.h;
      if (h < full - 1) {
        planner.setRegionHeight(h);
        segs.setTotalHeight(planner.outputHeight);
        partial = true;
        warnings.push(
          `You stopped the capture early, so it contains the top ${Math.round(h).toLocaleString('en-US')} px of the page${limitedByMaxHeight ? '' : ` (out of at least ${Math.round(full).toLocaleString('en-US')} px)`}.`,
        );
      }
    } else {
      // Prove completeness; retry any gaps (e.g. scroll snapping, layout shifts).
      for (let round = 0; round < 2 && planner.gaps().length > 0; round++) {
        for (const gap of planner.gaps()) {
          if (capture.cancelled) throw new CaptureError('Capture cancelled.', 'cancelled');
          // Place the gap well inside the viewport (not at its edge) so scroll
          // snapping cannot make the retry miss it again.
          const aim = retryScrollTarget(gap, view);
          const geom = await callAgent(tabId, {
            kind: 'agent.scroll',
            session: capture.id,
            scroller: target.scroller,
            x: aim.x,
            y: aim.y,
            fixed: fixedFor(settings, gap.y <= planner.region.y + 1 ? 0 : 1, 3),
            settleMs: settings.capture.settleDelayMs,
          });
          await assertTabVisible(tabId, windowId);
          const bmp = await captureFrame(windowId);
          try {
            for (const op of planner.addGapFill({ row: 0, col: 0, content: geom.content, viewport: geom.viewport }, bmp)) {
              segs.draw(bmp, op);
            }
          } catch (err) {
            if (err instanceof CaptureError) throw err;
            break;
          } finally {
            bmp.close();
          }
        }
      }
      const gaps = planner.gaps();
      if (gaps.length > 0) {
        const missing = Math.round(gaps.reduce((sum, g) => sum + g.h, 0));
        throw new CaptureError(
          `FrameShot could not capture every part of this page (about ${missing.toLocaleString('en-US')} px missing) because the page kept moving or changing. Nothing was saved. Try again, or increase "Delay between scroll steps" in Settings.`,
          'incomplete',
        );
      }
    }

    if (limitedByMaxHeight) {
      partial = true;
      warnings.push(
        `This page is taller than your maximum capture height (${maxHeight.toLocaleString('en-US')} px), so only the top ${maxHeight.toLocaleString('en-US')} px were captured. You can raise the limit in Settings.`,
      );
    }
    if (heightChanged) {
      warnings.push(
        'The page changed height while it was being captured (for example, content loaded as it scrolled). Check the result for repeated or missing content.',
      );
    }

    setStatus({ phase: 'stitching', mode: capture.mode, message: 'Finishing image…' });
    let segments = await segs.finish();
    if (segments.length > 1) {
      if (settings.capture.oversize === 'scale') {
        const composed = await composeScaled(segments, planner.outputWidth, planner.outputHeight, limits);
        warnings.push(
          `This page was too large for one full-resolution image in your browser, so it was scaled to ${Math.round(composed.factor * 100)}% to fit. Choose "Split into parts" in Settings to keep full resolution.`,
        );
        segments = [composed.segment];
      } else {
        warnings.push(
          `This page was too large for a single image in your browser, so it was saved as ${segments.length} parts at full resolution.`,
        );
      }
    }
    return { segments, warnings, partial, scale: outputScale };
  } catch (err) {
    segs.dispose();
    throw err;
  }
}

async function composeScaled(
  segments: FinishedSegment[],
  width: number,
  height: number,
  limits: CanvasLimits,
): Promise<{ segment: FinishedSegment; factor: number }> {
  const factor = fitScale(width, height, limits);
  const w = Math.max(1, Math.round(width * factor));
  const h = Math.max(1, Math.round(height * factor));
  const canvas = createCanvas(w, h);
  const ctx = get2d(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  let y = 0;
  for (const seg of segments) {
    const bmp = await createImageBitmap(seg.blob);
    const top = Math.round(y * factor);
    const btm = Math.round((y + seg.height) * factor);
    ctx.drawImage(bmp, 0, top, w, btm - top);
    bmp.close();
    y += seg.height;
  }
  const [blob, thumb] = await Promise.all([canvasToBlob(canvas, 'png'), makeThumbnail(canvas)]);
  return { segment: { index: 0, blob, thumb, dhash: dHash(canvas), width: w, height: h }, factor };
}

// ── Saving ────────────────────────────────────────────────────────────────

async function saveOutcome(
  capture: ActiveCapture,
  outcome: CaptureOutcome,
  source: CaptureSource,
  settings: Settings,
): Promise<string[]> {
  void settings;
  const now = Date.now();
  const baseName = defaultItemName({ title: source.title, domain: source.domain, date: new Date(now) });
  const groupId = outcome.segments.length > 1 ? newId() : undefined;
  const ids: string[] = [];
  for (const seg of outcome.segments) {
    const id = newId();
    const count = outcome.segments.length;
    const item: LibraryItem = {
      id,
      name: count > 1 ? `${baseName} (part ${seg.index + 1} of ${count})` : baseName,
      createdAt: now + seg.index,
      updatedAt: now + seg.index,
      kind: 'capture',
      mode: capture.mode,
      source,
      width: seg.width,
      height: seg.height,
      byteSize: seg.blob.size,
      mimeType: seg.blob.type || 'image/png',
      favorite: false,
      collectionId: null,
      tags: [],
      hasEdits: false,
      group: groupId ? { id: groupId, index: seg.index, count } : undefined,
      warnings: outcome.warnings,
      partial: outcome.partial,
      scale: outcome.scale,
      dhash: seg.dhash,
    };
    await addItem(item, seg.blob, seg.thumb);
    ids.push(id);
  }
  return ids;
}

export async function openEditor(itemId: string, nearTabId?: number): Promise<void> {
  const url = chrome.runtime.getURL(`/studio.html#/edit/${encodeURIComponent(itemId)}`);
  let index: number | undefined;
  let windowId: number | undefined;
  if (nearTabId !== undefined) {
    const tab = await chrome.tabs.get(nearTabId).catch(() => null);
    if (tab) {
      index = tab.index + 1;
      windowId = tab.windowId;
    }
  }
  await chrome.tabs.create({ url, index, windowId, openerTabId: nearTabId });
}

