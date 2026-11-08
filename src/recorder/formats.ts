/**
 * Choosing what MediaRecorder writes. Pure functions (the browser's
 * `MediaRecorder.isTypeSupported` is passed in) so they are unit-testable.
 *
 * "MP4" means H.264 video, the format every phone, Mac, PC and editing app
 * plays. AAC sound is used where Chrome can encode it (Windows, macOS);
 * elsewhere the MP4 carries Opus sound. When this browser cannot write H.264
 * at all, the recording falls back to WebM and the caller says so.
 */
import type { RecordingContainer, RecordingFps, RecordingQuality } from '../core/settings';

export interface MimeChoice {
  mimeType: string;
  container: RecordingContainer;
  /** True when the preferred container was not available. */
  fallback: boolean;
}

const MP4_VIDEO = ['avc1.640033', 'avc1.640028', 'avc1.42e01f', 'avc1'];
const MP4_AUDIO = ['mp4a.40.2', 'opus'];
const WEBM_VIDEO = ['vp9', 'vp8'];

function candidates(container: RecordingContainer, withAudio: boolean): string[] {
  const list: string[] = [];
  if (container === 'mp4') {
    for (const v of MP4_VIDEO) {
      if (withAudio) for (const a of MP4_AUDIO) list.push(`video/mp4;codecs=${v},${a}`);
      else list.push(`video/mp4;codecs=${v}`);
    }
  } else {
    for (const v of WEBM_VIDEO) list.push(withAudio ? `video/webm;codecs=${v},opus` : `video/webm;codecs=${v}`);
    list.push('video/webm');
  }
  return list;
}

export function chooseMimeType(preferred: RecordingContainer, withAudio: boolean, isSupported: (type: string) => boolean): MimeChoice | null {
  const order: RecordingContainer[] = preferred === 'mp4' ? ['mp4', 'webm'] : ['webm', 'mp4'];
  for (const container of order) {
    for (const mimeType of candidates(container, withAudio)) {
      let ok = false;
      try {
        ok = isSupported(mimeType);
      } catch {
        ok = false;
      }
      if (ok) return { mimeType, container, fallback: container !== preferred };
    }
  }
  return null;
}

export function containerOf(mimeType: string): RecordingContainer {
  return /^video\/mp4/i.test(mimeType) ? 'mp4' : 'webm';
}

/** The plain media type stored with a recording, e.g. "video/mp4". */
export function baseMimeType(mimeType: string): string {
  return containerOf(mimeType) === 'mp4' ? 'video/mp4' : 'video/webm';
}

/** Human-readable format, e.g. "MP4 · H.264 · AAC". */
export function describeMimeType(mimeType: string): string {
  const container = containerOf(mimeType).toUpperCase();
  const codecs = /codecs=([^;]+)/i.exec(mimeType)?.[1]?.split(',').map((c) => c.trim().toLowerCase()) ?? [];
  const names = codecs.map((c) =>
    c.startsWith('avc') ? 'H.264' : c.startsWith('vp9') || c.startsWith('vp09') ? 'VP9' : c.startsWith('vp8') ? 'VP8' : c.startsWith('av01') || c === 'av1' ? 'AV1' : c.startsWith('mp4a') ? 'AAC' : c === 'opus' ? 'Opus' : c,
  );
  return [container, ...names].join(' · ');
}

export const QUALITY_PRESETS: Record<RecordingQuality, { label: string; width: number; height: number }> = {
  '720p': { label: '720p HD', width: 1280, height: 720 },
  '1080p': { label: '1080p Full HD', width: 1920, height: 1080 },
  '1440p': { label: '1440p QHD', width: 2560, height: 1440 },
  '2160p': { label: '4K Ultra HD', width: 3840, height: 2160 },
};

/**
 * Video bitrate for screen content: about 0.1 bits per pixel per frame at
 * 30 fps (≈6 Mbit/s for 1080p30). Extra frames above 30 fps cost half as much,
 * because consecutive screen frames are very similar.
 */
export function videoBitsPerSecond(width: number, height: number, fps: RecordingFps | number): number {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const effectiveFps = fps <= 30 ? fps : 30 + (fps - 30) / 2;
  const bits = w * h * effectiveFps * 0.1;
  return Math.round(Math.min(25_000_000, Math.max(1_000_000, bits)));
}

export const AUDIO_BITS_PER_SECOND = 128_000;

/** H.264 needs even frame dimensions. */
export function evenSize(n: number): number {
  const r = Math.max(2, Math.round(n));
  return r % 2 === 0 ? r : r - 1;
}
