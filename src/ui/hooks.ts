/** Shared React hooks: settings, theme, hash routing, object URLs. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, sanitizeSettings, type Settings, type ThemeSetting } from '../core/settings';

const THEME_CACHE_KEY = 'frameshot.theme';

/** Applies the theme class synchronously from a local cache to avoid a flash. */
export function bootstrapTheme(): void {
  let theme: ThemeSetting = 'system';
  try {
    theme = (localStorage.getItem(THEME_CACHE_KEY) as ThemeSetting) || 'system';
  } catch {
    /* storage unavailable */
  }
  applyTheme(theme);
}

export function applyTheme(theme: ThemeSetting): void {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(() => sanitizeSettings(DEFAULT_SETTINGS));
  useEffect(() => {
    let alive = true;
    void loadSettings().then((s) => alive && setSettings(s));
    const off = onSettingsChanged((s) => setSettings(s));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return settings;
}

/** Keeps the document theme in sync with the setting and the OS preference. */
export function useThemeSync(theme: ThemeSetting): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      applyTheme(theme);
      setDark(document.documentElement.classList.contains('dark'));
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [theme]);
  return dark;
}

// ── Hash router ──

export type Route =
  | { name: 'library' }
  | { name: 'edit'; id: string }
  | { name: 'compose'; id: string }
  | { name: 'settings'; section?: string }
  | { name: 'welcome' }
  | { name: 'compare'; a: string; b: string }
  | { name: 'record' }
  | { name: 'play'; id: string }
  | { name: 'test' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const parts = path.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'edit':
      return parts[1] ? { name: 'edit', id: parts[1] } : { name: 'library' };
    case 'compose':
      return parts[1] ? { name: 'compose', id: parts[1] } : { name: 'library' };
    case 'settings':
      return { name: 'settings', section: parts[1] };
    case 'welcome':
      return { name: 'welcome' };
    case 'compare':
      return parts[1] && parts[2] ? { name: 'compare', a: parts[1], b: parts[2] } : { name: 'library' };
    case 'record':
      return { name: 'record' };
    case 'play':
      return parts[1] ? { name: 'play', id: parts[1] } : { name: 'library' };
    case '__test':
      return { name: 'test' };
    default:
      return { name: 'library' };
  }
}

// The current route lives in a tiny store so navigation can re-render
// synchronously inside a View Transition (fluid page transitions).
let currentHash = typeof location !== 'undefined' ? location.hash : '';
const routeListeners = new Set<() => void>();

function emitRoute(): void {
  for (const l of routeListeners) l();
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (location.hash === currentHash) return;
    currentHash = location.hash;
    emitRoute();
  });
}

function subscribeHash(cb: () => void): () => void {
  routeListeners.add(cb);
  return () => routeListeners.delete(cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeHash, () => currentHash);
  return parseRoute(hash);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export function navigate(path: string): void {
  const next = path.startsWith('#') ? path : `#${path}`;
  if (next === currentHash) return;
  const apply = () => {
    history.pushState(null, '', next);
    currentHash = next;
    // Render the new screen synchronously so the transition captures it.
    flushSync(emitRoute);
  };
  const doc = document as ViewTransitionDoc;
  if (doc.startViewTransition && !prefersReducedMotion() && document.visibilityState === 'visible') {
    doc.startViewTransition(apply);
  } else {
    apply();
  }
}

/** Creates an object URL for a blob and revokes it on change/unmount. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
