/** Shared React hooks: settings, theme, hash routing, object URLs. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, sanitizeSettings, type Settings, type ThemeSetting } from '../core/settings';

const THEME_CACHE_KEY = 'frameora.theme';

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
    case '__test':
      return { name: 'test' };
    default:
      return { name: 'library' };
  }
}

function subscribeHash(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeHash, () => location.hash);
  return parseRoute(hash);
}

export function navigate(path: string): void {
  location.hash = path.startsWith('#') ? path : `#${path}`;
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
