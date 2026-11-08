/**
 * Camera bubble: draws the shared screen with the camera in a round bubble on
 * top, producing a new video track for MediaRecorder.
 *
 * Frames are pulled with MediaStreamTrackProcessor and pushed with
 * MediaStreamTrackGenerator, so compositing is driven by arriving frames, not
 * by timers or requestAnimationFrame. That keeps it running at full speed
 * while the recorder tab is in the background, which it always is while the
 * user works in the tab they are recording.
 */
import type { CameraPosition, CameraSize } from '../core/settings';
import { evenSize } from './formats';

interface TrackProcessor {
  readable: ReadableStream<VideoFrame>;
}
interface TrackGenerator extends MediaStreamTrack {
  writable: WritableStream<VideoFrame>;
}
type ProcessorCtor = new (init: { track: MediaStreamTrack; maxBufferSize?: number }) => TrackProcessor;
type GeneratorCtor = new (init: { kind: 'video' }) => TrackGenerator;

function ctors(): { Processor: ProcessorCtor; Generator: GeneratorCtor } | null {
  const g = globalThis as unknown as { MediaStreamTrackProcessor?: ProcessorCtor; MediaStreamTrackGenerator?: GeneratorCtor; VideoFrame?: unknown };
  if (!g.MediaStreamTrackProcessor || !g.MediaStreamTrackGenerator || !g.VideoFrame || typeof OffscreenCanvas === 'undefined') return null;
  return { Processor: g.MediaStreamTrackProcessor, Generator: g.MediaStreamTrackGenerator };
}

export function supportsCameraOverlay(): boolean {
  return ctors() !== null;
}

export interface CameraLayout {
  position: CameraPosition;
  size: CameraSize;
}

/** Bubble diameter as a share of the frame's shorter side. */
export const BUBBLE_SCALE: Record<CameraSize, number> = { small: 0.2, medium: 0.28, large: 0.38 };

/** Where the bubble goes in a frame (also used by the setup preview). */
export function bubbleRect(width: number, height: number, layout: CameraLayout): { x: number; y: number; d: number } {
  const short = Math.min(width, height);
  const d = Math.round(short * BUBBLE_SCALE[layout.size]);
  const margin = Math.round(short * 0.035);
  const left = layout.position.endsWith('left');
  const top = layout.position.startsWith('top');
  return { x: left ? margin : width - margin - d, y: top ? margin : height - margin - d, d };
}

export interface VideoCompositor {
  track: MediaStreamTrack;
  /** A copy of the most recent output frame (for the poster image). */
  capture(): Promise<ImageBitmap | null>;
  setLayout(layout: CameraLayout): void;
  setPaused(paused: boolean): void;
  stop(): void;
}

type Ctx = OffscreenCanvasRenderingContext2D;

function drawFitted(ctx: Ctx, frame: VideoFrame, w: number, h: number): void {
  const fw = frame.displayWidth;
  const fh = frame.displayHeight;
  const s = Math.min(w / fw, h / fh);
  const dw = Math.round(fw * s);
  const dh = Math.round(fh * s);
  if (dw !== w || dh !== h) {
    // The shared surface changed shape (e.g. a resized window): letterbox it.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(frame, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
}

function drawBubble(ctx: Ctx, cam: VideoFrame, w: number, h: number, layout: CameraLayout): void {
  const { x, y, d } = bubbleRect(w, h, layout);
  const r = d / 2;
  const cx = x + r;
  const cy = y + r;
  // Soft shadow under the bubble.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = Math.max(4, d * 0.08);
  ctx.shadowOffsetY = Math.max(1, d * 0.02);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();
  ctx.restore();
  // Camera image: centre square, mirrored like a mirror (what people expect of a selfie view).
  const vw = cam.displayWidth;
  const vh = cam.displayHeight;
  const side = Math.min(vw, vh);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x + d, y);
  ctx.scale(-1, 1);
  ctx.drawImage(cam, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, d, d);
  ctx.restore();
  // Thin light ring.
  const ring = Math.max(2, d * 0.025);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - ring / 2, 0, Math.PI * 2);
  ctx.lineWidth = ring;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.stroke();
  ctx.restore();
}

async function pump(readable: ReadableStream<VideoFrame>, onFrame: (f: VideoFrame) => void, isStopped: () => boolean, onEnd?: () => void): Promise<void> {
  const reader = readable.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (isStopped()) {
        value.close();
        break;
      }
      onFrame(value);
    }
  } catch {
    // The source track ended.
  } finally {
    reader.releaseLock();
    onEnd?.();
  }
}

/**
 * Starts compositing `display` with `camera`. The output keeps the display's
 * first frame size for the whole recording (even dimensions, as H.264 needs).
 */
export function createCompositor(display: MediaStreamTrack, camera: MediaStreamTrack, opts: { fps: number; layout: CameraLayout }): VideoCompositor | null {
  const c = ctors();
  if (!c) return null;
  const generator = new c.Generator({ kind: 'video' });
  const writer = generator.writable.getWriter();
  const displayProc = new c.Processor({ track: display, maxBufferSize: 2 });
  const cameraProc = new c.Processor({ track: camera, maxBufferSize: 2 });

  let layout = opts.layout;
  let stopped = false;
  let paused = false;
  let latestDisplay: VideoFrame | null = null;
  let latestCamera: VideoFrame | null = null;
  let canvas: OffscreenCanvas | null = null;
  let ctx: Ctx | null = null;
  let lastOutput = 0;
  let lastTimestamp = 0;
  const minInterval = 1000 / Math.max(1, opts.fps) - 2;

  const render = () => {
    if (stopped || paused || !latestDisplay) return;
    const now = performance.now();
    if (now - lastOutput < minInterval) return;
    if (writer.desiredSize !== null && writer.desiredSize <= 0) return; // encoder busy: drop
    lastOutput = now;
    if (!canvas || !ctx) {
      canvas = new OffscreenCanvas(evenSize(latestDisplay.displayWidth), evenSize(latestDisplay.displayHeight));
      ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
    }
    drawFitted(ctx, latestDisplay, canvas.width, canvas.height);
    if (latestCamera) drawBubble(ctx, latestCamera, canvas.width, canvas.height, layout);
    // Our own monotonic clock: the two sources do not share a time base.
    const timestamp = Math.max(lastTimestamp + 1, Math.round(now * 1000));
    lastTimestamp = timestamp;
    const frame = new VideoFrame(canvas, { timestamp });
    writer.write(frame).then(
      () => frame.close(),
      () => frame.close(),
    );
  };

  void pump(
    displayProc.readable,
    (f) => {
      latestDisplay?.close();
      latestDisplay = f;
      render();
    },
    () => stopped,
  );
  // Camera frames also drive output, so the bubble keeps moving while the screen is still.
  void pump(
    cameraProc.readable,
    (f) => {
      latestCamera?.close();
      latestCamera = f;
      render();
    },
    () => stopped,
    () => {
      // Camera unplugged: drop the bubble rather than freeze its last frame.
      latestCamera?.close();
      latestCamera = null;
    },
  );

  return {
    track: generator,
    async capture() {
      return canvas && !stopped ? createImageBitmap(canvas) : null;
    },
    setLayout(next) {
      layout = next;
    },
    setPaused(p) {
      paused = p;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      latestDisplay?.close();
      latestCamera?.close();
      latestDisplay = null;
      latestCamera = null;
      void writer.close().catch(() => {});
      generator.stop();
    },
  };
}
