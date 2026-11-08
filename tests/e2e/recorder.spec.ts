/**
 * Screen recorder, driven through the real UI in Chromium with fake media
 * devices: Chrome's fake share picker (it picks a tab, here the recorder tab
 * itself), a fake camera (a green test pattern) and a fake microphone.
 */
import { execFileSync } from 'node:child_process';
import { test as base, expect, type Page } from '@playwright/test';
import { launchExtension, setSettings, startServer, type ExtFixture } from './harness';
import { lastDownloadId, nextDownload } from './editor-helpers';

const test = base.extend<object, { ext: ExtFixture }>({
  ext: [
    async ({}, use) => {
      const server = await startServer();
      const { context, sw, extId } = await launchExtension({
        // Chrome's real desktop autoplay rule, so sounds are tested as users get them.
        extraArgs: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=document-user-activation-required'],
      });
      await use({ context, sw, extId, server: server.url, requests: server.requests });
      await context.close();
      await server.close();
    },
    { scope: 'worker' },
  ],
});

interface RecorderOpts {
  countdown?: number;
  mic?: boolean;
  camera?: boolean;
  systemAudio?: boolean;
  format?: 'mp4' | 'webm';
  cameraPosition?: string;
  cameraSize?: string;
}

async function configure(ext: ExtFixture, recorder: RecorderOpts) {
  await setSettings(ext.sw, {
    afterCapture: 'library',
    theme: 'light',
    filenameTemplate: 'frameshot-{domain}-{date}-{time}',
    recorder: { countdown: 0, mic: false, camera: false, systemAudio: true, format: 'mp4', cameraPosition: 'bottom-right', cameraSize: 'medium', ...recorder },
  });
}

async function openStudio(ext: ExtFixture, route: string): Promise<Page> {
  const page = await ext.context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`chrome-extension://${ext.extId}/studio.html#${route}`);
  return page;
}

interface Snap {
  phase: string;
  bytes: number;
  hasMic: boolean;
  hasSystemAudio: boolean;
  hasCamera: boolean;
  mimeType?: string;
  sessionId?: string;
  warnings: string[];
}

const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __frameshotRecorder: { snapshot(): Snap } }).__frameshotRecorder.snapshot());

async function startRecording(page: Page): Promise<void> {
  await page.getByTestId('record-start').click();
  await expect(page.getByTestId('record-status')).toHaveText('Recording', { timeout: 20000 });
}

async function waitForPlayer(page: Page): Promise<string> {
  await page.waitForURL(/#\/play\//, { timeout: 30000 });
  return decodeURIComponent(page.url().split('#/play/')[1]);
}

async function videoMeta(page: Page): Promise<{ duration: number; width: number; height: number }> {
  const video = page.getByTestId('player-video');
  await expect(video).toBeVisible({ timeout: 15000 });
  return video.evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    return { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
  });
}

interface DbState {
  item?: { kind: string; mimeType: string; durationMs: number; hasAudio: boolean; byteSize: number; width: number; height: number; warnings: string[]; surface?: string };
  chunks: number;
  chunkBytes: number;
  sessions: number;
  thumb: number;
}

async function dbState(page: Page, id: string): Promise<DbState> {
  return page.evaluate(async (itemId) => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open('frameora');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const req = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => ((r.onsuccess = () => res(r.result)), (r.onerror = () => rej(r.error))));
    const tx = db.transaction(['items', 'recChunks', 'recSessions', 'blobs'], 'readonly');
    const item = await req(tx.objectStore('items').get(itemId));
    const chunks = (await req(tx.objectStore('recChunks').getAll(IDBKeyRange.bound([itemId, 0], [itemId, Number.MAX_SAFE_INTEGER])))) as Blob[];
    const sessions = await req(tx.objectStore('recSessions').count());
    const thumb = (await req(tx.objectStore('blobs').get(`${itemId}:thumb`))) as Blob | undefined;
    db.close();
    return { item, chunks: chunks.length, chunkBytes: chunks.reduce((n, c) => n + c.size, 0), sessions, thumb: thumb?.size ?? 0 };
  }, id);
}

/** Average colour of a square region of the frame at `time` seconds. */
async function frameColor(page: Page, time: number, regions: { x: number; y: number; size: number }[]): Promise<[number, number, number][]> {
  const video = page.getByTestId('player-video');
  return video.evaluate(
    async (el, [t, rs]) => {
      const v = el as HTMLVideoElement;
      if (v.readyState < 2) await new Promise((r) => v.addEventListener('loadeddata', r, { once: true }));
      v.currentTime = t as number;
      await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, 0, 0);
      return (rs as { x: number; y: number; size: number }[]).map((r) => {
        const d = ctx.getImageData(r.x, r.y, r.size, r.size).data;
        let R = 0;
        let G = 0;
        let B = 0;
        for (let i = 0; i < d.length; i += 4) {
          R += d[i];
          G += d[i + 1];
          B += d[i + 2];
        }
        const n = d.length / 4;
        return [Math.round(R / n), Math.round(G / n), Math.round(B / n)] as [number, number, number];
      });
    },
    [time, regions] as const,
  );
}

test('records with tab sound and microphone, saves an MP4 to the library and opens the player', async ({ ext }) => {
  await configure(ext, { mic: true });
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  const live = await snapshot(page);
  expect(live.hasSystemAudio).toBe(true);
  expect(live.hasMic).toBe(true);
  expect(live.mimeType).toMatch(/^video\/mp4;codecs=avc1/);
  // The toolbar badge shows the recording from any tab.
  await expect.poll(() => ext.sw.evaluate(() => chrome.action.getBadgeText({}))).toBe('REC');

  // Data reaches IndexedDB while recording (not only at the end), so a crash cannot lose it all.
  const chunks = () => page.evaluate(() => (window as unknown as { __frameshotRecorder: { chunks(): number } }).__frameshotRecorder.chunks());
  await expect.poll(chunks, { timeout: 10000 }).toBeGreaterThanOrEqual(2);
  const recordedFor = await page.getByTestId('record-timer').textContent();
  await page.getByTestId('record-stop').click();
  const id = await waitForPlayer(page);

  const meta = await videoMeta(page);
  expect(meta.duration, `timer showed ${recordedFor}`).toBeGreaterThan(2.3);
  expect(meta.duration).toBeLessThan(8);
  expect(meta.width).toBeGreaterThan(0);

  const db = await dbState(page, id);
  expect(db.item?.kind).toBe('recording');
  expect(db.item?.mimeType).toMatch(/^video\/mp4/);
  expect(db.item?.hasAudio).toBe(true);
  expect(db.item?.durationMs).toBeGreaterThan(2300);
  expect(db.item?.byteSize).toBe(db.chunkBytes);
  expect(db.chunks).toBeGreaterThan(0);
  expect(db.sessions).toBe(0);
  expect(db.thumb).toBeGreaterThan(500);
  await expect.poll(() => ext.sw.evaluate(() => chrome.action.getBadgeText({}))).toBe('');
  await page.close();
});

test('WebM recordings get a real, seekable duration', async ({ ext }) => {
  await configure(ext, { format: 'webm' });
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  expect((await snapshot(page)).mimeType).toMatch(/^video\/webm/);
  await page.waitForTimeout(2500);
  await page.getByTestId('record-stop').click();
  const id = await waitForPlayer(page);
  const meta = await videoMeta(page);
  // MediaRecorder alone writes WebM with no duration (Infinity); FrameShot repairs it.
  expect(Number.isFinite(meta.duration)).toBe(true);
  expect(meta.duration).toBeGreaterThan(1.8);
  expect(meta.duration).toBeLessThan(4.5);
  const db = await dbState(page, id);
  expect(db.item?.mimeType).toMatch(/^video\/webm/);
  await page.close();
});

test('paused time is left out of the recording', async ({ ext }) => {
  await configure(ext, {});
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  await page.waitForTimeout(1500);
  await page.getByTestId('record-pause').click();
  await expect(page.getByTestId('record-status')).toHaveText('Paused');
  await expect.poll(() => ext.sw.evaluate(() => chrome.action.getBadgeText({}))).toBe('II');
  await page.waitForTimeout(3000);
  await page.getByTestId('record-resume').click();
  await expect(page.getByTestId('record-status')).toHaveText('Recording');
  await page.waitForTimeout(1500);
  await page.getByTestId('record-stop').click();
  const id = await waitForPlayer(page);
  const meta = await videoMeta(page);
  // About 3 s recorded around a 3 s pause.
  expect(meta.duration).toBeGreaterThan(2.2);
  expect(meta.duration).toBeLessThan(4.6);
  const db = await dbState(page, id);
  expect(db.item!.durationMs).toBeGreaterThan(2200);
  expect(db.item!.durationMs).toBeLessThan(4600);
  await page.close();
});

test('the camera bubble is drawn into the video at the chosen corner', async ({ ext }) => {
  await configure(ext, { camera: true, cameraPosition: 'bottom-right', cameraSize: 'medium' });
  const page = await openStudio(ext, '/record');
  // The setup preview shows the camera before recording.
  await expect(page.getByTestId('camera-bubble').locator('video')).toBeVisible();
  await startRecording(page);
  expect((await snapshot(page)).hasCamera).toBe(true);
  await page.waitForTimeout(2500);
  await page.getByTestId('record-stop').click();
  await waitForPlayer(page);
  const meta = await videoMeta(page);
  // Bubble geometry (see compositor.ts): diameter 28% of the short side, 3.5% margin.
  const short = Math.min(meta.width, meta.height);
  const d = Math.round(short * 0.28);
  const margin = Math.round(short * 0.035);
  const cx = meta.width - margin - d / 2;
  const cy = meta.height - margin - d / 2;
  const s = 8;
  const inside = [
    { x: Math.round(cx - d * 0.3) - s / 2, y: Math.round(cy - d * 0.05) - s / 2, size: s },
    { x: Math.round(cx - d * 0.05) - s / 2, y: Math.round(cy + d * 0.3) - s / 2, size: s },
    { x: Math.round(cx + d * 0.05) - s / 2, y: Math.round(cy - d * 0.32) - s / 2, size: s },
  ];
  const outside = [{ x: 20, y: 20, size: s }];
  const colors = await frameColor(page, 1, [...inside, ...outside]);
  // Chrome's fake camera is a green test pattern.
  for (const [r, g, b] of colors.slice(0, 3)) {
    expect(g, `inside bubble ${r},${g},${b}`).toBeGreaterThan(r + 40);
    expect(g, `inside bubble ${r},${g},${b}`).toBeGreaterThan(b + 40);
  }
  const [r, g, b] = colors[3];
  expect(g > r + 40 && g > b + 40, `outside bubble ${r},${g},${b}`).toBe(false);
  await page.close();
});

test('Chrome’s “Stop sharing” button ends and saves the recording', async ({ ext }) => {
  await configure(ext, {});
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  await page.waitForTimeout(1800);
  await page.evaluate(() => (window as unknown as { __frameshotRecorder: { endShare(): void } }).__frameshotRecorder.endShare());
  const id = await waitForPlayer(page);
  const db = await dbState(page, id);
  expect(db.item?.kind).toBe('recording');
  expect(db.item!.durationMs).toBeGreaterThan(1200);
  await page.close();
});

test('discarding deletes everything that was recorded', async ({ ext }) => {
  await configure(ext, {});
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  const sessionId = (await snapshot(page)).sessionId!;
  await page.waitForTimeout(2200);
  await page.getByTestId('record-discard').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByTestId('record-start')).toBeVisible();
  expect((await snapshot(page)).phase).toBe('idle');
  const db = await dbState(page, sessionId);
  expect(db.item).toBeUndefined();
  expect(db.chunks).toBe(0);
  expect(db.sessions).toBe(0);
  expect(page.url()).toContain('#/record');
  await page.close();
});

test('the popup shows a running recording and can pause and stop it', async ({ ext }) => {
  await configure(ext, {});
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  const popup = await ext.context.newPage();
  await popup.setViewportSize({ width: 360, height: 640 });
  await popup.goto(`chrome-extension://${ext.extId}/popup.html`);
  await expect(popup.getByTestId('popup-recording')).toBeVisible();
  await expect(popup.getByTestId('record-screen')).toHaveCount(0);
  await popup.getByTestId('popup-recording-pause').click();
  await expect(page.getByTestId('record-status')).toHaveText('Paused');
  await expect(popup.getByText('Recording paused')).toBeVisible();
  await popup.getByTestId('popup-recording-stop').click();
  await waitForPlayer(page);
  await expect(popup.getByTestId('popup-recording')).toHaveCount(0);
  await expect(popup.getByTestId('record-screen')).toBeVisible();
  await popup.close();
  await page.close();
});

test('recordings appear in the library, play, download as a video file, and turn frames into screenshots', async ({ ext }) => {
  await configure(ext, {});
  const rec = await openStudio(ext, '/record');
  await startRecording(rec);
  await rec.waitForTimeout(2500);
  await rec.getByTestId('record-stop').click();
  const id = await waitForPlayer(rec);
  const item = (await dbState(rec, id)).item!;

  // Save a frame from the player as a screenshot.
  await videoMeta(rec);
  await rec.getByTestId('player-video').evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    v.currentTime = 1;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  });
  await rec.getByTestId('save-frame').click();
  await expect(rec.getByText(/saved as a screenshot/)).toBeVisible();
  const frame = await rec.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('frameora');
      r.onsuccess = () => res(r.result);
    });
    const all: { kind: string; mimeType: string; width: number; createdAt: number }[] = await new Promise((res) => {
      const q = db.transaction('items').objectStore('items').getAll();
      q.onsuccess = () => res(q.result);
    });
    db.close();
    return all.filter((i) => i.kind === 'frame').sort((a, b) => b.createdAt - a.createdAt)[0];
  });
  expect(frame?.mimeType).toBe('image/png');
  expect(frame?.width).toBe(item.width);
  await rec.close();

  const page = await openStudio(ext, '/');
  await page.getByRole('button', { name: /^Recordings/ }).click();
  const card = page.locator(`[data-testid="library-card"][data-id="${id}"]`);
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-kind', 'recording');
  await expect(card.getByTestId('card-duration')).toHaveText(/^0:0[1-5]$/);
  // Videos have no "copy image" action.
  await card.hover();
  await expect(card.getByRole('button', { name: /^Copy / })).toHaveCount(0);

  // Playwright stores downloads under random names, so record the requested file name.
  await page.evaluate(() => {
    const w = window as unknown as { __names: string[] };
    w.__names = [];
    const original = chrome.downloads.download.bind(chrome.downloads);
    (chrome.downloads as unknown as { download: typeof original }).download = ((opts: chrome.downloads.DownloadOptions) => {
      w.__names.push(opts.filename ?? '');
      return original(opts);
    }) as typeof original;
  });
  const before = await lastDownloadId(ext);
  await card.getByRole('button', { name: /^Download / }).click();
  const file = await nextDownload(ext, before);
  const names = await page.evaluate(() => (window as unknown as { __names: string[] }).__names);
  expect(names[0]).toMatch(/^frameshot-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.mp4$/);
  expect(file.mime).toBe('video/mp4');
  expect(file.bytes.length).toBe(item.byteSize);
  // An MP4 file starts with an "ftyp" box.
  expect(file.bytes.subarray(4, 8).toString('latin1')).toBe('ftyp');

  // A recording opens in the player, never in the image editor.
  await card.getByRole('button', { name: /^Open / }).click();
  await page.waitForURL(/#\/play\//);
  await expect(page.getByTestId('player-video')).toBeVisible();
  await page.goto(`chrome-extension://${ext.extId}/studio.html#/edit/${encodeURIComponent(id)}`);
  await page.waitForURL(/#\/play\//);
  await page.close();
});

test('bulk ZIP export includes recordings as their video files; PDF export leaves them out', async ({ ext }) => {
  await configure(ext, {});
  const rec = await openStudio(ext, '/record');
  await startRecording(rec);
  await rec.waitForTimeout(1500);
  await rec.getByTestId('record-stop').click();
  const id = await waitForPlayer(rec);
  const item = (await dbState(rec, id)).item!;
  await rec.close();

  const page = await openStudio(ext, '/');
  await page.getByRole('button', { name: /^Recordings/ }).click();
  const card = page.locator(`[data-testid="library-card"][data-id="${id}"]`);
  await card.hover();
  await card.getByRole('button', { name: /^Select / }).click();
  const before = await lastDownloadId(ext);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'PNG' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }).click();
  const zip = await nextDownload(ext, before);
  const listing = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("\\n".join(f"{i.filename}\\t{i.file_size}" for i in z.infolist()))', zip.path])
    .toString()
    .trim()
    .split('\n');
  expect(listing).toHaveLength(1);
  const [name, size] = listing[0].split('\t');
  expect(name).toMatch(/\.mp4$/);
  expect(Number(size)).toBe(item.byteSize);

  // PDF holds images only: with only a recording selected there is nothing to export.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'PDF' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByText(/PDF files hold images only/)).toBeVisible();
  await page.close();
});

for (const format of ['webm', 'mp4'] as const) {
  test(`an interrupted ${format.toUpperCase()} recording can be recovered the next time the recorder opens`, async ({ ext }) => {
    await configure(ext, { format });
    const page = await openStudio(ext, '/record');
    await startRecording(page);
    const sessionId = (await snapshot(page)).sessionId!;
    const chunks = () => page.evaluate(() => (window as unknown as { __frameshotRecorder: { chunks(): number } }).__frameshotRecorder.chunks());
    await expect.poll(chunks, { timeout: 10000 }).toBeGreaterThanOrEqual(3);
    // The tab goes away without stopping (like a crash or a closed window).
    await page.close({ runBeforeUnload: false });

    const studio = await openStudio(ext, '/__test');
    // Pretend the heartbeat stopped a while ago (instead of waiting 15 s).
    await studio.evaluate(async (sid) => {
      const db: IDBDatabase = await new Promise((res) => {
        const r = indexedDB.open('frameora');
        r.onsuccess = () => res(r.result);
      });
      const tx = db.transaction('recSessions', 'readwrite');
      const store = tx.objectStore('recSessions');
      const rec = await new Promise<Record<string, unknown>>((res) => {
        const q = store.get(sid);
        q.onsuccess = () => res(q.result);
      });
      store.put({ ...rec, updatedAt: Date.now() - 60_000 });
      await new Promise((r) => (tx.oncomplete = r));
      db.close();
    }, sessionId);
    await studio.goto(`chrome-extension://${ext.extId}/studio.html#/record`);
    await studio.getByTestId('recover-recording').click();
    const id = await waitForPlayer(studio);
    expect(id).toBe(sessionId);
    const meta = await videoMeta(studio);
    expect(meta.width).toBeGreaterThan(0);
    // The recovered file plays: decode a frame from it.
    const played = await studio.getByTestId('player-video').evaluate(async (el) => {
      const v = el as HTMLVideoElement;
      v.muted = true;
      await v.play();
      await new Promise((r) => setTimeout(r, 600));
      v.pause();
      return v.currentTime;
    });
    expect(played).toBeGreaterThan(0.2);
    const db = await dbState(studio, id);
    expect(db.item?.kind).toBe('recording');
    expect(db.item?.warnings.join(' ')).toMatch(/Recovered/);
    expect(db.sessions).toBe(0);
    await studio.close();
  });
}

test('the start/stop recording shortcut opens the recorder (once), and stops a running recording', async ({ ext }) => {
  await configure(ext, {});
  const commands = await ext.sw.evaluate(() => chrome.commands.getAll());
  expect(commands.some((c) => c.name === 'toggle-recording')).toBe(true);
  const command = (c: string) => ext.sw.evaluate((name) => (globalThis as unknown as { __frameshotTest: { command(c: string): Promise<void> } }).__frameshotTest.command(name), c);

  for (const p of ext.context.pages()) if (p.url().includes('#/record')) await p.close();
  await command('toggle-recording');
  await expect.poll(() => ext.context.pages().filter((p) => p.url().includes('studio.html#/record')).length).toBe(1);
  // Pressing it again while idle focuses the same recorder tab instead of opening another.
  await command('toggle-recording');
  await new Promise((r) => setTimeout(r, 800));
  expect(ext.context.pages().filter((p) => p.url().includes('studio.html#/record')).length).toBe(1);

  const page = ext.context.pages().find((p) => p.url().includes('studio.html#/record'))!;
  await startRecording(page);
  await page.waitForTimeout(1500);
  // While recording, the shortcut stops and saves.
  await command('toggle-recording');
  await waitForPlayer(page);
  await page.close();
});

test('recorder choices are remembered in settings', async ({ ext }) => {
  await configure(ext, {});
  const page = await openStudio(ext, '/record');
  await page.getByRole('radio', { name: /Window/ }).click();
  await page.getByLabel('Quality').selectOption('720p');
  await page.getByLabel('Frame rate').selectOption('60');
  await expect
    .poll(async () => ext.sw.evaluate(async () => ((await chrome.storage.local.get('frameora.settings'))['frameora.settings'] as { recorder: Record<string, unknown> }).recorder))
    .toMatchObject({ surface: 'window', quality: '720p', fps: 60 });
  await page.reload();
  await expect(page.getByLabel('Quality')).toHaveValue('720p');
  await page.close();
});

test('opening the library re-uses an open library tab, but never takes over a player or editor tab', async ({ ext }) => {
  for (const p of ext.context.pages()) if (p.url().includes('studio.html')) await p.close();
  const studioTabs = () => ext.context.pages().filter((p) => p.url().includes('studio.html'));
  const command = (c: string) => ext.sw.evaluate((name) => (globalThis as unknown as { __frameshotTest: { command(c: string): Promise<void> } }).__frameshotTest.command(name), c);

  const player = await openStudio(ext, '/play/not-a-real-id');
  await expect(player.getByText('Recording not found')).toBeVisible();
  await command('open-library');
  await expect.poll(() => studioTabs().length).toBe(2);
  expect(player.url()).toContain('#/play/');

  // Now a library tab exists: it is brought forward instead of opening a third tab.
  await command('open-library');
  await new Promise((r) => setTimeout(r, 800));
  expect(studioTabs().length).toBe(2);
  for (const p of studioTabs()) await p.close();
});


// ── GIF export ──

/** Walks a GIF's blocks: size, frame count, total delay, loop setting. */
function inspectGif(bytes: Buffer) {
  let p = 6;
  const width = bytes.readUInt16LE(p);
  const height = bytes.readUInt16LE(p + 2);
  const packed = bytes[p + 4];
  p += 7;
  if (packed & 0x80) p += 3 * (2 << (packed & 7));
  let frames = 0;
  let delayCs = 0;
  let loop: number | null = null;
  const skipSubBlocks = () => {
    const out: number[] = [];
    for (let len = bytes[p++]; len !== 0; len = bytes[p++]) {
      for (let i = 0; i < len; i++) out.push(bytes[p + i]);
      p += len;
    }
    return out;
  };
  for (;;) {
    const b = bytes[p++];
    if (b === 0x3b || b === undefined) break;
    if (b === 0x21) {
      const label = bytes[p++];
      const data = skipSubBlocks();
      if (label === 0xf9) delayCs += data[1] | (data[2] << 8);
      if (label === 0xff && String.fromCharCode(...data.slice(0, 11)) === 'NETSCAPE2.0') loop = data[12] | (data[13] << 8);
    } else if (b === 0x2c) {
      const ip = bytes[p + 8];
      p += 9;
      if (ip & 0x80) p += 3 * (2 << (ip & 7));
      p++; // LZW minimum code size
      skipSubBlocks();
      frames++;
    } else throw new Error(`unexpected GIF block 0x${b.toString(16)}`);
  }
  return { header: bytes.subarray(0, 6).toString('latin1'), width, height, frames, delayCs, loop, trailer: bytes[bytes.length - 1] };
}

/** Sets a React-controlled range input. */
async function setRange(page: Page, testId: string, value: number) {
  await page.getByTestId(testId).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('exports part of a recording as a looping GIF, made on this device', async ({ ext }) => {
  await configure(ext, {});
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  await page.waitForTimeout(3200);
  await page.getByTestId('record-stop').click();
  await waitForPlayer(page);
  await videoMeta(page);

  await page.getByTestId('player-gif').click();
  const dialog = page.getByRole('dialog', { name: 'Export as GIF' });
  await expect(dialog).toBeVisible();
  await setRange(page, 'gif-start', 0.5);
  await setRange(page, 'gif-end', 2.5);
  await dialog.getByRole('radio', { name: '320' }).click();
  await dialog.getByRole('radio', { name: '10' }).click();
  await expect(page.getByTestId('gif-summary')).toContainText('20 frames');
  const before = await lastDownloadId(ext);
  await page.getByTestId('gif-create').click();
  const file = await nextDownload(ext, before, 60000);
  await expect(dialog).toBeHidden();
  expect(file.mime).toBe('image/gif');
  const gif = inspectGif(file.bytes);
  expect(gif.header).toBe('GIF89a');
  expect(gif.width).toBe(320);
  expect(gif.trailer).toBe(0x3b);
  expect(gif.loop).toBe(0);
  // 20 frames at 10 fps = 2 s; identical neighbours may be merged, the length is kept.
  expect(gif.frames).toBeGreaterThanOrEqual(2);
  expect(gif.frames).toBeLessThanOrEqual(20);
  expect(gif.delayCs).toBe(200);
  await page.close();
});

test('“Export as GIF…” in the library opens the GIF dialog for that recording', async ({ ext }) => {
  await configure(ext, {});
  const rec = await openStudio(ext, '/record');
  await startRecording(rec);
  await rec.waitForTimeout(1500);
  await rec.getByTestId('record-stop').click();
  const id = await waitForPlayer(rec);
  await rec.close();
  const page = await openStudio(ext, '/');
  const card = page.locator(`[data-testid="library-card"][data-id="${id}"]`);
  await card.getByRole('button', { name: /^Actions for / }).click();
  await page.getByRole('menuitem', { name: 'Export as GIF…' }).click();
  await expect(page.getByRole('dialog', { name: 'Export as GIF' })).toBeVisible();
  expect(page.url()).toContain(`#/play/${encodeURIComponent(id)}`);
  await page.close();
});

// ── Sounds ──

test('recording plays countdown, start and stop sounds under Chrome’s autoplay rules', async ({ ext }) => {
  await configure(ext, { countdown: 3 });
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  await page.getByTestId('record-pause').click();
  await expect(page.getByTestId('record-status')).toHaveText('Paused');
  await page.getByTestId('record-resume').click();
  await expect(page.getByTestId('record-status')).toHaveText('Recording');
  await page.getByTestId('record-stop').click();
  await waitForPlayer(page);
  const sounds = await page.evaluate(() => (window as unknown as { __frameshotSounds: { name: string; state: string }[] }).__frameshotSounds);
  expect(sounds.map((s) => s.name)).toEqual(['tick', 'tick', 'tick', 'rec-start', 'pause', 'resume', 'rec-stop']);
  // The audio context was allowed to run (it was created during the click).
  expect(sounds.every((s) => s.state === 'running')).toBe(true);
  await page.close();
});

test('a saved capture plays the camera shutter from the background, and sounds can be turned off', async ({ ext }) => {
  await configure(ext, {});
  const fixture = await ext.context.newPage();
  await fixture.goto(`${ext.server}/long.html`);
  await fixture.bringToFront();
  const tabId = await ext.sw.evaluate(async (u) => (await chrome.tabs.query({})).find((t) => t.url === u)!.id!, `${ext.server}/long.html`);
  const capture = async () => {
    const since = await ext.sw.evaluate(() => (globalThis as unknown as { __frameshotTest: { status(): { updatedAt: number } } }).__frameshotTest.status().updatedAt);
    await ext.sw.evaluate((id) => (globalThis as unknown as { __frameshotTest: { start(t: number, m: string): Promise<void> } }).__frameshotTest.start(id, 'visible'), tabId);
    await expect
      .poll(() => ext.sw.evaluate(() => (globalThis as unknown as { __frameshotTest: { status(): { phase: string; updatedAt: number } } }).__frameshotTest.status()), { timeout: 30000 })
      .toMatchObject({ phase: 'done' });
    expect(since).toBeDefined();
  };
  const heard = () => ext.sw.evaluate(() => (globalThis as unknown as { __frameshotTest: { sounds(): { name: string; state: string }[] } }).__frameshotTest.sounds());
  const before = (await heard()).length;
  await capture();
  await expect.poll(async () => (await heard()).slice(before)).toEqual([{ name: 'shutter', state: 'running' }]);

  // Off in Settings: silence.
  await setSettings(ext.sw, { sounds: { enabled: false, volume: 0.6 } });
  const n = (await heard()).length;
  await capture();
  await new Promise((r) => setTimeout(r, 1200));
  expect((await heard()).length).toBe(n);
  await setSettings(ext.sw, { sounds: { enabled: true, volume: 0.6 } });
  await fixture.close();
});

test('every sound effect is audible and never clips', async ({ ext }) => {
  const page = await openStudio(ext, '/__test');
  const levels = await page.evaluate(() => (window as unknown as { __frameshotSoundCheck(): Promise<Record<string, { rms: number; peak: number }>> }).__frameshotSoundCheck());
  expect(Object.keys(levels).sort()).toEqual(['error', 'pause', 'rec-start', 'rec-stop', 'resume', 'shutter', 'success', 'tick']);
  for (const [name, { rms, peak }] of Object.entries(levels)) {
    expect(rms, name).toBeGreaterThan(0.003);
    expect(peak, name).toBeLessThan(0.9);
  }
  await page.close();
});

// ── Regressions found in review ──

test('a Discard confirmed after the recording already ended deletes the saved copy', async ({ ext }) => {
  await configure(ext, {});
  const page = await openStudio(ext, '/record');
  await startRecording(page);
  const id = (await snapshot(page)).sessionId!;
  await page.waitForTimeout(1500);
  await page.getByTestId('record-discard').click();
  const dialog = page.getByRole('dialog', { name: 'Discard this recording?' });
  await expect(dialog).toBeVisible();
  // Meanwhile the recording ends (Chrome's "Stop sharing") and is saved.
  await page.evaluate(() => (window as unknown as { __frameshotRecorder: { endShare(): void } }).__frameshotRecorder.endShare());
  await expect.poll(async () => (await dbState(page, id)).item?.kind ?? null, { timeout: 15000 }).toBe('recording');
  await dialog.getByRole('button', { name: 'Discard' }).click();
  await expect.poll(async () => (await dbState(page, id)).item ?? null).toBeNull();
  expect((await dbState(page, id)).chunks).toBe(0);
  await expect(page.getByTestId('record-start')).toBeVisible();
  await page.close();
});

test('“Clear all local data” is refused while recording, and another tab cannot clear the REC badge', async ({ ext }) => {
  await configure(ext, {});
  const rec = await openStudio(ext, '/record');
  await startRecording(rec);
  await expect.poll(() => ext.sw.evaluate(() => chrome.action.getBadgeText({}))).toBe('REC');
  // A second Studio tab: the recorder there sees the running recording and stays idle.
  const other = await openStudio(ext, '/record');
  await expect(other.getByText(/already running in another FrameShot tab/)).toBeVisible();
  await expect(other.getByTestId('record-start')).toBeDisabled();
  await other.goto(`chrome-extension://${ext.extId}/studio.html#/settings`);
  await other.getByRole('button', { name: 'Clear all local data' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Delete everything' }).click();
  await expect(other.getByText(/Stop it before clearing all data/)).toBeVisible();
  expect((await dbState(rec, (await snapshot(rec)).sessionId!)).sessions).toBeGreaterThan(0);
  await other.close();
  await expect.poll(() => ext.sw.evaluate(() => chrome.action.getBadgeText({}))).toBe('REC');
  await rec.getByTestId('record-stop').click();
  await waitForPlayer(rec);
  await rec.close();
});
