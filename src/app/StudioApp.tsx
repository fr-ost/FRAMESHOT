import { lazy, Suspense, useEffect } from 'react';
import { LibraryPage } from '../library/LibraryPage';
import { bootstrapTheme, useRoute, useSettings, useThemeSync } from '../ui/hooks';
import { ConfirmProvider, ToastProvider } from '../ui/overlays';
import { Spinner, TooltipProvider } from '../ui/primitives';

// Heavier screens load on demand so the library opens fast.
const EditorPage = lazy(() => import('../editor/ui/EditorPage').then((m) => ({ default: m.EditorPage })));
const ComposerPage = lazy(() => import('../composer/ComposerPage').then((m) => ({ default: m.ComposerPage })));
const SettingsPage = lazy(() => import('../settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const WelcomePage = lazy(() => import('./WelcomePage').then((m) => ({ default: m.WelcomePage })));
const ComparePage = lazy(() => import('./ComparePage').then((m) => ({ default: m.ComparePage })));

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
  const title = `${titles[route.name] ?? 'Studio'} — Frameora`;
  useEffect(() => {
    document.title = title;
  }, [title]);

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
          <div className="h-screen w-screen overflow-hidden">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center gap-2 text-sm text-fg-subtle">
                  <Spinner /> Loading…
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
