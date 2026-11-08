/**
 * Screen recorder engine. Runs in a Studio page, because screen capture
 * (getDisplayMedia) needs a page; it needs no extension permission.
 *
 *   Chrome's share picker ─▶ display stream ─┐
 *   camera (optional) ─────▶ compositor ─────┼─▶ MediaRecorder ─▶ ~1 s chunks ─▶ IndexedDB
 *   tab/system sound + mic ─▶ mixer ─────────┘
 *
 * Chunks are written to IndexedDB as they arrive, so a crash or a closed tab
 * loses only the last few seconds: the next time the recorder opens it offers
 * to recover the unfinished recording. Nothing is uploaded anywhere.
 *
 * The engine is a module-level singleton so a recording survives navigating
 * between Studio screens. Other contexts (popup, service worker) see it via
 * ./channel.
 */
import { defaultItemName } from '../core/filename';
import { recordReviewSuccess } from '../core/review';
import { newId } from '../core/format';
import type { RecorderSettings } from '../core/settings';
import type { DisplaySurfaceKind, LibraryItem } from '../core/types';
import {
  appendRecordingChunk,
  createRecordingSession,
  discardRecordingSession,
  finalizeRecording,
  getRecordingChunks,
  listRecordingSessions,
  replaceRecordingChunk,
  updateRecordingSession,
  type RecordingSessionRecord,
} from '../db/db';
import { makeThumbnail } from '../imaging/image-io';
import { isActivePhase, RECORDER_CHANNEL, RECORDER_STATE_KEY, type RecorderCommand, type RecorderMessage, type RecorderPublicState } from './channel';
import { createCompositor, type VideoCompositor } from './compositor';
import { AUDIO_BITS_PER_SECOND, baseMimeType, chooseMimeType, containerOf, QUALITY_PRESETS, videoBitsPerSecond } from './formats';
import { AudioMixer } from './mixer';
import { fixWebmDuration } from './webm';

const TIMESLICE_MS = 1000;
/**
 * A key frame every 2 s. Chrome's MP4 writer only hands over data at key
 * frames, and by default those are so rare that an MP4 would stay in memory
 * until the recording stops. Regular key frames keep chunks flowing to disk
 * (so a crash loses only the last few seconds) and make seeking fast.
 */
const KEYFRAME_INTERVAL_MS = 2000;
const HEARTBEAT_MS = 4000;
/** A session whose heartbeat is older than this belongs to no live page. */
export const STALE_SESSION_MS = 15000;

export type RecorderErrorCode = 'cancelled' | 'permission' | 'not-found' | 'busy' | 'unsupported' | 'storage' | 'unknown';

export class RecorderError extends Error {
  constructor(
    message: string,
    readonly code: RecorderErrorCode,
  ) {
    super(message);
    this.name = 'RecorderError';
  }
}

export interface RecorderSnapshot extends RecorderPublicState {
  /** Why the last attempt failed or ended (shown to the user). */
  error?: string;
  errorCode?: RecorderErrorCode;
  warnings: string[];
  /** Library id of the saved recording. */
  itemId?: string;
  /** Live view of what is being recorded. */
  preview?: MediaStream;
  bytes: number;
  width?: number;
  height?: number;
  mimeType?: string;
  surface?: DisplaySurfaceKind;
  hasSystemAudio: boolean;
  hasCamera: boolean;
  /** A finished recording that could not be stored, offered as a direct download. */
  unsaved?: Blob;
}

interface Session {
  id: string;
  opts: RecorderSettings;
  display: MediaStream;
  displayTrack: MediaStreamTrack;
  videoTrack: MediaStreamTrack;
  mic: MediaStream | null;
  micTrack: MediaStreamTrack | null;
  camera: MediaStream | null;
  compositor: VideoCompositor | null;
  mixer: AudioMixer | null;
  recorder: MediaRecorder;
  mimeType: string;
  chunks: Blob[];
  seq: number;
  bytes: number;
  writes: Promise<void>;
  writeError: unknown;
  activeMs: number;
  since: number | null;
  startedAt: number;
  heartbeat?: ReturnType<typeof setInterval>;
  thumb?: Blob;
  width: number;
  height: number;
  label?: string;
  surface?: DisplaySurfaceKind;
  hasAudio: boolean;
  warnings: string[];
  finishing: Promise<void> | null;
  discarded: boolean;
}

function idleSnapshot(): RecorderSnapshot {
  return { phase: 'idle', activeMs: 0, hasMic: false, micMuted: false, updatedAt: Date.now(), warnings: [], bytes: 0, hasSystemAudio: false, hasCamera: false };
}

let snapshot: RecorderSnapshot = idleSnapshot();
let session: Session | null = null;
const listeners = new Set<() => void>();

export function getRecorderSnapshot(): RecorderSnapshot {
  return snapshot;
}

export function subscribeRecorder(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(patch: Partial<RecorderSnapshot>): void {
  snapshot = { ...snapshot, ...patch, updatedAt: Date.now() };
  for (const l of listeners) l();
  publish();
}

// ── Publishing state to the popup / service worker ──────────────────────

let lastPublished = '';

function publicState(): RecorderPublicState {
  const { phase, sessionId, countdown, activeMs, since, hasMic, micMuted, updatedAt } = snapshot;
  return { phase, sessionId, countdown, activeMs, since, hasMic, micMuted, updatedAt };
}

function publish(): void {
  const state = publicState();
  const key = JSON.stringify({ ...state, updatedAt: 0 });
  if (key === lastPublished) return;
  lastPublished = key;
  try {
    if (isActivePhase(state.phase)) void chrome.storage.session.set({ [RECORDER_STATE_KEY]: state }).catch(() => {});
    else void chrome.storage.session.remove(RECORDER_STATE_KEY).catch(() => {});
  } catch {
    // Not running as an extension page (unit tests).
  }
  channel?.postMessage({ type: 'state', state } satisfies RecorderMessage);
}

let channel: BroadcastChannel | null = null;

function ensureChannel(): void {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(RECORDER_CHANNEL);
  channel.onmessage = (e: MessageEvent<RecorderMessage>) => {
    const msg = e.data;
    // Only the page that owns a live recording answers.
    if (!session || !isActivePhase(snapshot.phase) || !msg) return;
    if (msg.type === 'ping') channel?.postMessage({ type: 'pong', nonce: msg.nonce, state: publicState() } satisfies RecorderMessage);
    else if (msg.type === 'command') handleCommand(msg.command);
  };
}

function handleCommand(command: RecorderCommand): void {
  switch (command) {
    case 'pause':
      pauseRecording();
      break;
    case 'resume':
      resumeRecording();
      break;
    case 'stop':
      void stopRecording();
      break;
    case 'discard':
      void discardRecording();
      break;
    case 'toggle-mic':
      setMicMuted(!snapshot.micMuted);
      break;
    case 'focus':
      focusThisTab();
      break;
  }
}

if (typeof window !== 'undefined') {
  ensureChannel();
  // Leaving the page would end the recording: ask first.
  window.addEventListener('beforeunload', (e) => {
    if (isActivePhase(snapshot.phase)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('pagehide', () => {
    // Chunks already written stay recoverable; clear the "recording" badge.
    if (session) {
      try {
        void chrome.storage.session.remove(RECORDER_STATE_KEY);
      } catch {
        /* ignore */
      }
    }
  });
}

/** Brings the tab running the recorder to the front (after a recording ends). */
export function focusThisTab(): void {
  try {
    chrome.tabs.getCurrent((tab) => {
      if (!tab?.id) return;
      void chrome.tabs.update(tab.id, { active: true }).catch(() => {});
      if (tab.windowId !== undefined) void chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    });
  } catch {
    /* not in a tab */
  }
}

// ── Devices ──────────────────────────────────────────────────────────────

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function deviceError(err: unknown, what: 'microphone' | 'camera'): RecorderError {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new RecorderError(`${cap(what)} access is blocked. Allow it in Chrome’s site settings for FrameShot, or turn the ${what} off.`, 'permission');
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return new RecorderError(`No ${what} was found. Connect one, or turn the ${what} off.`, 'not-found');
  if (name === 'NotReadableError' || name === 'AbortError') return new RecorderError(`The ${what} is in use by another app or could not be started.`, 'busy');
  return new RecorderError(`The ${what} could not be started (${(err as Error)?.message ?? String(err)}).`, 'unknown');
}

async function withDevice(constraints: (deviceId: string | undefined) => MediaStreamConstraints, deviceId: string, what: 'microphone' | 'camera'): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints(deviceId || undefined));
  } catch (err) {
    // A remembered device that is no longer connected: fall back to the default one.
    if (deviceId && ((err as { name?: string })?.name === 'OverconstrainedError' || (err as { name?: string })?.name === 'NotFoundError')) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints(undefined));
      } catch (err2) {
        throw deviceError(err2, what);
      }
    }
    throw deviceError(err, what);
  }
}

export function openMicrophone(deviceId: string): Promise<MediaStream> {
  return withDevice(
    (id) => ({ audio: { deviceId: id ? { exact: id } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }),
    deviceId,
    'microphone',
  );
}

export function openCamera(deviceId: string): Promise<MediaStream> {
  return withDevice(
    (id) => ({ video: { deviceId: id ? { exact: id } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } }),
    deviceId,
    'camera',
  );
}

function displayError(err: unknown): RecorderError {
  const name = (err as { name?: string })?.name;
  const message = (err as Error)?.message ?? String(err);
  if (name === 'NotAllowedError') {
    if (/system/i.test(message)) {
      return new RecorderError(
        'Your computer blocked screen recording for Chrome. On macOS, allow Chrome in System Settings › Privacy & Security › Screen & System Audio Recording, then restart Chrome.',
        'permission',
      );
    }
    return new RecorderError('Nothing was shared, so recording did not start.', 'cancelled');
  }
  if (name === 'InvalidStateError') return new RecorderError('Click “Start recording” again to choose what to share.', 'cancelled');
  if (name === 'NotFoundError') return new RecorderError('Chrome found nothing to record.', 'not-found');
  if (name === 'NotReadableError' || name === 'AbortError') {
    return new RecorderError('Chrome could not start screen capture. Close other apps that are capturing the screen and try again.', 'busy');
  }
  return new RecorderError(`Screen capture failed: ${message}`, 'unknown');
}

async function openDisplay(opts: RecorderSettings): Promise<MediaStream> {
  const preset = QUALITY_PRESETS[opts.quality];
  const options = {
    video: {
      displaySurface: opts.surface,
      frameRate: { ideal: opts.fps, max: opts.fps },
      width: { max: preset.width },
      height: { max: preset.height },
    },
    audio: opts.systemAudio ? { suppressLocalAudioPlayback: false } : false,
    // Never offer the recorder's own tab (it would record itself).
    selfBrowserSurface: 'exclude',
    // Lets the user switch to another tab mid-recording from Chrome's bar.
    surfaceSwitching: 'include',
    systemAudio: opts.systemAudio ? 'include' : 'exclude',
    monitorTypeSurfaces: 'include',
    preferCurrentTab: false,
  } as DisplayMediaStreamOptions;
  try {
    return await navigator.mediaDevices.getDisplayMedia(options);
  } catch (err) {
    if ((err as { name?: string })?.name === 'TypeError') {
      // An older Chrome that rejects one of the hints: ask with the basics.
      try {
        return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: opts.systemAudio });
      } catch (err2) {
        throw displayError(err2);
      }
    }
    throw displayError(err);
  }
}

/** Track labels for screens/windows are internal ids; a tab's label can be its title. */
function cleanLabel(label: string): string | undefined {
  const l = label.trim();
  if (!l || /^(screen|window|web-contents-media-stream):/i.test(l) || /^[\w-]+:\d+(:\d+)?$/.test(l)) return undefined;
  return l.slice(0, 120);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Recording ───────────────────────────────────────────────────────────

function currentActiveMs(s: Session): number {
  return s.activeMs + (s.since ? Date.now() - s.since : 0);
}

function warn(s: Session, message: string): void {
  if (s.warnings.includes(message)) return;
  s.warnings.push(message);
  update({ warnings: [...s.warnings] });
}

export interface RecordingHandoff {
  /** Live camera/mic streams from the setup preview; the recorder takes them over. */
  camera?: MediaStream | null;
  mic?: MediaStream | null;
}

/**
 * Starts a recording. Must be called from a click handler: the sound mixer
 * and Chrome's share picker both need the user's gesture.
 */
export async function startRecording(opts: RecorderSettings, handoff: RecordingHandoff = {}): Promise<void> {
  if (session || snapshot.phase === 'acquiring') throw new RecorderError('A recording is already in progress.', 'busy');
  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    throw new RecorderError('This browser cannot record the screen.', 'unsupported');
  }
  // Created synchronously, inside the user's gesture, so it is allowed to run.
  let audioCtx: AudioContext | null = opts.systemAudio || opts.mic ? new AudioContext() : null;
  const live = (s: MediaStream | null | undefined) => (s && s.getTracks().some((t) => t.readyState === 'live') ? s : null);
  let mic = live(handoff.mic);
  let camera = live(handoff.camera);
  let display: MediaStream | null = null;
  update({ ...idleSnapshot(), phase: 'acquiring' });

  const releaseAll = () => {
    display?.getTracks().forEach((t) => t.stop());
    mic?.getTracks().forEach((t) => t.stop());
    camera?.getTracks().forEach((t) => t.stop());
    void audioCtx?.close().catch(() => {});
    audioCtx = null;
  };

  try {
    // The picker first, while the click still counts as a user gesture.
    display = await openDisplay(opts);
    if (opts.mic && !mic) mic = await openMicrophone(opts.micDeviceId);
    if (opts.camera && !camera) camera = await openCamera(opts.cameraDeviceId);
  } catch (err) {
    const e = err instanceof RecorderError ? err : displayError(err);
    // Streams handed over by the setup preview are stopped too; the page reopens its preview.
    releaseAll();
    update({ ...idleSnapshot(), error: e.code === 'cancelled' ? undefined : e.message, errorCode: e.code });
    throw e;
  }

  const warnings: string[] = [];
  const displayTrack = display.getVideoTracks()[0];
  const settings = displayTrack.getSettings();
  const surface = (settings.displaySurface as DisplaySurfaceKind | undefined) ?? undefined;
  const label = surface === 'browser' ? cleanLabel(displayTrack.label) : undefined;
  const preset = QUALITY_PRESETS[opts.quality];
  let width = settings.width ?? preset.width;
  let height = settings.height ?? preset.height;

  // Video: the shared surface, or the surface with the camera bubble on top.
  let videoTrack = displayTrack;
  let compositor: VideoCompositor | null = null;
  const cameraTrack = camera?.getVideoTracks()[0] ?? null;
  if (cameraTrack) {
    compositor = createCompositor(displayTrack, cameraTrack, { fps: opts.fps, layout: { position: opts.cameraPosition, size: opts.cameraSize } });
    if (compositor) videoTrack = compositor.track;
    else {
      warnings.push('This version of Chrome cannot add the camera bubble, so only the screen was recorded.');
      camera?.getTracks().forEach((t) => t.stop());
      camera = null;
    }
  }

  // Sound: tab/system audio and the microphone, mixed into one track.
  const displayAudio = opts.systemAudio ? (display.getAudioTracks()[0] ?? null) : null;
  if (opts.systemAudio && !displayAudio) {
    warnings.push(
      surface === 'browser'
        ? 'The tab was shared without its sound. To include it, keep “Also share tab audio” switched on in Chrome’s picker.'
        : 'This window or screen was shared without sound. Chrome records sound from tabs (and from the whole screen on Windows and ChromeOS).',
    );
  }
  const micTrack = mic?.getAudioTracks()[0] ?? null;
  const sources: { track: MediaStreamTrack; kind: 'system' | 'mic' }[] = [];
  if (displayAudio) sources.push({ track: displayAudio, kind: 'system' });
  if (micTrack) sources.push({ track: micTrack, kind: 'mic' });
  let audioTrack: MediaStreamTrack | null = null;
  let mixer: AudioMixer | null = null;
  if (sources.length && audioCtx) {
    if (audioCtx.state !== 'running') await withTimeout(audioCtx.resume(), 600).catch(() => {});
    if (audioCtx.state === 'running') {
      mixer = new AudioMixer(audioCtx);
      for (const s of sources) mixer.add(s.track, s.kind);
      audioTrack = mixer.track;
    }
  }
  if (!mixer) {
    void audioCtx?.close().catch(() => {});
    if (sources.length) {
      audioTrack = sources.find((s) => s.kind === 'mic')?.track ?? sources[0].track;
      if (sources.length > 1) warnings.push('Only the microphone could be recorded: Chrome did not allow mixing it with the tab sound.');
    }
  }

  const choice = chooseMimeType(opts.format, !!audioTrack, (t) => MediaRecorder.isTypeSupported(t));
  if (!choice) {
    display.getTracks().forEach((t) => t.stop());
    mic?.getTracks().forEach((t) => t.stop());
    camera?.getTracks().forEach((t) => t.stop());
    compositor?.stop();
    void mixer?.close();
    const e = new RecorderError('This browser cannot record video.', 'unsupported');
    update({ ...idleSnapshot(), error: e.message, errorCode: e.code });
    throw e;
  }
  if (choice.fallback) {
    warnings.push(
      opts.format === 'mp4'
        ? 'This browser cannot write MP4 (H.264) video, so the recording is saved as WebM.'
        : 'This browser cannot write WebM video, so the recording is saved as MP4.',
    );
  }

  const stream = new MediaStream(audioTrack ? [videoTrack, audioTrack] : [videoTrack]);
  const recorder = new MediaRecorder(stream, {
    mimeType: choice.mimeType,
    videoBitsPerSecond: videoBitsPerSecond(width, height, opts.fps),
    audioBitsPerSecond: audioTrack ? AUDIO_BITS_PER_SECOND : undefined,
    // Ignored by Chrome versions that do not support it.
    videoKeyFrameIntervalDuration: KEYFRAME_INTERVAL_MS,
  } as MediaRecorderOptions);

  const now = Date.now();
  const s: Session = {
    id: newId(),
    opts,
    display,
    displayTrack,
    videoTrack,
    mic,
    micTrack,
    camera,
    compositor,
    mixer,
    recorder,
    mimeType: choice.mimeType,
    chunks: [],
    seq: 0,
    bytes: 0,
    writes: Promise.resolve(),
    writeError: null,
    activeMs: 0,
    since: null,
    startedAt: now,
    width,
    height,
    label,
    surface,
    hasAudio: !!audioTrack,
    warnings,
    finishing: null,
    discarded: false,
  };
  session = s;

  try {
    await createRecordingSession({
      id: s.id,
      startedAt: now,
      updatedAt: now,
      mimeType: choice.mimeType,
      durationMs: 0,
      bytes: 0,
      chunks: 0,
      width,
      height,
      hasAudio: s.hasAudio,
      surface,
      label,
      warnings: [...warnings],
    });
  } catch (err) {
    session = null;
    display.getTracks().forEach((t) => t.stop());
    mic?.getTracks().forEach((t) => t.stop());
    camera?.getTracks().forEach((t) => t.stop());
    compositor?.stop();
    void mixer?.close();
    const e = new RecorderError(err instanceof Error ? err.message : 'The recording could not be stored.', 'storage');
    update({ ...idleSnapshot(), error: e.message, errorCode: e.code });
    throw e;
  }

  recorder.ondataavailable = (e) => {
    if (!e.data || e.data.size === 0 || s.discarded) return;
    const seq = s.seq++;
    const chunk = e.data;
    s.chunks.push(chunk);
    s.bytes += chunk.size;
    update({ bytes: s.bytes });
    s.writes = s.writes
      .then(() => appendRecordingChunk(s.id, seq, chunk, { durationMs: currentActiveMs(s), bytes: s.bytes, chunks: s.seq }))
      .catch((err: unknown) => {
        if (!s.writeError) {
          s.writeError = err;
          warn(s, 'Part of the recording could not be stored in the library (browser storage may be full). You can still download it when you stop.');
        }
      });
  };
  recorder.onerror = () => {
    warn(s, 'Recording stopped early because the video encoder failed.');
    void finish();
  };
  // "Stop sharing" in Chrome's bar (or the shared window closing) ends the recording.
  displayTrack.addEventListener('ended', () => void finish());
  micTrack?.addEventListener('ended', () => warn(s, 'The microphone was disconnected; the rest of the recording has no microphone sound.'));
  cameraTrack?.addEventListener('ended', () => warn(s, 'The camera was disconnected.'));

  s.heartbeat = setInterval(() => {
    void updateRecordingSession(s.id, { durationMs: currentActiveMs(s) }).catch(() => {});
  }, HEARTBEAT_MS);

  const preview = new MediaStream([videoTrack]);
  update({
    phase: opts.countdown > 0 ? 'countdown' : 'recording',
    sessionId: s.id,
    countdown: opts.countdown > 0 ? opts.countdown : undefined,
    activeMs: 0,
    since: undefined,
    hasMic: !!micTrack,
    micMuted: false,
    hasSystemAudio: !!displayAudio,
    hasCamera: !!compositor,
    preview,
    // Shown once real frames arrive (track settings can report the requested size).
    width: undefined,
    height: undefined,
    mimeType: choice.mimeType,
    surface,
    warnings: [...warnings],
    error: undefined,
    errorCode: undefined,
  });

  // Countdown (shown on the toolbar badge and in the recorder page).
  for (let left = opts.countdown; left > 0; left--) {
    if (s.finishing || s.discarded) return;
    update({ countdown: left });
    await sleep(1000);
  }
  if (s.finishing || s.discarded) return;

  recorder.start(TIMESLICE_MS);
  s.mimeType = recorder.mimeType || choice.mimeType;
  s.since = Date.now();
  update({ phase: 'recording', countdown: undefined, since: s.since, mimeType: s.mimeType });
  void updateRecordingSession(s.id, { mimeType: s.mimeType }).catch(() => {});

  // Poster frame for the library card, taken once something is on screen.
  setTimeout(() => {
    void grabPoster(s).then(() => {
      if (s.thumb) void updateRecordingSession(s.id, { thumb: s.thumb, width: s.width, height: s.height }).catch(() => {});
    });
  }, 900);
}

async function grabPoster(s: Session): Promise<void> {
  if (s.thumb) return;
  let bitmap: ImageBitmap | null = null;
  if (s.compositor) bitmap = await s.compositor.capture().catch(() => null);
  if (!bitmap) bitmap = await grabFrame(s.displayTrack).catch(() => null);
  if (!bitmap) return;
  try {
    // The real frame size (the picker may have scaled the surface to the quality limit).
    s.width = bitmap.width;
    s.height = bitmap.height;
    s.thumb = await makeThumbnail(bitmap, { maxWidth: 640, maxHeight: 640 });
    update({ width: s.width, height: s.height });
  } finally {
    bitmap.close();
  }
}

function grabFrame(track: MediaStreamTrack): Promise<ImageBitmap> {
  const IC = (globalThis as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { grabFrame(): Promise<ImageBitmap> } }).ImageCapture;
  if (!IC || track.readyState !== 'live') return Promise.reject(new Error('no frame'));
  return withTimeout(new IC(track).grabFrame(), 2500);
}

export function pauseRecording(): void {
  const s = session;
  if (!s || snapshot.phase !== 'recording' || s.recorder.state !== 'recording') return;
  s.recorder.pause();
  s.activeMs += Date.now() - (s.since ?? Date.now());
  s.since = null;
  s.compositor?.setPaused(true);
  update({ phase: 'paused', activeMs: s.activeMs, since: undefined });
}

export function resumeRecording(): void {
  const s = session;
  if (!s || snapshot.phase !== 'paused' || s.recorder.state !== 'paused') return;
  s.recorder.resume();
  s.since = Date.now();
  s.compositor?.setPaused(false);
  update({ phase: 'recording', since: s.since });
}

export function setMicMuted(muted: boolean): void {
  const s = session;
  if (!s || !s.micTrack) return;
  if (s.mixer) s.mixer.setMicMuted(muted);
  else s.micTrack.enabled = !muted;
  update({ micMuted: muted });
}

export function setCameraLayout(layout: { position: RecorderSettings['cameraPosition']; size: RecorderSettings['cameraSize'] }): void {
  session?.compositor?.setLayout(layout);
}

/** Stops and saves the recording to the library. */
export function stopRecording(): Promise<void> {
  return finish();
}

/** Stops and throws the recording away. */
export function discardRecording(): Promise<void> {
  if (!session) return Promise.resolve();
  session.discarded = true;
  return finish();
}

/** Returns to the idle state after a finished, failed or cancelled recording. */
export function resetRecorder(): void {
  if (session) return;
  update(idleSnapshot());
}

function stopRecorder(recorder: MediaRecorder): Promise<void> {
  return new Promise((resolve) => {
    if (recorder.state === 'inactive') {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, 8000);
    recorder.addEventListener(
      'stop',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    try {
      recorder.stop();
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

function releaseMedia(s: Session): void {
  s.compositor?.stop();
  s.display.getTracks().forEach((t) => t.stop());
  s.mic?.getTracks().forEach((t) => t.stop());
  s.camera?.getTracks().forEach((t) => t.stop());
  void s.mixer?.close();
}

function finish(): Promise<void> {
  const s = session;
  if (!s) return Promise.resolve();
  if (s.finishing) return s.finishing;
  s.finishing = (async () => {
    clearInterval(s.heartbeat);
    const started = s.recorder.state !== 'inactive';
    if (s.since) {
      s.activeMs += Date.now() - s.since;
      s.since = null;
    }
    update({ phase: 'stopping', activeMs: s.activeMs, since: undefined, countdown: undefined });
    if (started && !s.thumb && !s.discarded) await grabPoster(s).catch(() => {});
    await stopRecorder(s.recorder);
    releaseMedia(s);
    await s.writes;

    if (s.discarded || s.seq === 0) {
      await discardRecordingSession(s.id).catch(() => {});
      session = null;
      update({ ...idleSnapshot(), warnings: [], error: !s.discarded && started ? 'Nothing was recorded.' : undefined });
      return;
    }

    update({ phase: 'saving', preview: undefined });
    try {
      const item = await saveSession(s);
      session = null;
      update({ phase: 'done', itemId: item.id, activeMs: item.durationMs ?? s.activeMs, warnings: [...item.warnings], preview: undefined });
      focusThisTab();
    } catch (err) {
      session = null;
      update({
        phase: 'error',
        error: `The recording could not be saved to the library: ${err instanceof Error ? err.message : String(err)} You can still download it.`,
        errorCode: 'storage',
        unsaved: new Blob(s.chunks, { type: baseMimeType(s.mimeType) }),
        preview: undefined,
      });
      focusThisTab();
    }
  })();
  return s.finishing;
}

/** Adds the missing Duration to a WebM recording's first chunk. */
async function repairedFirstChunk(first: Blob, mimeType: string, durationMs: number): Promise<Blob | null> {
  if (containerOf(mimeType) !== 'webm') return null;
  const head = new Uint8Array(await first.arrayBuffer());
  const fixed = fixWebmDuration(head, durationMs);
  return fixed ? new Blob([fixed as Uint8Array<ArrayBuffer>], { type: first.type }) : null;
}

function recordingItem(rec: {
  id: string;
  startedAt: number;
  label?: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  durationMs: number;
  hasAudio: boolean;
  surface?: DisplaySurfaceKind;
  warnings: string[];
}): LibraryItem {
  const now = Date.now();
  return {
    id: rec.id,
    name: defaultItemName({ title: rec.label || 'Screen recording', date: new Date(rec.startedAt) }),
    createdAt: rec.startedAt,
    updatedAt: now,
    kind: 'recording',
    source: rec.label ? { url: '', title: rec.label, domain: '' } : undefined,
    width: rec.width,
    height: rec.height,
    byteSize: rec.bytes,
    mimeType: rec.mimeType,
    favorite: false,
    collectionId: null,
    tags: [],
    hasEdits: false,
    warnings: rec.warnings,
    durationMs: Math.max(0, Math.round(rec.durationMs)),
    hasAudio: rec.hasAudio,
    surface: rec.surface,
  };
}

async function saveSession(s: Session): Promise<LibraryItem> {
  if (s.writeError) throw s.writeError instanceof Error ? s.writeError : new Error(String(s.writeError));
  const durationMs = Math.round(s.activeMs);
  const fixed = await repairedFirstChunk(s.chunks[0], s.mimeType, durationMs).catch(() => null);
  if (fixed) {
    s.chunks[0] = fixed;
    await replaceRecordingChunk(s.id, 0, fixed);
  }
  const bytes = s.chunks.reduce((n, c) => n + c.size, 0);
  const thumb = s.thumb ?? (await posterFromVideo(new Blob(s.chunks, { type: baseMimeType(s.mimeType) })).catch(() => undefined));
  const item = recordingItem({ ...s, bytes, durationMs });
  await finalizeRecording(item, thumb);
  await recordReviewSuccess().catch(() => {});
  return item;
}

/** Decodes one frame of a video file (used when no live frame could be grabbed). */
export async function posterFromVideo(blob: Blob, at = 0.4): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    video.src = url;
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('This video could not be decoded.'));
      }),
      6000,
    );
    if (Number.isFinite(video.duration) && video.duration > at) {
      video.currentTime = at;
      await withTimeout(new Promise<void>((resolve) => (video.onseeked = () => resolve())), 4000).catch(() => {});
    }
    const canvas = new OffscreenCanvas(Math.max(2, video.videoWidth), Math.max(2, video.videoHeight));
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await makeThumbnail(canvas, { maxWidth: 640, maxHeight: 640 });
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

// ── Recovery of interrupted recordings ─────────────────────────────────

/** Unfinished recordings that no open page is still writing. */
export async function findRecoverableSessions(): Promise<RecordingSessionRecord[]> {
  const all = await listRecordingSessions().catch(() => [] as RecordingSessionRecord[]);
  const now = Date.now();
  return all.filter((r) => r.id !== session?.id && now - r.updatedAt > STALE_SESSION_MS).sort((a, b) => b.startedAt - a.startedAt);
}

export async function recoverSession(rec: RecordingSessionRecord): Promise<LibraryItem> {
  const chunks = await getRecordingChunks(rec.id);
  if (chunks.length === 0) {
    await discardRecordingSession(rec.id);
    throw new Error('This recording has no data left to recover.');
  }
  const durationMs = rec.durationMs > 0 ? rec.durationMs : chunks.length * TIMESLICE_MS;
  const fixed = await repairedFirstChunk(chunks[0], rec.mimeType, durationMs).catch(() => null);
  if (fixed) {
    chunks[0] = fixed;
    await replaceRecordingChunk(rec.id, 0, fixed);
  }
  const blob = new Blob(chunks, { type: baseMimeType(rec.mimeType) });
  const thumb = rec.thumb ?? (await posterFromVideo(blob).catch(() => undefined));
  const item = recordingItem({
    ...rec,
    bytes: blob.size,
    durationMs,
    warnings: [...rec.warnings, 'Recovered after the recorder closed unexpectedly. The last few seconds may be missing.'],
  });
  await finalizeRecording(item, thumb);
  return item;
}

export { discardRecordingSession };

// ── Test hook (E2E builds only; removed from production by a compile-time flag) ──
if (__FRAMESHOT_E2E__ && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__frameshotRecorder = {
    snapshot: () => {
      const { preview, unsaved, ...rest } = snapshot;
      return { ...rest, hasPreview: !!preview, hasUnsaved: !!unsaved };
    },
    // Simulates Chrome's "Stop sharing" button.
    endShare: () => session?.displayTrack.dispatchEvent(new Event('ended')),
    chunks: () => session?.seq ?? 0,
    stop: () => stopRecording(),
  };
}
