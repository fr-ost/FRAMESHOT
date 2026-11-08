import {
  ArrowRight,
  Camera,
  Crop,
  Download,
  EyeOff,
  LayoutTemplate,
  Lock,
  MousePointerClick,
  ScrollText,
  Sparkles,
  SquareDashedMousePointer,
  Video,
  Wand2,
  Webcam,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { BRAND } from '../core/brand';
import { navigate } from '../ui/hooks';
import { Button, Credits, Kbd, Logo } from '../ui/primitives';

function Feature({ icon, title, children, i }: { icon: ReactNode; title: string; children: ReactNode; i: number }) {
  return (
    <div className="fr-card fr-lift fr-stagger group overflow-hidden p-5" style={{ '--i': i } as CSSProperties}>
      <div className="fr-accent-bg pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30" aria-hidden />
      <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary-soft text-primary transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" style={{ transitionTimingFunction: 'var(--fr-ease-spring)' }}>
        {icon}
      </div>
      <h3 className="relative text-[15px] font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-1.5 text-[13px] leading-relaxed text-fg-subtle">{children}</p>
    </div>
  );
}

const PROMISES = ['Free forever', 'Unlimited captures', 'No watermarks', 'No subscriptions', 'No account required', 'No locked features', 'Stays on your device'];

const RECORD_POINTS = [
  { icon: <Video size={19} />, title: 'Tab, window or screen', text: 'Chrome’s own picker: you choose exactly what is recorded.' },
  { icon: <Webcam size={19} />, title: 'Sound & camera', text: 'Tab sound and your microphone, plus an optional camera bubble.' },
  { icon: <Download size={19} />, title: 'MP4 that plays anywhere', text: 'Pause, resume, then download or save any frame as a screenshot.' },
];

export function WelcomePage() {
  return (
    <div className="fr-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 pb-12 pt-10">
        <nav className="fr-animate-in flex items-center justify-between">
          <Logo size={34} />
          <Button variant="ghost" onClick={() => navigate('/')} icon={<ArrowRight size={16} />}>
            Open the library
          </Button>
        </nav>

        {/* Hero */}
        <section className="relative mt-16 text-center">
          <div className="fr-animate-in mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-fg-muted shadow-card backdrop-blur-xl">
            <Sparkles size={13} className="text-primary" /> Free screenshots and screen recording, forever
          </div>
          <h1 className="fr-animate-in mx-auto max-w-4xl text-[clamp(38px,6vw,68px)] font-semibold leading-[1.02] tracking-[-0.035em]" style={{ animationDelay: '60ms' }}>
            Capture the web.
            <br />
            <span className="fr-accent-text">Edit every detail.</span>
          </h1>
          <p className="fr-animate-in mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-fg-muted" style={{ animationDelay: '120ms' }}>
            Full pages, selected areas and single elements, captured in one click, plus a built-in screen recorder with sound and a camera bubble. Annotate, hide sensitive
            information, compose polished visuals, and export to PNG, JPG, WebP, PDF or MP4. Everything happens locally in your browser.
          </p>
          <div className="fr-animate-in mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '180ms' }}>
            <Button variant="primary" size="lg" icon={<Camera size={18} />} onClick={() => navigate('/')}>
              Start capturing
            </Button>
            <Button size="lg" icon={<Video size={18} />} onClick={() => navigate('/record')}>
              Record your screen
            </Button>
          </div>
          <ul className="fr-animate-in mt-10 flex flex-wrap justify-center gap-2" style={{ animationDelay: '240ms' }} aria-label="Promises">
            {PROMISES.map((t) => (
              <li key={t} className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-fg-muted backdrop-blur-xl">
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* How to capture */}
        <section className="mt-20">
          <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Start a capture in seconds</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature i={0} icon={<MousePointerClick size={19} />} title="From the toolbar">
              Pin FrameShot (puzzle icon → pin), click it on any page, and choose a mode.
            </Feature>
            <Feature i={1} icon={<ScrollText size={19} />} title="Right-click any page">
              Every capture mode lives in the <strong className="text-fg-muted">FrameShot</strong> context menu.
            </Feature>
            <Feature i={2} icon={<SquareDashedMousePointer size={19} />} title="Area & element">
              Drag to select (scroll to extend), or hover and click any element or scrolling panel.
            </Feature>
            <Feature i={3} icon={<Wand2 size={19} />} title="Smart full page">
              Sticky headers appear once, lazy images load first, and long pages stitch seamlessly.
            </Feature>
          </div>
          <div className="fr-card fr-stagger mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 py-4 text-[13px] text-fg-muted" style={{ '--i': 4 } as CSSProperties}>
            <span className="font-medium text-fg">Shortcuts</span>
            {[
              ['V', 'Visible area'],
              ['F', 'Full page'],
              ['A', 'Selected area'],
              ['E', 'Element'],
            ].map(([key, label]) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <Kbd>Alt</Kbd>
                <Kbd>Shift</Kbd>
                <Kbd>{key}</Kbd>
                <span>{label}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Esc</Kbd> cancel
            </span>
          </div>
        </section>

        {/* Record */}
        <section className="mt-16">
          <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Record your screen, too</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {RECORD_POINTS.map((p, i) => (
              <Feature key={p.title} i={5 + i} icon={p.icon} title={p.title}>
                {p.text}
              </Feature>
            ))}
          </div>
        </section>

        {/* Then edit */}
        <section className="mt-16">
          <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Then edit, protect and share</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature i={5} icon={<Crop size={19} />} title="Edit">
              Crop, resize, rotate, and annotate with arrows, shapes, text, highlights and numbered steps.
            </Feature>
            <Feature i={6} icon={<EyeOff size={19} />} title="Protect">
              Blur, pixelate or permanently redact. Redactions are flattened into the exported pixels.
            </Feature>
            <Feature i={7} icon={<LayoutTemplate size={19} />} title="Compose">
              Gradients, padding, rounded corners, shadows and window frames for polished visuals.
            </Feature>
            <Feature i={8} icon={<Download size={19} />} title="Export">
              PNG, JPG, WebP or multi-page PDF, or copy to the clipboard. Never a watermark.
            </Feature>
          </div>
        </section>

        {/* Privacy */}
        <section className="fr-card fr-stagger mt-16 flex flex-col items-center gap-4 overflow-hidden px-8 py-10 text-center sm:flex-row sm:text-left" style={{ '--i': 9 } as CSSProperties}>
          <div className="fr-accent-bg flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-white shadow-glow">
            <Lock size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-[17px] font-semibold tracking-tight">Private by design</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-fg-subtle">
              No servers, no accounts, no analytics. FrameShot works offline, and its pages are blocked from making any network request.
            </p>
          </div>
          <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => navigate('/')}>
            Open the library
          </Button>
        </section>

        <footer className="mt-14 space-y-2 text-center">
          <p className="text-[12px] text-fg-subtle">{BRAND.principle}</p>
          <Credits />
        </footer>
      </div>
    </div>
  );
}
