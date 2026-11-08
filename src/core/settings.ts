/**
 * User settings: defaults, validation, and persistence in chrome.storage.local.
 * Settings never leave the device (storage.local, not storage.sync).
 */
import type { ImageFormat } from './types';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type FixedElementMode = 'smart' | 'keep' | 'hide';
export type OversizeMode = 'split' | 'scale';
export type AfterCapture = 'editor' | 'library';
export type PdfPageSize = 'image' | 'a4' | 'letter';

export interface Settings {
  theme: ThemeSetting;
  defaultFormat: ImageFormat;
  /** Quality for lossy formats, 0.5–1. */
  jpegQuality: number;
  webpQuality: number;
  filenameTemplate: string;
  /** Optional sub-folder inside the Downloads folder (empty = Downloads root). */
  downloadFolder: string;
  askWhereToSave: boolean;
  afterCapture: AfterCapture;
  capture: {
    fixedElements: FixedElementMode;
    preloadLazyContent: boolean;
    freezeAnimations: boolean;
    /** Extra wait after each scroll step, in ms. */
    settleDelayMs: number;
    /** Safety limit for full-page captures, in CSS pixels. */
    maxPageHeight: number;
    oversize: OversizeMode;
    includeHorizontalOverflow: boolean;
  };
  library: {
    view: 'grid' | 'list';
  };
  pdf: {
    pageSize: PdfPageSize;
    marginPt: number;
  };
}

export const DEFAULT_FILENAME_TEMPLATE = 'frameshot-{domain}-{date}-{time}';

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  theme: 'system',
  defaultFormat: 'png',
  jpegQuality: 0.92,
  webpQuality: 0.92,
  filenameTemplate: DEFAULT_FILENAME_TEMPLATE,
  downloadFolder: '',
  askWhereToSave: false,
  afterCapture: 'editor',
  capture: Object.freeze({
    fixedElements: 'smart',
    preloadLazyContent: true,
    freezeAnimations: true,
    settleDelayMs: 150,
    maxPageHeight: 60000,
    oversize: 'split',
    includeHorizontalOverflow: true,
  }),
  library: Object.freeze({ view: 'grid' }),
  pdf: Object.freeze({ pageSize: 'a4', marginPt: 24 }),
}) as Settings;

// Storage key kept from the product's former name (Frameora) so existing
// users keep their settings after the rename to FrameShot.
export const SETTINGS_KEY = 'frameora.settings';

export const LIMITS = {
  quality: { min: 0.5, max: 1 },
  settleDelayMs: { min: 0, max: 3000 },
  maxPageHeight: { min: 2000, max: 200000 },
  marginPt: { min: 0, max: 96 },
  filenameTemplateMaxLength: 200,
  downloadFolderMaxLength: 80,
} as const;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Sanitizes a user-supplied folder name for chrome.downloads (relative path only). */
export function sanitizeFolder(value: unknown): string {
  if (typeof value !== 'string') return '';
  const parts = value
    .replace(/\\/g, '/')
    .split('/')
    .map((p) =>
      p
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"|?*\u0000-\u001f\u007f]/g, '')
        .trim()
        .replace(/^\.+/, '')
        .replace(/[. ]+$/, ''),
    )
    .filter((p) => p.length > 0 && p !== '..' && p !== '.');
  return parts.join('/').slice(0, LIMITS.downloadFolderMaxLength);
}

/**
 * Merges arbitrary (possibly corrupted or outdated) stored data with defaults,
 * clamping every value into its valid range. Never throws.
 */
export function sanitizeSettings(input: unknown): Settings {
  const s = obj(input);
  const c = obj(s.capture);
  const l = obj(s.library);
  const p = obj(s.pdf);
  const d = DEFAULT_SETTINGS;
  const template =
    typeof s.filenameTemplate === 'string' && s.filenameTemplate.trim().length > 0
      ? s.filenameTemplate.trim().slice(0, LIMITS.filenameTemplateMaxLength)
      : d.filenameTemplate;
  return {
    theme: pick(s.theme, ['system', 'light', 'dark'] as const, d.theme),
    defaultFormat: pick(s.defaultFormat, ['png', 'jpeg', 'webp'] as const, d.defaultFormat),
    jpegQuality: num(s.jpegQuality, LIMITS.quality.min, LIMITS.quality.max, d.jpegQuality),
    webpQuality: num(s.webpQuality, LIMITS.quality.min, LIMITS.quality.max, d.webpQuality),
    filenameTemplate: template,
    downloadFolder: sanitizeFolder(s.downloadFolder),
    askWhereToSave: bool(s.askWhereToSave, d.askWhereToSave),
    afterCapture: pick(s.afterCapture, ['editor', 'library'] as const, d.afterCapture),
    capture: {
      fixedElements: pick(c.fixedElements, ['smart', 'keep', 'hide'] as const, d.capture.fixedElements),
      preloadLazyContent: bool(c.preloadLazyContent, d.capture.preloadLazyContent),
      freezeAnimations: bool(c.freezeAnimations, d.capture.freezeAnimations),
      settleDelayMs: Math.round(
        num(c.settleDelayMs, LIMITS.settleDelayMs.min, LIMITS.settleDelayMs.max, d.capture.settleDelayMs),
      ),
      maxPageHeight: Math.round(
        num(c.maxPageHeight, LIMITS.maxPageHeight.min, LIMITS.maxPageHeight.max, d.capture.maxPageHeight),
      ),
      oversize: pick(c.oversize, ['split', 'scale'] as const, d.capture.oversize),
      includeHorizontalOverflow: bool(c.includeHorizontalOverflow, d.capture.includeHorizontalOverflow),
    },
    library: {
      view: pick(l.view, ['grid', 'list'] as const, d.library.view),
    },
    pdf: {
      pageSize: pick(p.pageSize, ['image', 'a4', 'letter'] as const, d.pdf.pageSize),
      marginPt: Math.round(num(p.marginPt, LIMITS.marginPt.min, LIMITS.marginPt.max, d.pdf.marginPt)),
    },
  };
}

/** Deep-merges a partial patch into settings and re-validates. */
export function mergeSettings(current: Settings, patch: DeepPartial<Settings>): Settings {
  return sanitizeSettings({
    ...current,
    ...patch,
    capture: { ...current.capture, ...(patch.capture ?? {}) },
    library: { ...current.library, ...(patch.library ?? {}) },
    pdf: { ...current.pdf, ...(patch.pdf ?? {}) },
  });
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    return sanitizeSettings(stored[SETTINGS_KEY]);
  } catch {
    return sanitizeSettings(undefined);
  }
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const clean = sanitizeSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: clean });
  return clean;
}

export async function updateSettings(patch: DeepPartial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  return saveSettings(mergeSettings(current, patch));
}

export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && SETTINGS_KEY in changes) listener(sanitizeSettings(changes[SETTINGS_KEY].newValue));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function qualityFor(settings: Settings, format: ImageFormat): number | undefined {
  if (format === 'jpeg') return settings.jpegQuality;
  if (format === 'webp') return settings.webpQuality;
  return undefined;
}
