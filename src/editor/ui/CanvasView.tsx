import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { setTextMeasurer } from '../model/objects';
import type { EditorStore } from '../model/store';
import type { TextObject } from '../model/types';
import type { BaseImage } from '../render/base';
import { fontFor, lineHeight, measureText } from '../render/draw';
import { ViewRenderer } from '../render/view';
import { CanvasInteraction } from './interaction';

setTextMeasurer(measureText);

export interface CanvasHandle {
  size(): { width: number; height: number };
  interaction: CanvasInteraction | null;
}

export function CanvasView({
  store,
  base,
  dark,
  handleRef,
  onReady,
}: {
  store: EditorStore;
  base: BaseImage;
  dark: boolean;
  handleRef: React.MutableRefObject<CanvasHandle | null>;
  onReady?: (size: { width: number; height: number }) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ViewRenderer | null>(null);
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const frame = useRef(0);
  const readyRef = useRef(false);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [, force] = useState(0);

  const scheduleRender = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return;
      const it = interactionRef.current;
      renderer.render(canvas, store.getState(), {
        draft: it?.state.draft,
        marquee: it?.state.marquee,
        live: it?.state.live,
        hoverId: it?.state.hoverId,
        dark,
      });
    });
  };

  useEffect(() => {
    rendererRef.current = new ViewRenderer(base);
    return () => rendererRef.current?.dispose();
  }, [base]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const it = new CanvasInteraction(store, canvas, () => {
      scheduleRender();
      force((n) => n + 1);
    });
    interactionRef.current = it;
    handleRef.current = {
      size: () => ({ width: wrapRef.current?.clientWidth ?? 800, height: wrapRef.current?.clientHeight ?? 600 }),
      interaction: it,
    };
    canvas.addEventListener('pointerdown', it.onPointerDown);
    canvas.addEventListener('pointermove', it.onPointerMove);
    canvas.addEventListener('pointerup', it.onPointerUp);
    canvas.addEventListener('pointercancel', it.onPointerUp);
    canvas.addEventListener('wheel', it.onWheel, { passive: false });
    canvas.addEventListener('dblclick', it.onDoubleClick);
    return () => {
      canvas.removeEventListener('pointerdown', it.onPointerDown);
      canvas.removeEventListener('pointermove', it.onPointerMove);
      canvas.removeEventListener('pointerup', it.onPointerUp);
      canvas.removeEventListener('pointercancel', it.onPointerUp);
      canvas.removeEventListener('wheel', it.onWheel);
      canvas.removeEventListener('dblclick', it.onDoubleClick);
      interactionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // Keep the canvas backing store matched to its CSS size × devicePixelRatio.
  useLayoutEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (!readyRef.current && w > 1 && h > 1) {
        readyRef.current = true;
        onReady?.({ width: w, height: h });
      }
      scheduleRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scheduleRender();
  });

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const editing = state.editingTextId ? (state.doc.objects.find((o) => o.id === state.editingTextId) as TextObject | undefined) : undefined;

  return (
    <div ref={wrapRef} className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas" data-testid="editor-canvas-wrap">
      <canvas ref={canvasRef} className="absolute inset-0 touch-none outline-none" aria-label="Screenshot editing canvas" role="img" data-testid="editor-canvas" />
      {editing && <TextEditor key={editing.id} store={store} text={editing} />}
    </div>
  );
}

function TextEditor({ store, text }: { store: EditorStore; text: TextObject }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { zoom, panX, panY } = store.getState().view;
  const [value, setValue] = useState(text.text);
  const done = useRef(false);

  const ready = useRef(false);
  useEffect(() => {
    const el = ref.current!;
    // Focus after the current pointer event has fully finished.
    const raf = requestAnimationFrame(() => {
      el.focus();
      el.select();
      ready.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const s = store.getState();
    const exists = s.doc.objects.some((o) => o.id === text.id);
    const trimmed = value.replace(/\s+$/, '');
    if (exists && trimmed.length === 0) {
      // Empty text is removed (as part of the same gesture/undo step).
      store.updateTransient({ ...s.doc, objects: s.doc.objects.filter((o) => o.id !== text.id) });
      store.endGesture();
    } else if (exists && save) {
      store.updateObject(text.id, { text: trimmed }, true);
      store.endGesture();
    } else {
      store.cancelGesture();
    }
    store.setEditingText(null);
    store.select(exists && trimmed ? [text.id] : []);
  };

  const m = measureText({ ...text, text: value || ' ' });
  const width = Math.max(m.width + text.size, 60 / zoom);
  return (
    <textarea
      ref={ref}
      value={value}
      aria-label="Edit text"
      spellCheck={false}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => ready.current && finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          finish(true);
        }
      }}
      className="absolute resize-none overflow-hidden border-0 bg-transparent p-0 outline outline-1 outline-dashed outline-primary/70"
      style={{
        left: text.x * zoom + panX,
        top: text.y * zoom + panY,
        width: width * zoom,
        height: Math.max(m.height, lineHeight(text.size)) * zoom + 4,
        font: fontFor({ ...text, size: text.size * zoom }),
        lineHeight: `${lineHeight(text.size) * zoom}px`,
        color: text.color,
        background: text.background ?? 'transparent',
        caretColor: text.color,
        whiteSpace: 'pre',
      }}
    />
  );
}
