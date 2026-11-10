import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, sanitizeSettings } from '../../src/core/settings';
import {
  buildPayload,
  isInstallId,
  languageOf,
  newInstallId,
  onInstalledTelemetry,
  onShareStatsChanged,
  onStartupTelemetry,
  platformOf,
  TELEMETRY_KEY,
  TELEMETRY_ORIGIN,
  uninstallUrl,
} from '../../src/core/telemetry';
import fs from 'node:fs';

describe('telemetry helpers', () => {
  it('makes random 128-bit hex ids', () => {
    const a = newInstallId();
    const b = newInstallId();
    expect(isInstallId(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(isInstallId('xyz')).toBe(false);
    expect(isInstallId(undefined)).toBe(false);
  });

  it('reduces OS and language to coarse values', () => {
    expect(platformOf('win')).toBe('win');
    expect(platformOf('cros')).toBe('cros');
    expect(platformOf('android')).toBe('other');
    expect(platformOf(undefined)).toBe('other');
    expect(languageOf('en-US')).toBe('en');
    expect(languageOf('pt_BR')).toBe('pt');
    expect(languageOf('')).toBe('other');
    expect(languageOf('x-very-long')).toBe('other');
  });

  it('builds payloads with only the documented fields', () => {
    const p = buildPayload({ ev: 'update', id: 'a'.repeat(32), version: '1.0.1', previousVersion: '1.0.0', os: 'mac', uiLanguage: 'de-DE' });
    expect(p).toEqual({ ev: 'update', id: 'a'.repeat(32), v: '1.0.1', pv: '1.0.0', p: 'mac', l: 'de' });
    const i = buildPayload({ ev: 'install', id: 'b'.repeat(32), version: '1.0.1', previousVersion: '0.9', os: 'linux', uiLanguage: 'en' });
    expect(Object.keys(i).sort()).toEqual(['ev', 'id', 'l', 'p', 'v']);
  });

  it('builds the uninstall address', () => {
    expect(uninstallUrl('c'.repeat(32), '1.0.1')).toBe(`${TELEMETRY_ORIGIN}/u?id=${'c'.repeat(32)}&v=1.0.1`);
  });

  it('shareStats defaults to on and survives sanitizing', () => {
    expect(DEFAULT_SETTINGS.shareStats).toBe(true);
    expect(sanitizeSettings({ shareStats: false }).shareStats).toBe(false);
    expect(sanitizeSettings({ shareStats: 'no' }).shareStats).toBe(true);
  });

  it('the manifest CSP and the bundle check allow exactly this origin', () => {
    expect(fs.readFileSync('wxt.config.ts', 'utf8')).toContain(`const TELEMETRY_ORIGIN = '${TELEMETRY_ORIGIN}'`);
    expect(fs.readFileSync('scripts/check-bundle.mjs', 'utf8')).toContain(`const TELEMETRY_ORIGIN = '${TELEMETRY_ORIGIN}'`);
  });
});

describe('telemetry flow (mocked chrome)', () => {
  let store: Record<string, unknown>;
  let uninstall: string | undefined;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = {};
    uninstall = undefined;
    fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (k: string) => (k in store ? { [k]: store[k] } : {}),
          set: async (o: Record<string, unknown>) => void Object.assign(store, o),
          remove: async (k: string) => void delete store[k],
        },
      },
      runtime: {
        getManifest: () => ({ version: '1.0.1' }),
        getPlatformInfo: async () => ({ os: 'win' }),
        setUninstallURL: async (u: string) => void (uninstall = u),
      },
      i18n: { getUILanguage: () => 'en-GB' },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const sent = () => fetchMock.mock.calls.map(([url, init]) => ({ url, body: JSON.parse((init as RequestInit).body as string) }));

  it('counts an install once, with a new id and uninstall address', async () => {
    await onInstalledTelemetry('install');
    const [call] = sent();
    expect(call.url).toBe(`${TELEMETRY_ORIGIN}/e`);
    expect(call.body).toMatchObject({ ev: 'install', v: '1.0.1', p: 'win', l: 'en' });
    expect(isInstallId(call.body.id)).toBe(true);
    expect((store[TELEMETRY_KEY] as { id: string }).id).toBe(call.body.id);
    expect(uninstall).toBe(uninstallUrl(call.body.id, '1.0.1'));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('omit');
    expect((init.headers as Record<string, string>)['content-type']).toBe('text/plain');
  });

  it('counts updates (with the previous version) and ignores Chrome updates', async () => {
    await onInstalledTelemetry('chrome_update');
    expect(fetchMock).not.toHaveBeenCalled();
    await onInstalledTelemetry('update', '1.0.0');
    expect(sent()[0].body).toMatchObject({ ev: 'update', pv: '1.0.0' });
  });

  it('sends nothing when the user turned it off', async () => {
    store[SETTINGS_KEY] = { shareStats: false };
    await onInstalledTelemetry('install');
    await onStartupTelemetry();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(uninstall).toBeUndefined();
  });

  it('keeps an undelivered event and retries it at the next start', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await onInstalledTelemetry('install');
    expect((store[TELEMETRY_KEY] as { pending?: unknown }).pending).toEqual({ ev: 'install' });
    await onStartupTelemetry();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((store[TELEMETRY_KEY] as { pending?: unknown }).pending).toBeUndefined();
  });

  it('turning it off deletes the id and clears the uninstall address', async () => {
    await onInstalledTelemetry('install');
    await onShareStatsChanged(false);
    expect(store[TELEMETRY_KEY]).toBeUndefined();
    expect(uninstall).toBe('');
    await onShareStatsChanged(true);
    const id = (store[TELEMETRY_KEY] as { id: string }).id;
    expect(isInstallId(id)).toBe(true);
    expect(uninstall).toBe(uninstallUrl(id, '1.0.1'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
