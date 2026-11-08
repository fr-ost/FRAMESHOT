/** Side-by-side, overlay and pixel-difference comparison of two screenshots. */
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { LibraryItem } from '../core/types';
import { renderItemCanvas } from '../export/service';
import { navigate } from '../ui/hooks';
import { Button, SegmentedControl, Slider, Spinner } from '../ui/primitives';

type Mode = 'side' | 'overlay' | 'difference';

export function ComparePage({ a, b }: { a: string; b: string }) {
  const [data, setData] = useState<{ a: { canvas: OffscreenCanvas; item: LibraryItem }; b: { canvas: OffscreenCanvas; item: LibraryItem } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('side');
  const [mix, setMix] = useState(50);
  const [diffStats, setDiffStats] = useState<string>('');
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([renderItemCanvas(a), renderItemCanvas(b)])
      .then(([ra, rb]) => alive && setData({ a: ra, b: rb }))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [a, b]);

  useEffect(() => {
    if (!data || mode === 'side' || !ref.current) return;
    const ca = data.a.canvas;
    const cb = data.b.canvas;
    const w = Math.max(ca.width, cb.width);
    const h = Math.max(ca.height, cb.height);
    const scale = Math.min(1, 4096 / Math.max(w, h));
    const canvas = ref.current;
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(ca, 0, 0, ca.width * scale, ca.height * scale);
    if (mode === 'overlay') {
      ctx.globalAlpha = mix / 100;
      ctx.drawImage(cb, 0, 0, cb.width * scale, cb.height * scale);
      ctx.globalAlpha = 1;
      setDiffStats('');
    } else {
      ctx.globalCompositeOperation = 'difference';
      ctx.drawImage(cb, 0, 0, cb.width * scale, cb.height * scale);
      ctx.globalCompositeOperation = 'source-over';
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let changed = 0;
      for (let i = 0; i < img.length; i += 4) if (img[i] + img[i + 1] + img[i + 2] > 24) changed++;
      setDiffStats(`${((changed / (canvas.width * canvas.height)) * 100).toFixed(2)}% of pixels differ`);
    }
  }, [data, mode, mix]);

  return (
    <div className="flex h-full flex-col">
      <header className="fr-glass relative z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Library
        </Button>
        <h1 className="text-[15px] font-semibold tracking-tight">Compare screenshots</h1>
        <div className="ml-auto flex items-center gap-3">
          {mode === 'overlay' && (
            <div className="w-40">
              <Slider label="Blend" min={0} max={100} value={mix} onChange={setMix} format={(v) => `${v}%`} id="fr-mix" />
            </div>
          )}
          {diffStats && <span className="text-[12px] text-fg-subtle">{diffStats}</span>}
          <SegmentedControl
            label="Comparison mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'side', label: 'Side by side' },
              { value: 'overlay', label: 'Overlay' },
              { value: 'difference', label: 'Difference' },
            ]}
          />
        </div>
      </header>
      <div className="fr-canvas-bg fr-scroll min-h-0 flex-1 overflow-auto p-6">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !data ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-fg-subtle">
            <Spinner /> Loading…
          </div>
        ) : mode === 'side' ? (
          <div className="grid grid-cols-2 gap-6">
            {[data.a, data.b].map((d) => (
              <figure key={d.item.id} className="min-w-0">
                <figcaption className="mb-2.5 truncate text-[13px] font-semibold text-fg-muted">{d.item.name}</figcaption>
                <CanvasImage canvas={d.canvas} />
              </figure>
            ))}
          </div>
        ) : (
          <canvas ref={ref} className="mx-auto block max-w-full shadow-pop" />
        )}
      </div>
    </div>
  );
}

function CanvasImage({ canvas }: { canvas: OffscreenCanvas }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const scale = Math.min(1, 2048 / canvas.width);
    el.width = Math.round(canvas.width * scale);
    el.height = Math.round(canvas.height * scale);
    el.getContext('2d')!.drawImage(canvas, 0, 0, el.width, el.height);
  }, [canvas]);
  return <canvas ref={ref} className="fr-animate-in block w-full rounded-[6px] shadow-pop" />;
}
