import { Camera, Crop, Download, Lock, MousePointerClick, ScrollText, Sparkles, SquareDashedMousePointer } from 'lucide-react';
import type { ReactNode } from 'react';
import { navigate } from '../ui/hooks';
import { Button, Kbd, Logo } from '../ui/primitives';

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-[13px] text-fg-subtle">{children}</p>
    </div>
  );
}

export function WelcomePage() {
  return (
    <div className="fr-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <Logo size={44} />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Capture the web. Edit every detail. Free forever.</h1>
        <p className="mt-4 max-w-2xl text-[15px] text-fg-muted">
          Capture full webpages, selected areas, and individual elements. Annotate screenshots, hide sensitive information, compose polished visuals, and export in multiple
          formats. Everything happens locally in your browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-[12px] font-medium">
          {['Free forever', 'Unlimited captures', 'No watermarks', 'No subscriptions', 'No account required', 'No locked features', 'Your screenshots stay on your device'].map((t) => (
            <span key={t} className="rounded-full border border-border bg-surface px-3 py-1 text-fg-muted">
              {t}
            </span>
          ))}
        </div>

        <h2 className="mt-12 text-lg font-semibold">Start a capture</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Feature icon={<MousePointerClick size={18} />} title="From the toolbar">
            Pin Frameora (puzzle icon → pin), then click it on any page and choose a capture mode.
          </Feature>
          <Feature icon={<Camera size={18} />} title="With a shortcut">
            <Kbd>Alt</Kbd>+<Kbd>Shift</Kbd>+<Kbd>V</Kbd> visible · <Kbd>F</Kbd> full page · <Kbd>A</Kbd> area · <Kbd>E</Kbd> element. Press <Kbd>Esc</Kbd> to cancel.
          </Feature>
          <Feature icon={<ScrollText size={18} />} title="Right-click any page">
            Choose <strong>Frameora</strong> in the context menu for every capture mode.
          </Feature>
          <Feature icon={<SquareDashedMousePointer size={18} />} title="Area & element picking">
            Drag to select an area (scroll to extend it), or hover and click a single element or scrolling panel.
          </Feature>
        </div>

        <h2 className="mt-12 text-lg font-semibold">Then edit, protect, and share</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Feature icon={<Crop size={18} />} title="Edit">
            Crop, resize, rotate, and annotate with arrows, shapes, text, highlights, and numbered steps.
          </Feature>
          <Feature icon={<Lock size={18} />} title="Protect">
            Blur, pixelate, or permanently redact sensitive details. Redactions are flattened into the exported pixels.
          </Feature>
          <Feature icon={<Download size={18} />} title="Export">
            PNG, JPEG, WebP, or PDF — or copy to the clipboard. Compose polished visuals with backgrounds and frames.
          </Feature>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-5">
          <Sparkles className="text-primary" size={20} />
          <p className="flex-1 text-[13px] text-fg-muted">Frameora works offline and never uploads your screenshots. There is nothing to sign up for.</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Open the library
          </Button>
        </div>
        <p className="mt-8 text-center text-[12px] text-fg-subtle">Frameora by Unique Labs · Useful technology. Accessible to everyone.</p>
      </div>
    </div>
  );
}
