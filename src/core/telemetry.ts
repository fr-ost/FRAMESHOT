/**
 * Anonymous install counts.
 *
 * FrameShot tells its own small server (a Cloudflare Worker, source in
 * server/telemetry/) three things, and nothing else:
 *   - that it was installed,
 *   - that it was updated (and from which version),
 *   - that it was removed (Chrome opens the uninstall address).
 * Each message carries a random install id made up on this device, the
 * FrameShot version, the operating system family and the browser language.
 * It never includes page addresses, titles, screenshots, recordings, file
 * names, settings or anything typed. The server keeps the country code
 * Cloudflare gives each request, never the IP address.
 *
 * Users turn it off in Settings → Privacy ("Share anonymous install counts").
 * Turning it off deletes the install id and the uninstall address at once.
 * Test builds never send anything.
 */
import { loadSettings } from './settings';

/** The FrameShot tracker Worker. Must also be listed in the manifest CSP's `connect-src` (wxt.config.ts). */
export const TELEMETRY_ORIGIN = 'https://frameshot.shahriarahmed614.workers.dev';
export const TELEMETRY_KEY = 'frameshot.telemetry';

export type TelemetryEvent = 'install' | 'update';
export type Platform = 'win' | 'mac' | 'linux' | 'cros' | 'other';

export interface TelemetryState {
  /** Random hex id; empty when stats are off. */
  id: string;
  /** An event that could not be delivered yet (offline); retried at the next browser start. */
  pending?: { ev: TelemetryEvent; pv?: string };
}

export interface TelemetryPayload {
  ev: TelemetryEvent;
  id: string;
  v: string;
  pv?: string;
  p: Platform;
  l: string;
}

export function newInstallId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isInstallId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
}

export function platformOf(os: string | undefined): Platform {
  return os === 'win' || os === 'mac' || os === 'linux' || os === 'cros' ? os : 'other';
}

/** "en-US" → "en"; anything odd → "other". */
export function languageOf(tag: string | undefined): string {
  const primary = String(tag ?? '').split(/[-_]/)[0].toLowerCase();
  return /^[a-z]{2,3}$/.test(primary) ? primary : 'other';
}

export function buildPayload(input: { ev: TelemetryEvent; id: string; version: string; previousVersion?: string; os?: string; uiLanguage?: string }): TelemetryPayload {
  return {
    ev: input.ev,
    id: input.id,
    v: input.version,
    ...(input.ev === 'update' && input.previousVersion ? { pv: input.previousVersion } : {}),
    p: platformOf(input.os),
    l: languageOf(input.uiLanguage),
  };
}

export function uninstallUrl(id: string, version: string): string {
  return `${TELEMETRY_ORIGIN}/u?id=${encodeURIComponent(id)}&v=${encodeURIComponent(version)}`;
}

/** Off in test builds, and when the user turned it off. */
export function telemetryAllowed(shareStats: boolean): boolean {
  return shareStats && !__FRAMESHOT_E2E__ && TELEMETRY_ORIGIN.startsWith('https://');
}

async function readState(): Promise<TelemetryState> {
  const raw = (await chrome.storage.local.get(TELEMETRY_KEY))[TELEMETRY_KEY] as Partial<TelemetryState> | undefined;
  return { id: isInstallId(raw?.id) ? raw.id : '', ...(raw?.pending ? { pending: raw.pending } : {}) };
}

async function writeState(state: TelemetryState): Promise<void> {
  await chrome.storage.local.set({ [TELEMETRY_KEY]: state });
}

async function post(payload: TelemetryPayload): Promise<boolean> {
  try {
    // text/plain keeps this a "simple" request (no CORS preflight); the Worker reads the body as JSON.
    const res = await fetch(`${TELEMETRY_ORIGIN}/e`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      keepalive: true,
    });
    // A 4xx means the server will never take this event: don't retry it.
    return res.ok || (res.status >= 400 && res.status < 500);
  } catch {
    return false;
  }
}

async function send(state: TelemetryState, ev: TelemetryEvent, previousVersion?: string): Promise<void> {
  const platform = await chrome.runtime.getPlatformInfo().catch(() => undefined);
  const payload = buildPayload({
    ev,
    id: state.id,
    version: chrome.runtime.getManifest().version,
    previousVersion,
    os: platform?.os,
    uiLanguage: chrome.i18n?.getUILanguage?.(),
  });
  const delivered = await post(payload);
  await writeState(delivered ? { id: state.id } : { id: state.id, pending: { ev, ...(previousVersion ? { pv: previousVersion } : {}) } });
}

/** Points Chrome's uninstall address at the tracker (or clears it). */
async function applyUninstallUrl(id: string): Promise<void> {
  try {
    await chrome.runtime.setUninstallURL(id ? uninstallUrl(id, chrome.runtime.getManifest().version) : '');
  } catch {
    /* not fatal */
  }
}

/** chrome.runtime.onInstalled: count the install or update. */
export async function onInstalledTelemetry(reason: string, previousVersion?: string): Promise<void> {
  if (reason !== 'install' && reason !== 'update') return;
  const { shareStats } = await loadSettings();
  if (!telemetryAllowed(shareStats)) return;
  const state = await readState();
  // Updating from a version without install counts: the update creates the id.
  const id = state.id || newInstallId();
  await applyUninstallUrl(id);
  await send({ id }, reason === 'install' ? 'install' : 'update', previousVersion);
}

/** chrome.runtime.onStartup: retry an undelivered event and keep the uninstall address current. */
export async function onStartupTelemetry(): Promise<void> {
  const { shareStats } = await loadSettings();
  if (!telemetryAllowed(shareStats)) return;
  const state = await readState();
  if (!state.id) return;
  await applyUninstallUrl(state.id);
  if (state.pending) await send(state, state.pending.ev, state.pending.pv);
}

/** The setting changed. Off: forget the id and the uninstall address. On: make a new id (nothing is sent until the next update). */
export async function onShareStatsChanged(shareStats: boolean): Promise<void> {
  if (__FRAMESHOT_E2E__) return;
  const state = await readState();
  if (!shareStats) {
    if (state.id) await chrome.storage.local.remove(TELEMETRY_KEY);
    await applyUninstallUrl('');
    return;
  }
  if (state.id) return;
  const id = newInstallId();
  await writeState({ id });
  await applyUninstallUrl(id);
}
