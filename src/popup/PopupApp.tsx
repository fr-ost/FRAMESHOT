/**
 * Quick Capture popup: one-click capture modes, live progress with cancel /
 * stop-and-save, and recent captures. Kept deliberately small and fast.
 */
import {
  AlertCircle,
  AppWindow,
  Camera,
  CheckCircle2,
  Clock,
  Crosshair,
  FileStack,
  Images,
  Scan,
  ScrollText,
  Settings as SettingsIcon,
  Square,
  SquareDashedMousePointer,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { formatRelative } from '../core/format';
import { sendToBackground, STATUS_PORT, type StatusPortMessage } from '../core/messages';
import { checkPageAccess } from '../core/restricted';
import type { CaptureMode, CaptureStatus, LibraryItem } from '../core/types';
import { getThumb, listItems } from '../db/db';
import { bootstrapTheme, useObjectUrl, useSettings, useThemeSync } from '../ui/hooks';
import { Button, Logo, Spinner, cx } from '../ui/primitives';

bootstrapTheme();

const DELAY_KEY = 'frameora.popup.delay';
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

export function PopupApp() {
  const settings = useSettings();
  useThemeSync(settings.theme);
  const tab = useActiveTab();
  const status = useStatus();
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
  // A capture that started from this popup session (or one still running).
  const live = status && (BUSY.has(status.phase) || status.phase === 'selecting' || (status.updatedAt >= startedAt && startedAt > 0));
  const busy = !!status && BUSY.has(status.phase);

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
    <div className="w-[348px] bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <Logo size={24} />
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => open('/')} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg">
            <AppWindow size={15} /> Studio
          </button>
          <button type="button" aria-label="Settings" title="Settings" onClick={() => open('/settings')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg">
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      {live && status && status.phase !== 'idle' ? (
        <StatusView status={status} onDismiss={() => setStartedAt(0)} onOpen={(id) => open(`/edit/${encodeURIComponent(id)}`)} />
      ) : (
        <main className="space-y-3 p-3">
          {!access.allowed && (
            <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-[12px] text-warning">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{access.reason} You can still open the Studio to edit, import, and organize screenshots.</span>
            </div>
          )}
          {error && (
            <div role="alert" className="flex gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-[12px] text-danger-soft-fg">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <CaptureButton icon={<Square size={20} />} label="Visible area" hint="Alt+Shift+V" onClick={() => void start('visible')} disabled={!access.allowed || busy} testId="capture-visible" />
            <CaptureButton icon={<ScrollText size={20} />} label="Full page" hint="Alt+Shift+F" onClick={() => void start('full')} disabled={!access.allowed || busy} primary testId="capture-full" />
            <CaptureButton icon={<SquareDashedMousePointer size={20} />} label="Selected area" hint="Alt+Shift+A" onClick={() => void start('area')} disabled={!access.allowed || busy} testId="capture-area" />
            <CaptureButton icon={<Crosshair size={20} />} label="Element" hint="Alt+Shift+E" onClick={() => void start('element')} disabled={!access.allowed || busy} testId="capture-element" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!access.allowed || busy}
              onClick={() => void start('scrollable')}
              className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-[13px] font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50"
              data-testid="capture-scrollable"
            >
              <FileStack size={15} /> Scrolling panel
            </button>
            <label className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 text-[12px] text-fg-muted" title="Delay before capturing the visible area (useful for menus and hover states)">
              <Clock size={14} />
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
          <Recent items={recent} onOpen={(id) => open(`/edit/${encodeURIComponent(id)}`)} onLibrary={() => open('/')} />
        </main>
      )}
      <footer className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-fg-subtle">
        <span>Free forever · Stays on your device</span>
        <span>Unique Labs</span>
      </footer>
    </div>
  );
}

function CaptureButton({ icon, label, hint, onClick, disabled, primary, testId }: { icon: ReactNode; label: string; hint: string; onClick: () => void; disabled?: boolean; primary?: boolean; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cx(
        'group flex h-[84px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        primary ? 'border-primary bg-primary text-primary-fg hover:bg-primary-hover' : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2',
      )}
    >
      <span className={primary ? 'text-primary-fg' : 'text-primary'}>{icon}</span>
      <span>
        <span className="block text-[13px] font-semibold">{label}</span>
        <span className={cx('block text-[11px]', primary ? 'text-white/75' : 'text-fg-subtle')}>{hint}</span>
      </span>
    </button>
  );
}

function StatusView({ status, onDismiss, onOpen }: { status: CaptureStatus; onDismiss: () => void; onOpen: (id: string) => void }) {
  const busy = BUSY.has(status.phase);
  const pct = status.progress !== undefined ? Math.round(status.progress * 100) : null;
  return (
    <main className="space-y-4 p-4" aria-live="polite">
      {busy || status.phase === 'selecting' ? (
        <>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              {status.phase === 'waiting' ? <Clock size={18} /> : status.phase === 'selecting' ? <Scan size={18} /> : <Spinner />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{status.phase === 'waiting' ? `Capturing in ${status.message}…` : status.message ?? 'Working…'}</p>
              <p className="text-[12px] text-fg-subtle">Keep this tab visible. Press Esc on the page to cancel.</p>
            </div>
          </div>
          {pct !== null && (
            <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Capture progress">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.max(3, pct)}%` }} />
            </div>
          )}
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
        </>
      ) : status.phase === 'done' ? (
        <>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-success" size={22} />
            <div>
              <p className="text-sm font-semibold">Capture saved</p>
              <p className="text-[12px] text-fg-subtle">{status.message}</p>
            </div>
          </div>
          {status.warnings && status.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-warning-soft p-3 text-[12px] text-warning">
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
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <AlertCircle className={status.phase === 'error' ? 'text-danger' : 'text-fg-subtle'} size={22} />
            <div>
              <p className="text-sm font-semibold">{status.phase === 'error' ? 'Capture failed' : 'Capture cancelled'}</p>
              {status.phase === 'error' && <p className="mt-0.5 text-[12px] text-fg-muted">{status.message}</p>}
            </div>
          </div>
          <Button className="w-full" onClick={onDismiss}>
            Back
          </Button>
        </>
      )}
    </main>
  );
}

function Recent({ items, onOpen, onLibrary }: { items: LibraryItem[]; onOpen: (id: string) => void; onLibrary: () => void }) {
  return (
    <section aria-label="Recent captures" className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold text-fg-muted">Recent</h2>
        <button type="button" onClick={onLibrary} className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
          <Images size={13} /> Library
        </button>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-[12px] text-fg-subtle">
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
  useEffect(() => {
    void getThumb(item.id).then((b) => setBlob(b ?? null));
  }, [item.id, item.updatedAt]);
  const url = useObjectUrl(blob);
  return (
    <button type="button" onClick={() => onOpen(item.id)} title={`${item.name} · ${formatRelative(item.createdAt)}`} aria-label={`Open ${item.name}`} className="fr-checker block aspect-square w-full overflow-hidden rounded-lg border border-border hover:border-primary">
      {url && <img src={url} alt="" className="h-full w-full object-cover object-top" />}
    </button>
  );
}
