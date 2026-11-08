import { Pause, Play, Square } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { formatDuration } from '../core/format';
import { LibraryPage } from '../library/LibraryPage';
import { ShortcutsDialog } from './ShortcutsDialog';
import { ErrorBoundary } from './ErrorBoundary';
import { STUDIO_CHANNEL, type StudioMessage } from '../core/studio-channel';
import { elapsedMs, isActivePhase } from '../recorder/channel';
import { focusThisTab, getRecorderSnapshot, pauseRecording, resetRecorder, resumeRecording, stopRecording } from '../recorder/recorder';
import { useNow, useRecorder } from '../recorder/useMedia';
import { bootstrapTheme, navigate, useRoute, useSettings, useThemeSync, type Route } from '../ui/hooks';
import { ConfirmProvider, ToastProvider, useToast } from '../ui/overlays';
import { Aurora, Spinner, TooltipProvider } from '../ui/primitives';

// Heavier screens load on demand so the library opens fast, then preload in
// idle time so page transitions never wait on the network-free chunk fetch.
const loaders = {
  editor: () => import('../editor/ui/EditorPage'),
  composer: () => import('../composer/ComposerPage'),
  settings: () => import('../settings/SettingsPage'),
  welcome: () => import('./WelcomePage'),
  donate: () => import('./DonatePage'),
  compare: () => import('./ComparePage'),
  recorder: () => import('../recorder/RecorderPage'),
  player: () => import('../recorder/PlayerPage'),
};
const EditorPage = lazy(() => loaders.editor().then((m) => ({ default: m.EditorPage })));
const ComposerPage = lazy(() => loaders.composer().then((m) => ({ default: m.ComposerPage })));
const SettingsPage = lazy(() => loaders.settings().then((m) => ({ default: m.SettingsPage })));
const WelcomePage = lazy(() => loaders.welcome().then((m) => ({ default: m.WelcomePage })));
const DonatePage = lazy(() => loaders.donate().then((m) => ({ default: m.DonatePage })));
const ComparePage = lazy(() => loaders.compare().then((m) => ({ default: m.ComparePage })));
const RecorderPage = lazy(() => loaders.recorder().then((m) => ({ default: m.RecorderPage })));
const PlayerPage = lazy(() => loaders.player().then((m) => ({ default: m.PlayerPage })));

function preloadScreens(): void {
  const idle = (cb: () => void) => ((window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 600)))(cb);
  idle(() => Object.values(loaders).forEach((load) => void load().catch(() => {})));
}

bootstrapTheme();

// Lets the service worker find this tab (see core/studio-channel.ts).
if (typeof BroadcastChannel !== 'undefined') {
  const presence = new BroadcastChannel(STUDIO_CHANNEL);
  let tab: Promise<chrome.tabs.Tab | undefined> | null = null;
  const myTab = () => (tab ??= new Promise((resolve) => chrome.tabs.getCurrent((t) => resolve(t))));
  presence.onmessage = (e: MessageEvent<StudioMessage>) => {
    const m = e.data;
    if (m?.type === 'who') {
      void myTab().then((t) => {
        if (t?.id === undefined) return;
        presence.postMessage({
          type: 'here',
          nonce: m.nonce,
          tabId: t.id,
          windowId: t.windowId,
          route: location.hash,
          recording: isActivePhase(getRecorderSnapshot().phase),
        } satisfies StudioMessage);
      });
    } else if (m?.type === 'open') {
      void myTab().then((t) => {
        if (t?.id !== m.tabId) return;
        navigate(m.route);
        focusThisTab();
      });
    }
  };
}

export function StudioApp() {
  const settings = useSettings();
  const dark = useThemeSync(settings.theme);
  const route = useRoute();

  const titles: Record<string, string> = {
    library: 'Library',
    edit: 'Editor',
    compose: 'Composer',
    settings: 'Settings',
    welcome: 'Welcome',
    donate: 'Support FrameShot',
    compare: 'Compare',
    record: 'Screen recorder',
    play: 'Recording',
    test: 'Studio',
  };
  const title = `${titles[route.name] ?? 'Studio'} · FrameShot`;
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(preloadScreens, []);

  let page;
  switch (route.name) {
    case 'edit':
      page = <EditorPage id={route.id} settings={settings} dark={dark} />;
      break;
    case 'compose':
      page = <ComposerPage id={route.id} settings={settings} />;
      break;
    case 'settings':
      page = <SettingsPage settings={settings} />;
      break;
    case 'welcome':
      page = <WelcomePage />;
      break;
    case 'donate':
      page = <DonatePage />;
      break;
    case 'compare':
      page = <ComparePage a={route.a} b={route.b} />;
      break;
    case 'record':
      page = <RecorderPage settings={settings} />;
      break;
    case 'play':
      page = <PlayerPage id={route.id} settings={settings} openGif={route.gif} />;
      break;
    default:
      page = <LibraryPage settings={settings} />;
  }

  return (
    <TooltipProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Aurora />
          <div className="fr-page-layer relative z-10 h-screen w-screen overflow-clip">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center gap-2 text-sm text-fg-subtle">
                  <Spinner className="text-primary" /> Loading…
                </div>
              }
            >
              <ErrorBoundary resetKey={location.hash}>{page}</ErrorBoundary>
            </Suspense>
          </div>
          <RecorderWatcher route={route} />
          <ShortcutsDialog />
        </ConfirmProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}

/**
 * App-wide recorder UI: opens a finished recording in the player, and shows a
 * floating "recording" pill on every screen except the recorder itself.
 */
function RecorderWatcher({ route }: { route: Route }) {
  const rec = useRecorder();
  const toast = useToast();
  const handled = useRef<string | null>(null);
  const now = useNow(rec.phase === 'recording', 500);

  useEffect(() => {
    if (rec.phase === 'error' && rec.unsaved && route.name !== 'record') {
      // The recorder screen shows the reason and a Download button for the unsaved recording.
      navigate('/record');
      toast.error('The recording could not be saved to the library. You can still download it.');
      return;
    }
    if (rec.phase === 'done' && rec.itemId && handled.current !== rec.itemId) {
      handled.current = rec.itemId;
      const id = rec.itemId;
      resetRecorder();
      navigate(`/play/${encodeURIComponent(id)}`);
      toast.success('Recording saved to your library.');
    }
  }, [rec.phase, rec.itemId, rec.unsaved, route.name, toast]);

  if (!isActivePhase(rec.phase) || route.name === 'record') return null;
  const busy = rec.phase === 'stopping' || rec.phase === 'saving';
  return (
    <div
      className="fr-glass-blur fixed left-1/2 top-[74px] z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border py-1.5 pl-3.5 pr-1.5 shadow-pop"
      style={{ animation: 'fr-fade-in 360ms var(--fr-ease) both' }}
      role="status"
      aria-label="Screen recording in progress"
      data-testid="recording-pill"
    >
      {rec.phase === 'paused' ? <Pause size={13} className="text-warning" /> : busy ? <Spinner className="text-primary" /> : <span className="fr-rec-dot" />}
      <button type="button" className="mr-1 text-[13px] font-semibold tabular-nums hover:underline" onClick={() => navigate('/record')}>
        {rec.phase === 'countdown' ? `Starting in ${rec.countdown}…` : busy ? 'Saving…' : formatDuration(elapsedMs(rec, now))}
      </button>
      {(rec.phase === 'recording' || rec.phase === 'paused') && (
        <>
          <button
            type="button"
            aria-label={rec.phase === 'paused' ? 'Resume recording' : 'Pause recording'}
            title={rec.phase === 'paused' ? 'Resume' : 'Pause'}
            onClick={rec.phase === 'paused' ? resumeRecording : pauseRecording}
            className="fr-press flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            {rec.phase === 'paused' ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            type="button"
            aria-label="Stop and save recording"
            title="Stop & save"
            onClick={() => void stopRecording()}
            className="fr-rec-btn fr-press flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold"
          >
            <Square size={11} fill="currentColor" /> Stop
          </button>
        </>
      )}
    </div>
  );
}
