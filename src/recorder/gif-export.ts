/**
 * Turns part of a recording into an animated GIF, entirely on this device.
 *
 * Frames are read by seeking a hidden <video> to each sample time (exact
 * frames; faster and more reliable than sampling during playback, which drops
 * frames), drawn at the output size, and streamed to a Web Worker that
 * quantizes and encodes them (see gif.ts), so the page stays responsive.
 */
import { frameDelaysCs } from './gif';
import type { GifWorkerRequest, GifWorkerResponse } from './gif.worker';

export const GIF_MAX_SECONDS = 60;
export const GIF_WIDTHS = [320, 480, 640, 800] as const;
export const GIF_FPS = [10, 15, 20] as const;

export interface GifExportOptions {
  /** Seconds into the recording. */
  start: number;
  end: number;
  /** Output width in pixels; the height follows the video's shape. */
  width: number;
  fps: number;
  loop: boolean;
}

export interface GifPlan {
  width: number;
  height: number;
  /** Sample times in seconds. */
  times: number[];
  delaysCs: number[];
  start: number;
  end: number;
}

export interface GifProgress {
  phase: 'preparing' | 'reading' | 'finishing';
  done: number;
  total: number;
}

/** Clamps the request to the video and works out every frame (pure; unit-tested). */
export function planGif(duration: number, videoWidth: number, videoHeight: number, opts: GifExportOptions): GifPlan {
  const fps = Math.min(30, Math.max(1, opts.fps));
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const start = Math.min(Math.max(0, opts.start), Math.max(0, safeDuration - 1 / fps));
  const end = Math.min(safeDuration, start + GIF_MAX_SECONDS, Math.max(opts.end, start + 1 / fps));
  const count = Math.max(1, Math.ceil((end - start) * fps - 1e-6));
  // Never seek past the last decodable frame.
  const last = Math.max(0, safeDuration - 0.02);
  const times = Array.from({ length: count }, (_, i) => Math.min(last, start + i / fps));
  const srcW = Math.max(1, videoWidth);
  const srcH = Math.max(1, videoHeight);
  const width = Math.max(16, Math.min(Math.round(opts.width), srcW));
  const height = Math.max(16, Math.round((srcH * width) / srcW));
  return { width, height, times, delaysCs: frameDelaysCs(count, fps), start, end };
}

function abortError(): DOMException {
  return new DOMException('GIF export cancelled.', 'AbortError');
}

function waitFor(video: HTMLVideoElement, event: 'loadeddata' | 'seeked', timeoutMs: number, what: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener('error', fail);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error('This recording could not be decoded.'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Reading the recording timed out (${what}).`));
    }, timeoutMs);
    video.addEventListener(event, done);
    video.addEventListener('error', fail);
  });
}

async function seek(video: HTMLVideoElement, t: number): Promise<void> {
  const p = waitFor(video, 'seeked', 10000, `at ${t.toFixed(2)} s`);
  video.currentTime = t;
  await p;
}

/** A hidden video element for a blob (the caller must call `dispose`). */
export async function openVideo(blob: Blob): Promise<{ video: HTMLVideoElement; dispose: () => void }> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const dispose = () => {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  };
  try {
    const loaded = waitFor(video, 'loadeddata', 20000, 'opening');
    video.src = url;
    await loaded;
    return { video, dispose };
  } catch (err) {
    dispose();
    throw err;
  }
}

/** Draws the frame at `t` into a canvas (used for the dialog preview). */
export async function drawFrameAt(video: HTMLVideoElement, t: number, canvas: HTMLCanvasElement): Promise<void> {
  await seek(video, Math.max(0, Math.min(t, (video.duration || 0) - 0.02)));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
}

export async function exportGif(
  blob: Blob,
  opts: GifExportOptions,
  { onProgress, signal, durationHint }: { onProgress?: (p: GifProgress) => void; signal?: AbortSignal; durationHint?: number } = {},
): Promise<{ blob: Blob; plan: GifPlan; frames: number }> {
  if (signal?.aborted) throw abortError();
  onProgress?.({ phase: 'preparing', done: 0, total: 0 });
  const { video, dispose } = await openVideo(blob);
  const worker = new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' });

  // Replies arrive in order; each request waits for its own reply type.
  const waiters: { type: GifWorkerResponse['type']; resolve: (m: GifWorkerResponse) => void; reject: (e: unknown) => void }[] = [];
  let failure: unknown = null;
  const failAll = (err: unknown) => {
    failure ??= err;
    for (const w of waiters.splice(0)) w.reject(failure);
  };
  worker.onmessage = (e: MessageEvent<GifWorkerResponse>) => {
    const m = e.data;
    if (m.type === 'error') {
      failAll(new Error(m.message));
      return;
    }
    const i = waiters.findIndex((w) => w.type === m.type);
    if (i >= 0) waiters.splice(i, 1)[0].resolve(m);
  };
  worker.onerror = (e) => failAll(new Error(e.message || 'The GIF encoder stopped unexpectedly.'));
  const expect = (type: GifWorkerResponse['type']) => {
    const p = new Promise<GifWorkerResponse>((resolve, reject) => {
      if (failure) reject(failure);
      else waiters.push({ type, resolve, reject });
    });
    // Rejections are handled where awaited; this avoids "unhandled" noise for queued frames.
    p.catch(() => {});
    return p;
  };
  const send = (msg: GifWorkerRequest, transfer: Transferable[] = []) => worker.postMessage(msg, transfer);
  const onAbort = () => failAll(abortError());
  signal?.addEventListener('abort', onAbort);

  try {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : (durationHint ?? 0);
    const plan = planGif(duration, video.videoWidth, video.videoHeight, opts);
    const total = plan.times.length;

    const canvas = new OffscreenCanvas(plan.width, plan.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
    if (!ctx) throw new Error('Your browser could not create a drawing surface for the GIF.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Palette from up to 8 frames spread over the clip, at a small size.
    const sampleW = Math.min(200, plan.width);
    const sampleH = Math.max(1, Math.round((plan.height * sampleW) / plan.width));
    const sampleCanvas = new OffscreenCanvas(sampleW, sampleH);
    const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true, alpha: false })!;
    const picks = Math.min(8, total);
    const samples: ArrayBuffer[] = [];
    for (let k = 0; k < picks; k++) {
      if (signal?.aborted) throw abortError();
      const t = plan.times[Math.floor((k * (total - 1)) / Math.max(1, picks - 1))];
      await seek(video, t);
      sctx.drawImage(video, 0, 0, sampleW, sampleH);
      samples.push(sctx.getImageData(0, 0, sampleW, sampleH).data.buffer as ArrayBuffer);
    }
    const ready = expect('ready');
    send({ type: 'start', options: { width: plan.width, height: plan.height, repeat: opts.loop ? 0 : -1 }, samples }, samples);
    await ready;

    const inFlight: Promise<GifWorkerResponse>[] = [];
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw abortError();
      if (failure) throw failure;
      await seek(video, plan.times[i]);
      ctx.drawImage(video, 0, 0, plan.width, plan.height);
      const rgba = ctx.getImageData(0, 0, plan.width, plan.height).data.buffer as ArrayBuffer;
      inFlight.push(expect('frame-done'));
      send({ type: 'frame', seq: i, rgba, delayCs: plan.delaysCs[i] }, [rgba]);
      // Keep only a few frames queued so memory stays small on long clips.
      if (inFlight.length > 3) await inFlight.shift();
      onProgress?.({ phase: 'reading', done: i + 1, total });
    }
    await Promise.all(inFlight);
    onProgress?.({ phase: 'finishing', done: total, total });
    const done = expect('done');
    send({ type: 'finish' });
    const result = (await done) as Extract<GifWorkerResponse, { type: 'done' }>;
    return { blob: new Blob([result.bytes], { type: 'image/gif' }), plan, frames: result.frames };
  } finally {
    signal?.removeEventListener('abort', onAbort);
    worker.terminate();
    dispose();
  }
}
