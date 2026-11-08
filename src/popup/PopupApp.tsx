/**
 * Quick Capture popup: one-click capture modes, live progress with cancel /
 * stop-and-save, and recent captures. Small, fast, and delightful.
 */
import { AlertCircle, AppWindow, ArrowRight, Camera, Clock, Crosshair, FileStack, Heart, Images, Mic, MicOff, Pause, Play, Scan, ScrollText, Settings as SettingsIcon, Square, SquareDashedMousePointer, Video, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatDuration, formatRelative } from '../core/format';
import { sendToBackground, STATUS_PORT, type StatusPortMessage } from '../core/messages';
import { checkPageAccess } from '../core/restricted';
import type { CaptureMode, CaptureStatus, LibraryItem } from '../core/types';
import { getThumb, listItems } from '../db/db';
import { updateSettings } from '../core/settings';
import {
  elapsedMs,
  isActivePhase,
  onRecorderState,
  queryRecorder,
  readRecorderState,
  RECORDER_STATE_KEY,
  sendRecorderCommand,
  type RecorderPublicState,
} from '../recorder/channel';
import { bootstrapTheme, useObjectUrl, useSettings, useThemeSync } from '../ui/hooks';
import { Aurora, Badge, Button, Credits, Kbd, Logo, Spinner, cx } from '../ui/primitives';
import { ReviewCard, useReviewPrompt } from '../ui/ReviewPrompt';

bootstrapTheme();

const DELAY_KEY = 'frameshot.popup.delay';
const BUSY = new Set(['waiting', 'preparing', 'loading', 'capturing', 'stitching', 'saving']);

function useActiveTab() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null | undefined>(undefined);
  useEffect(() => {
    const override = new URLSearchParams(location.search).get('tabId');
    if (override) {
      void chrome.tabs.get(Number(override)).then(setTab, () => setTab(null));
      return;
    }
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => setTab(t ?? null));
  }, []);
  return tab;
}

function useStatus(): CaptureStatus | null {
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  useEffect(() => {
    const port = chrome.runtime.connect({ name: STATUS_PORT });
    port.onMessage.addListener((msg: StatusPortMessage) => {
      if (msg.kind === 'status') setStatus(msg.status);
    });
    return () => port.disconnect();
  }, []);
  return status;
}

/** The keyboard shortcuts Chrome actually assigned (they can be unset or changed). */
function useShortcuts(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    void chrome.commands
      .getAll()
      .then((all) => setMap(Object.fromEntries(all.filter((c) => c.name && c.shortcut).map((c) => [c.name!, c.shortcut!]))))
      .catch(() => {});
  }, []);
  return map;
}

/** A recording running in a Studio tab, if any (verified to be alive). */
function useRecording(): RecorderPublicState | null {
  const [state, setState] = useState<RecorderPublicState | null>(null);
  useEffect(() => {
    let alive = true;
    void readRecorderState().then(async (s) => {
      if (!alive || !s || !isActivePhase(s.phase)) return;
      setState(s);
      // The page may have been closed or crashed without clearing its state.
      const live = await queryRecorder(500);
      if (!alive) return;
      if (!live) {
        setState(null);
        void chrome.storage.session.remove(RECORDER_STATE_KEY).catch(() => {});
      } else setState(live);
    });
    const off = onRecorderState((s) => setState(s && isActivePhase(s.phase) ? s : null));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

export function PopupApp() {
  const settings = useSettings();
  useThemeSync(settings.theme);
  const tab = useActiveTab();
  const status = useStatus();
  const recording = useRecording();
  const keys = useShortcuts();
  const [startedAt, setStartedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<LibraryItem[]>([]);
  const [delay, setDelay] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(DELAY_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    void listItems()
      .then((items) => setRecent(items.slice(0, 4)))
      .catch(() => setRecent([]));
  }, [status?.phase]);

  const access = tab === undefined ? { allowed: true as const } : checkPageAccess(tab?.url);
  const live = status && (BUSY.has(status.phase) || status.phase === 'selecting' || (status.updatedAt >= startedAt && startedAt > 0));
  const busy = !!status && BUSY.has(status.phase);
  const disabled = !access.allowed || busy;

  const start = async (mode: CaptureMode) => {
    setError(null);
    setStartedAt(Date.now());
    const delayMs = mode === 'visible' ? delay * 1000 : 0;
    const res = await sendToBackground({ kind: 'capture.start', mode, tabId: tab?.id, delayMs });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Interactive and delayed modes need the page, so get out of the way.
    if (mode === 'area' || mode === 'element' || mode === 'scrollable' || delayMs > 0) window.close();
  };

  const open = (route: string) => {
    void sendToBackground({ kind: 'studio.open', route }).then(() => window.close());
  };

  return (
    <div className="relative w-[360px] overflow-hidden text-fg">
      <Aurora />
      <div className="relative z-10">
        <header className="flex items-center justify-between px-4 pb-2 pt-3.5">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <Badge tone="primary">FREE</Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={settings.sounds.enabled ? 'Turn sounds off' : 'Turn sounds on'}
              title={settings.sounds.enabled ? 'Sounds on' : 'Sounds off'}
              aria-pressed={!settings.sounds.enabled}
              onClick={() => void updateSettings({ sounds: { enabled: !settings.sounds.enabled } })}
              data-testid="popup-sound"
              className="fr-press inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {settings.sounds.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={() => open('/')}
              className="fr-press inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <AppWindow size={15} /> Studio
            </button>
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() => open('/settings')}
              className="fr-press inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </header>

        {live && status && status.phase !== 'idle' ? (
          <StatusView status={status} onDismiss={() => setStartedAt(0)} onOpen={(id) => open(`/edit/${encodeURIComponent(id)}`)} />
        ) : (
          <main className="space-y-2.5 px-3 pb-3">
            {recording && <RecordingCard state={recording} />}
            {!access.allowed && (
              <div className="fr-animate-in flex gap-2 rounded-[14px] border border-warning/25 bg-warning-soft p-3 text-[12px] leading-snug text-warning">
                <AlertCircle size={15} className="mt-px shrink-0" />
                <span>{access.reason} You can still open the Studio to edit, import, and organize screenshots.</span>
              </div>
            )}
            {error && (
              <div role="alert" className="fr-shake flex gap-2 rounded-[14px] border border-danger/25 bg-danger-soft p-3 text-[12px] leading-snug text-danger-soft-fg">
                <AlertCircle size={15} className="mt-px shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Hero action */}
            <button
              type="button"
              onClick={() => void start('full')}
              disabled={disabled}
              data-testid="capture-full"
              className="fr-btn-primary fr-press group flex h-[92px] w-full items-center gap-4 rounded-[18px] px-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
              style={{ '--i': 0 } as CSSProperties}
            >
              <span className="fr-hero-glow" aria-hidden />
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white/18 ring-1 ring-white/25 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3" style={{ transitionTimingFunction: 'var(--fr-ease-spring)' }}>
                <ScrollText size={24} />
                <span className="fr-scan" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-tight">Full page</span>
                <span className="block text-[12px] text-white/75">Scroll &amp; capture everything</span>
              </span>
              <span className="flex flex-col items-end gap-1.5">
                {keys['capture-full'] && <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/85">{keys['capture-full']}</span>}
                <ArrowRight size={16} className="text-white/80 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <ModeCard i={1} icon={<Square size={19} />} label="Visible" hint={keys['capture-visible'] ?? ''} onClick={() => void start('visible')} disabled={disabled} testId="capture-visible" fullLabel="Visible area" />
              <ModeCard i={2} icon={<SquareDashedMousePointer size={19} />} label="Area" hint={keys['capture-area'] ?? ''} onClick={() => void start('area')} disabled={disabled} testId="capture-area" fullLabel="Selected area" />
              <ModeCard i={3} icon={<Crosshair size={19} />} label="Element" hint={keys['capture-element'] ?? ''} onClick={() => void start('element')} disabled={disabled} testId="capture-element" fullLabel="Element" />
            </div>

            {!recording && (
              <button
                type="button"
                onClick={() => open('/record')}
                data-testid="record-screen"
                className="fr-stagger fr-lift fr-press fr-spot group relative flex h-[58px] w-full items-center gap-3 rounded-[16px] border border-border bg-surface-solid/90 px-3 text-left shadow-card"
                style={{ '--i': 4 } as CSSProperties}
              >
                <span className="fr-rec-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]">
                  <Video size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-tight">Record screen</span>
                  <span className="block text-[11.5px] text-fg-subtle">Tab, window or desktop · sound · camera</span>
                </span>
                <ArrowRight size={15} className="text-fg-subtle transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            )}

            <div className="fr-stagger flex items-center gap-2" style={{ '--i': 5 } as CSSProperties}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void start('scrollable')}
                className="fr-press flex h-10 flex-1 items-center gap-2 rounded-[13px] border border-border bg-surface-solid/90 px-3 text-[13px] font-medium text-fg-muted shadow-card transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50"
                data-testid="capture-scrollable"
              >
                <FileStack size={15} className="text-primary" /> Scrolling panel
              </button>
              <label
                className="flex h-10 items-center gap-1.5 rounded-[13px] border border-border bg-surface-solid/90 px-2.5 text-[12px] text-fg-muted shadow-card focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
                title="Delay before capturing the visible area (useful for menus and hover states)"
              >
                <Clock size={14} className="text-primary" />
                <span className="sr-only">Delay for visible capture</span>
                <select
                  value={delay}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDelay(v);
                    try {
                      localStorage.setItem(DELAY_KEY, String(v));
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="cursor-pointer bg-transparent text-[12px] font-medium text-fg focus:outline-none"
                  aria-label="Delay for visible capture"
                >
                  <option value={0}>No delay</option>
                  <option value={3}>3 s delay</option>
                  <option value={5}>5 s delay</option>
                  <option value={10}>10 s delay</option>
                </select>
              </label>
            </div>

            <Recent
              items={recent}
              onOpen={(id) => {
                const item = recent.find((i) => i.id === id);
                open(`/${item?.kind === 'recording' ? 'play' : 'edit'}/${encodeURIComponent(id)}`);
              }}
              onLibrary={() => open('/')}
            />
          </main>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
          <Credits align="start" />
          <button
            type="button"
            onClick={() => open('/donate')}
            data-testid="popup-donate"
            className="fr-press group inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Heart size={12} fill="currentColor" className="transition-transform duration-300 group-hover:scale-125" style={{ transitionTimingFunction: 'var(--fr-ease-spring)' }} /> Donate
          </button>
        </footer>
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  label,
  fullLabel,
  hint,
  onClick,
  disabled,
  testId,
  i,
}: {
  icon: ReactNode;
  label: string;
  fullLabel: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  testId: string;
  i: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-label={fullLabel}
      title={hint ? `${fullLabel} (${hint})` : fullLabel}
      className="fr-stagger fr-lift fr-press fr-spot group relative flex h-[88px] flex-col items-center justify-center gap-2 rounded-[16px] border border-border bg-surface-solid/90 text-center shadow-card disabled:cursor-not-allowed disabled:opacity-50"
      style={{ '--i': i } as CSSProperties}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary-soft text-primary transition-[transform,background-color,color] duration-500 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:bg-primary group-hover:text-white"
        style={{ transitionTimingFunction: 'var(--fr-ease-spring)' }}
      >
        {icon}
      </span>
      <span>
        <span className="block text-[12.5px] font-semibold leading-tight">{label}</span>
        <span className="block h-[14px] text-[10px] text-fg-subtle">{hint}</span>
      </span>
    </button>
  );
}

function ProgressRing({ value }: { value: number | null }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <defs>
          <linearGradient id="fr-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--fr-accent-1)" />
            <stop offset="100%" stopColor="var(--fr-accent-3)" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--fr-surface-3)" strokeWidth="5" />
        {value === null ? (
          <circle cx="32" cy="32" r={r} fill="none" stroke="url(#fr-ring)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * 0.28} ${c}`} style={{ transformOrigin: 'center', animation: 'fr-spin 1.1s linear infinite' }} />
        ) : (
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="url(#fr-ring)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 600ms var(--fr-ease)' }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold tabular-nums">{value === null ? '' : `${pct}%`}</span>
    </div>
  );
}

function StatusView({ status, onDismiss, onOpen }: { status: CaptureStatus; onDismiss: () => void; onOpen: (id: string) => void }) {
  const busy = BUSY.has(status.phase);
  // A good moment to ask for a review: a capture just succeeded.
  const review = useReviewPrompt(status.phase === 'done', 700);
  const pct = status.progress !== undefined ? Math.round(status.progress * 100) : null;
  return (
    <main className="fr-animate-in space-y-4 px-4 pb-4 pt-2" aria-live="polite">
      {busy || status.phase === 'selecting' ? (
        <div className="fr-card space-y-4 p-4">
          <div className="flex items-center gap-4">
            {status.phase === 'waiting' ? (
              <span className="fr-accent-bg flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold text-white shadow-glow" style={{ animation: 'fr-pulse-ring 1s ease-out infinite' }}>
                {status.message}
              </span>
            ) : status.phase === 'selecting' ? (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Scan size={26} />
              </span>
            ) : (
              <div role="progressbar" aria-label="Capture progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
                <ProgressRing value={pct} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-tight">{status.phase === 'waiting' ? 'Get ready…' : status.message ?? 'Working…'}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-fg-subtle">Keep this tab visible. Press <Kbd>Esc</Kbd> on the page to cancel.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {status.canStop && (
              <Button className="flex-1" onClick={() => void sendToBackground({ kind: 'capture.stop' })} data-testid="stop-capture">
                Stop &amp; save
              </Button>
            )}
            <Button className="flex-1" variant="ghost" onClick={() => void sendToBackground({ kind: 'capture.cancel' })} data-testid="cancel-capture">
              Cancel
            </Button>
          </div>
        </div>
      ) : status.phase === 'done' ? (
        <div className="fr-card fr-animate-in space-y-4 p-4">
          <span className="fr-flash rounded-[inherit]" aria-hidden />
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-success-soft text-success">
              <span className="fr-rings rounded-full" style={{ ['--fr-primary' as string]: 'var(--fr-success)' } as CSSProperties} aria-hidden>
                <span />
                <span />
              </span>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="22" style={{ ['--fr-dash' as string]: 22, animation: 'fr-draw 520ms var(--fr-ease) both 80ms' } as CSSProperties} />
              </svg>
            </span>
            <div>
              <p className="text-[14px] font-semibold tracking-tight">Capture saved</p>
              <p className="text-[12px] text-fg-subtle">{status.message}</p>
            </div>
          </div>
          {status.warnings && status.warnings.length > 0 && (
            <ul className="space-y-1 rounded-[12px] bg-warning-soft p-3 text-[12px] leading-snug text-warning">
              {status.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            {status.itemIds?.[0] && (
              <Button variant="primary" className="flex-1" onClick={() => onOpen(status.itemIds![0])}>
                Open in editor
              </Button>
            )}
            <Button className="flex-1" onClick={onDismiss}>
              New capture
            </Button>
          </div>
        </div>
      ) : (
        <div className={cx('fr-card space-y-4 p-4', status.phase === 'error' && 'fr-shake')}>
          <div className="flex items-start gap-3">
            <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', status.phase === 'error' ? 'bg-danger-soft text-danger' : 'bg-surface-3 text-fg-subtle')}>
              <AlertCircle size={22} />
            </span>
            <div>
              <p className="text-[14px] font-semibold tracking-tight">{status.phase === 'error' ? 'Capture failed' : 'Capture cancelled'}</p>
              {status.phase === 'error' && <p className="mt-0.5 text-[12px] leading-snug text-fg-muted">{status.message}</p>}
            </div>
          </div>
          <Button className="w-full" onClick={onDismiss}>
            Back
          </Button>
        </div>
      )}
      {status.phase === 'done' && <ReviewCard controls={review} layout="stacked" />}
      {busy && status.phase === 'capturing' && status.frames ? (
        <p className="text-center text-[11px] text-fg-subtle">
          <Spinner className="mr-1.5 inline-block h-3 w-3 align-[-2px] text-primary" />
          Chrome allows two screenshots per second.
        </p>
      ) : null}
    </main>
  );
}

function Recent({ items, onOpen, onLibrary }: { items: LibraryItem[]; onOpen: (id: string) => void; onLibrary: () => void }) {
  return (
    <section aria-label="Recent captures" className="fr-stagger rounded-[16px] border border-border bg-surface-solid/90 p-3 shadow-card" style={{ '--i': 6 } as CSSProperties}>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold text-fg-muted">Recent</h2>
        <button type="button" onClick={onLibrary} className="group inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
          <Images size={13} /> Library
          <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 py-1.5 text-[12px] text-fg-subtle">
          <Camera size={14} /> Your captures will appear here.
        </p>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {items.map((i) => (
            <li key={i.id}>
              <RecentThumb item={i} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentThumb({ item, onOpen }: { item: LibraryItem; onOpen: (id: string) => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void getThumb(item.id).then((b) => setBlob(b ?? null));
  }, [item.id, item.updatedAt]);
  const url = useObjectUrl(blob);
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      title={`${item.name} · ${formatRelative(item.createdAt)}`}
      aria-label={`Open ${item.name}`}
      className={cx('fr-press group relative block aspect-square w-full overflow-hidden rounded-[11px] border border-border ring-primary/0 transition-shadow hover:ring-2 hover:ring-primary/60', !loaded && 'fr-skeleton')}
    >
      {url && (
        <img
          src={url}
          alt=""
          onLoad={() => setLoaded(true)}
          data-loaded={loaded}
          className={cx('fr-img-fade h-full w-full object-cover group-hover:scale-[1.06]', item.kind === 'recording' ? 'object-center' : 'object-left-top')}
        />
      )}
      {item.kind === 'recording' && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
            <Play size={11} fill="currentColor" className="translate-x-[0.5px]" />
          </span>
        </span>
      )}
    </button>
  );
}

function RecordingCard({ state }: { state: RecorderPublicState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.phase !== 'recording') return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [state.phase]);
  const paused = state.phase === 'paused';
  const controllable = state.phase === 'recording' || paused;
  const label = state.phase === 'countdown' ? `Starting in ${state.countdown}…` : paused ? 'Recording paused' : state.phase === 'recording' ? 'Recording' : 'Saving recording…';
  const iconBtn = 'fr-press flex h-9 w-9 items-center justify-center rounded-[11px] border border-border bg-surface-solid text-fg-muted shadow-card transition-colors hover:text-fg';
  return (
    <section aria-label="Screen recording" className="fr-card fr-animate-in flex items-center gap-3 p-3" data-testid="popup-recording">
      <button
        type="button"
        onClick={() => {
          sendRecorderCommand('focus');
          window.close();
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        title="Open the recorder"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
          {paused ? <Pause size={16} className="text-warning" /> : state.phase === 'recording' ? <span className="fr-rec-dot" /> : <Spinner className="text-danger" />}
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-semibold text-fg-muted">{label}</span>
          <span className="block text-[22px] font-semibold leading-tight tabular-nums" data-testid="popup-recording-time">
            {formatDuration(elapsedMs(state, now))}
          </span>
        </span>
      </button>
      {controllable && state.hasMic && (
        <button type="button" className={iconBtn} aria-label={state.micMuted ? 'Unmute microphone' : 'Mute microphone'} title={state.micMuted ? 'Unmute microphone' : 'Mute microphone'} onClick={() => sendRecorderCommand('toggle-mic')}>
          {state.micMuted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
      )}
      {controllable && (
        <button type="button" className={iconBtn} aria-label={paused ? 'Resume recording' : 'Pause recording'} title={paused ? 'Resume' : 'Pause'} onClick={() => sendRecorderCommand(paused ? 'resume' : 'pause')} data-testid="popup-recording-pause">
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
      )}
      {(controllable || state.phase === 'countdown') && (
        <button
          type="button"
          className="fr-rec-btn fr-press flex h-9 items-center gap-1.5 rounded-[11px] px-3 text-[12.5px] font-semibold"
          onClick={() => sendRecorderCommand('stop')}
          data-testid="popup-recording-stop"
        >
          <Square size={11} fill="currentColor" /> {state.phase === 'countdown' ? 'Cancel' : 'Stop'}
        </button>
      )}
    </section>
  );
}
