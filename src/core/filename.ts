/**
 * Filename template rendering and sanitization.
 *
 * Supported tokens: {domain} {title} {date} {time} {timestamp} {mode}
 * {width} {height} {name} {yyyy} {mm} {dd} {hh} {min} {ss}
 */
import { FORMAT_EXTENSION, type CaptureMode, type ExportFormat } from './types';

export interface FilenameContext {
  date?: Date;
  domain?: string;
  title?: string;
  mode?: CaptureMode | string;
  width?: number;
  height?: number;
  name?: string;
}

export const FILENAME_TOKENS: { token: string; description: string }[] = [
  { token: '{name}', description: 'Library name of the screenshot' },
  { token: '{domain}', description: 'Website domain, e.g. example.com' },
  { token: '{title}', description: 'Page title' },
  { token: '{date}', description: 'Date as YYYY-MM-DD' },
  { token: '{time}', description: 'Time as HH-MM-SS' },
  { token: '{timestamp}', description: 'Unix timestamp in milliseconds' },
  { token: '{mode}', description: 'Capture mode, e.g. full' },
  { token: '{width}', description: 'Image width in pixels' },
  { token: '{height}', description: 'Image height in pixels' },
];

const FALLBACK = 'frameshot-screenshot';
const MAX_BASENAME = 120;

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

/** Removes characters that are invalid in filenames on Windows/macOS/Linux. */
export function sanitizeFilenamePart(input: string): string {
  return (
    input
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/-{2,}/g, '-')
      .trim()
  );
}

const RESERVED_WINDOWS = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

export function sanitizeBasename(input: string): string {
  let name = sanitizeFilenamePart(input)
    .replace(/^[.\s-]+/, '')
    .replace(/[.\s-]+$/, '');
  if (name.length > MAX_BASENAME) name = name.slice(0, MAX_BASENAME).replace(/[.\s-]+$/, '');
  if (!name || RESERVED_WINDOWS.test(name)) return FALLBACK;
  return name;
}

export function renderTemplate(template: string, ctx: FilenameContext): string {
  const d = ctx.date ?? new Date();
  const values: Record<string, string> = {
    name: ctx.name ?? '',
    domain: (ctx.domain ?? '').replace(/^www\./, ''),
    title: ctx.title ?? '',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`,
    timestamp: String(d.getTime()),
    mode: ctx.mode ?? '',
    width: ctx.width ? String(Math.round(ctx.width)) : '',
    height: ctx.height ? String(Math.round(ctx.height)) : '',
    yyyy: String(d.getFullYear()),
    mm: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    hh: pad(d.getHours()),
    min: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };
  return template.replace(/\{([a-z]+)\}/gi, (match, key: string) => {
    const k = key.toLowerCase();
    return k in values ? sanitizeFilenamePart(values[k]) : match;
  });
}

/** Builds a complete, safe filename (with extension) from a template. */
export function buildFilename(template: string, ctx: FilenameContext, format: ExportFormat | 'zip'): string {
  const rendered = renderTemplate(template, ctx)
    // Collapse separators left behind by empty tokens, e.g. "frameshot--2024".
    .replace(/([-_ ]){2,}/g, '$1');
  const base = sanitizeBasename(rendered);
  const ext = format === 'zip' ? 'zip' : FORMAT_EXTENSION[format];
  return `${base}.${ext}`;
}

/** Joins an optional downloads sub-folder with a filename. */
export function withFolder(folder: string, filename: string): string {
  return folder ? `${folder}/${filename}` : filename;
}

/** Ensures names are unique within a batch (e.g. inside a ZIP). */
export function uniquifyNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const lower = name.toLowerCase();
    const count = seen.get(lower) ?? 0;
    seen.set(lower, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let candidate = `${stem} (${count + 1})${ext}`;
    while (seen.has(candidate.toLowerCase())) candidate = `${stem} (${count + 1}-${seen.size})${ext}`;
    seen.set(candidate.toLowerCase(), 1);
    return candidate;
  });
}

/** Default human-readable library name for a new capture. */
export function defaultItemName(ctx: { title?: string; domain?: string; date?: Date }): string {
  const d = ctx.date ?? new Date();
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
  const title = (ctx.title ?? '').trim();
  const label = title ? title.slice(0, 80) : ctx.domain?.replace(/^www\./, '') || 'Screenshot';
  return `${label} — ${stamp}`;
}
