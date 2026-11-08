import { lazy, Suspense, useEffect } from 'react';
import { LibraryPage } from '../library/LibraryPage';
import { bootstrapTheme, useRoute, useSettings, useThemeSync } from '../ui/hooks';
import { ConfirmProvider, ToastProvider } from '../ui/overlays';
import { Aurora, Spinner, TooltipProvider } from '../ui/primitives';

// Heavier screens load on demand so the library opens fast, then preload in
// idle time so page transitions never wait on the network-free chunk fetch.
const loaders = {
  editor: () => import('../editor/ui/EditorPage'),
  composer: () => import('../composer/ComposerPage'),
  settings: () => import('../settings/SettingsPage'),
  welcome: () => import('./WelcomePage'),
  compare: () => import('./ComparePage'),
};
const EditorPage = lazy(() => loaders.editor().then((m) => ({ default: m.EditorPage })));
const ComposerPage = lazy(() => loaders.composer().then((m) => ({ default: m.ComposerPage })));
const SettingsPage = lazy(() => loaders.settings().then((m) => ({ default: m.SettingsPage })));
const WelcomePage = lazy(() => loaders.welcome().then((m) => ({ default: m.WelcomePage })));
const ComparePage = lazy(() => loaders.compare().then((m) => ({ default: m.ComparePage })));

function preloadScreens(): void {
  const idle = (cb: () => void) => ((window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 600)))(cb);
  idle(() => Object.values(loaders).forEach((load) => void load().catch(() => {})));
}

bootstrapTheme();

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
    compare: 'Compare',
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
    case 'compare':
      page = <ComparePage a={route.a} b={route.b} />;
      break;
    default:
      page = <LibraryPage settings={settings} />;
  }

  return (
    <TooltipProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Aurora />
          <div className="relative z-10 h-screen w-screen overflow-hidden">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center gap-2 text-sm text-fg-subtle">
                  <Spinner className="text-primary" /> Loading…
                </div>
              }
            >
              {page}
            </Suspense>
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
