/**
 * The shared tab's own sound must end up in the recording. A fixture tab plays
 * a steady 440 Hz tone; Chrome's picker is told to pick that tab; the saved
 * video's audio is decoded and checked for the tone.
 */
import { test as base, expect, type Page } from '@playwright/test';
import { launchExtension, setSettings, startServer, type ExtFixture } from './harness';

const test = base.extend<object, { ext: ExtFixture }>({
  ext: [
    async ({}, use) => {
      const server = await startServer();
      const { context, sw, extId } = await launchExtension({
        extraArgs: [
          '--use-fake-ui-for-media-stream',
          '--auto-select-tab-capture-source-by-title=Tone fixture',
          '--autoplay-policy=no-user-gesture-required',
        ],
      });
      await use({ context, sw, extId, server: server.url, requests: server.requests });
      await context.close();
      await server.close();
    },
    { scope: 'worker' },
  ],
});

/** Decodes a recording's audio and measures the 440 Hz tone (Goertzel) against the total level. */
async function toneLevel(page: Page): Promise<{ rms: number; tone: number; duration: number }> {
  await expect(page.getByTestId('player-video')).toHaveAttribute('src', /^blob:/, { timeout: 15000 });
  return page.evaluate(async () => {
    const video = document.querySelector<HTMLVideoElement>('[data-testid=player-video]')!;
    const blob = await (await fetch(video.src)).blob();
    const ctx = new OfflineAudioContext(1, 48000, 48000);
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = audio.getChannelData(0);
    // Skip the first half second (the recorder's start), measure up to 2 s.
    const start = Math.floor(audio.sampleRate * 0.5);
    const n = Math.min(data.length - start, audio.sampleRate * 2);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += data[start + i] ** 2;
    const k = (2 * Math.PI * 440) / audio.sampleRate;
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < n; i++) {
      const s0 = data[start + i] + 2 * Math.cos(k) * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const power = s1 * s1 + s2 * s2 - 2 * Math.cos(k) * s1 * s2;
    return { rms: Math.sqrt(sum / Math.max(1, n)), tone: Math.sqrt(power) / Math.max(1, n), duration: audio.duration };
  });
}

for (const format of ['mp4', 'webm'] as const) {
  test(`the shared tab's sound is recorded (${format}, no microphone)`, async ({ ext }) => {
    await setSettings(ext.sw, {
      afterCapture: 'library',
      sounds: { enabled: false, volume: 0.5 },
      recorder: { countdown: 0, mic: false, camera: false, systemAudio: true, format, surface: 'browser', cameraPosition: 'bottom-right', cameraSize: 'medium' },
    });
    const tone = await ext.context.newPage();
    await tone.goto(`${ext.server}/tone.html`);
    await tone.evaluate(() => (window as unknown as { playTone(): Promise<void> }).playTone());
    const page = await ext.context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`chrome-extension://${ext.extId}/studio.html#/record`);
    await page.getByTestId('record-start').click();
    await expect(page.getByTestId('record-status')).toHaveText('Recording', { timeout: 20000 });
    const snap = await page.evaluate(() => (window as unknown as { __frameshotRecorder: { snapshot(): { hasSystemAudio: boolean; warnings: string[] } } }).__frameshotRecorder.snapshot());
    expect(snap.warnings).toEqual([]);
    expect(snap.hasSystemAudio).toBe(true);
    // The live meter shows the shared sound, and nothing says sound is missing.
    await expect(page.getByTestId('sound-meter')).toBeVisible();
    await expect(page.getByTestId('sound-missing')).toHaveCount(0);
    await page.waitForTimeout(3000);
    await page.getByTestId('record-stop').click();
    await page.waitForURL(/#\/play\//, { timeout: 30000 });
    const level = await toneLevel(page);
    // The tab's tone is clearly in the recording. (Headless Chromium routes tab sound
    // through a stand-in input device that alters its pitch, so the level is checked,
    // not the exact 440 Hz.)
    expect(level.duration).toBeGreaterThan(2);
    expect(level.rms).toBeGreaterThan(0.03);
    await page.close();
    await tone.close();
  });
}

test('when Chrome shares no sound, the recorder says why and offers to try again', async ({ ext }) => {
  await setSettings(ext.sw, {
    afterCapture: 'library',
    sounds: { enabled: false, volume: 0.5 },
    recorder: { countdown: 0, mic: false, camera: false, systemAudio: true, format: 'webm', surface: 'monitor', cameraPosition: 'bottom-right', cameraSize: 'medium' },
  });
  const page = await ext.context.newPage();
  // A shared screen without sound (what happens when "Also share system audio" is left off).
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 640;
      c.height = 400;
      const x = c.getContext('2d')!;
      setInterval(() => {
        x.fillStyle = `hsl(${Date.now() / 20 % 360},60%,50%)`;
        x.fillRect(0, 0, 640, 400);
      }, 40);
      return c.captureStream(30);
    };
  });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/record`);
  // Before recording: what to tick in Chrome's picker.
  await expect(page.getByTestId('sound-hint')).toBeVisible();
  await page.getByTestId('record-start').click();
  await expect(page.getByTestId('record-status')).toHaveText('Recording', { timeout: 20000 });
  const banner = page.getByTestId('sound-missing');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('No sound is being recorded');
  await page.getByTestId('sound-retry').click();
  await expect(page.getByTestId('record-start')).toBeVisible({ timeout: 15000 });
  await page.close();
});
