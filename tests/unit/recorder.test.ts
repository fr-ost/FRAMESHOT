import { beforeEach, describe, expect, it } from 'vitest';
import { buildFilename } from '../../src/core/filename';
import { formatDuration } from '../../src/core/format';
import { DEFAULT_SETTINGS, mergeSettings, sanitizeSettings } from '../../src/core/settings';
import { isLibraryRoute, isRecorderRoute } from '../../src/core/studio-channel';
import type { LibraryItem } from '../../src/core/types';
import {
  addItem,
  appendRecordingChunk,
  clearAllData,
  createRecordingSession,
  deleteItems,
  discardRecordingSession,
  finalizeRecording,
  getItem,
  getRecordingBlob,
  getRecordingChunks,
  getRecordingSession,
  getThumb,
  listItems,
  listRecordingSessions,
  replaceRecordingChunk,
  storageStats,
  type RecordingSessionRecord,
} from '../../src/db/db';
import { filterItems } from '../../src/library/useLibrary';
import { elapsedMs, isActivePhase, recorderBadge, type RecorderPublicState } from '../../src/recorder/channel';
import { bubbleRect } from '../../src/recorder/compositor';
import { baseMimeType, chooseMimeType, containerOf, describeMimeType, evenSize, videoBitsPerSecond } from '../../src/recorder/formats';
import { encodeSize, fixWebmDuration, readWebmDuration } from '../../src/recorder/webm';

// ── EBML builders for synthetic WebM headers ──
function vint(value: number, length?: number): number[] {
  const len = length ?? (value < 127 ? 1 : value < 16383 ? 2 : value < 2097151 ? 3 : 4);
  return [...encodeSize(value, len)!];
}
const UNKNOWN_SIZE = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
function el(id: number[], data: number[], sizeLength?: number): number[] {
  return [...id, ...vint(data.length, sizeLength), ...data];
}
function float64(v: number): number[] {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, v, false);
  return [...b];
}
function float32(v: number): number[] {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setFloat32(0, v, false);
  return [...b];
}
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const EBML_HEADER = el([0x1a, 0x45, 0xdf, 0xa3], [...el([0x42, 0x82], ascii('webm'))]);
const TIMECODE_SCALE = el([0x2a, 0xd7, 0xb1], [0x0f, 0x42, 0x40]); // 1,000,000
const MUXING_APP = el([0x4d, 0x80], ascii('Chrome'));
const TRACKS = el([0x16, 0x54, 0xae, 0x6b], [...el([0xae], [0xd7, 0x81, 0x01])]);
const CLUSTER = el([0x1f, 0x43, 0xb6, 0x75], [0xe7, 0x81, 0x00, 0xa3, 0x84, 1, 2, 3, 4]);

function webm(info: number[], opts: { segmentSize?: 'unknown' | 'known'; seekHead?: boolean; infoSizeLength?: number } = {}): Uint8Array {
  const children = [
    ...(opts.seekHead ? el([0x11, 0x4d, 0x9b, 0x74], [0x4d, 0xbb, 0x80]) : []),
    ...el([0x15, 0x49, 0xa9, 0x66], info, opts.infoSizeLength),
    ...TRACKS,
    ...CLUSTER,
  ];
  const segment = opts.segmentSize === 'known' ? [0x18, 0x53, 0x80, 0x67, ...vint(children.length, 4), ...children] : [0x18, 0x53, 0x80, 0x67, ...UNKNOWN_SIZE, ...children];
  return new Uint8Array([...EBML_HEADER, ...segment]);
}

describe('WebM duration repair', () => {
  it('adds a Duration to a live MediaRecorder-style header and keeps everything else', () => {
    const head = webm([...TIMECODE_SCALE, ...MUXING_APP]);
    expect(readWebmDuration(head)).toBeNull();
    const fixed = fixWebmDuration(head, 4321.5)!;
    expect(fixed).not.toBeNull();
    expect(readWebmDuration(fixed)).toBeCloseTo(4321.5, 6);
    expect(fixed.length).toBe(head.length + 11);
    // Tracks and the first cluster are byte-identical after the insertion.
    const tail = [...TRACKS, ...CLUSTER];
    expect([...fixed.subarray(fixed.length - tail.length)]).toEqual(tail);
    // The unknown Segment size is untouched.
    const segAt = EBML_HEADER.length;
    expect([...fixed.subarray(segAt + 4, segAt + 12)]).toEqual(UNKNOWN_SIZE);
  });

  it('honours a non-default TimecodeScale', () => {
    // 1,000 ns ticks: 2.5 s = 2,500,000 ticks.
    const scale = el([0x2a, 0xd7, 0xb1], [0x03, 0xe8]);
    const fixed = fixWebmDuration(webm([...scale, ...MUXING_APP]), 2500)!;
    expect(readWebmDuration(fixed)).toBeCloseTo(2500, 6);
    const view = new DataView(fixed.buffer);
    // The stored float is in TimecodeScale units.
    const durAt = fixed.findIndex((b, i) => b === 0x44 && fixed[i + 1] === 0x89 && fixed[i + 2] === 0x88);
    expect(view.getFloat64(durAt + 3, false)).toBeCloseTo(2_500_000, 3);
  });

  it('overwrites an existing Duration in place (8- and 4-byte floats)', () => {
    const with8 = webm([...TIMECODE_SCALE, ...el([0x44, 0x89], float64(1))]);
    const fixed8 = fixWebmDuration(with8, 9000)!;
    expect(fixed8.length).toBe(with8.length);
    expect(readWebmDuration(fixed8)).toBeCloseTo(9000, 6);
    const with4 = webm([...TIMECODE_SCALE, ...el([0x44, 0x89], float32(1))]);
    const fixed4 = fixWebmDuration(with4, 1500)!;
    expect(fixed4.length).toBe(with4.length);
    expect(readWebmDuration(fixed4)).toBeCloseTo(1500, 1);
  });

  it('grows the Info size field when the new size no longer fits its byte length', () => {
    // 1-byte size fields hold up to 126; this Info has 120 bytes of content.
    const pad = el([0x7b, 0xa9], new Array(120 - TIMECODE_SCALE.length - 3).fill(0x41));
    const info = [...TIMECODE_SCALE, ...pad];
    expect(info.length).toBe(120);
    const head = webm(info, { infoSizeLength: 1 });
    const fixed = fixWebmDuration(head, 777)!;
    expect(fixed.length).toBe(head.length + 12);
    expect(readWebmDuration(fixed)).toBeCloseTo(777, 6);
  });

  it('updates a known Segment size', () => {
    const head = webm([...TIMECODE_SCALE], { segmentSize: 'known' });
    const segAt = EBML_HEADER.length;
    const before = new DataView(head.buffer).getUint32(segAt + 4) & 0x0fffffff;
    const fixed = fixWebmDuration(head, 100)!;
    const after = new DataView(fixed.buffer).getUint32(segAt + 4) & 0x0fffffff;
    expect(after - before).toBe(11);
    expect(readWebmDuration(fixed)).toBeCloseTo(100, 6);
  });

  it('refuses unexpected layouts instead of corrupting files', () => {
    expect(fixWebmDuration(webm([...TIMECODE_SCALE], { seekHead: true }), 1000)).toBeNull();
    expect(fixWebmDuration(new Uint8Array([1, 2, 3, 4, 5]), 1000)).toBeNull();
    expect(fixWebmDuration(new Uint8Array(0), 1000)).toBeNull();
    expect(fixWebmDuration(webm([...TIMECODE_SCALE]), 0)).toBeNull();
    expect(fixWebmDuration(webm([...TIMECODE_SCALE]), Number.NaN)).toBeNull();
    // Truncated before the end of Info.
    const head = webm([...TIMECODE_SCALE, ...MUXING_APP]);
    expect(fixWebmDuration(head.subarray(0, EBML_HEADER.length + 16), 1000)).toBeNull();
  });

  it('encodes EBML sizes with the marker bit and rejects values that do not fit', () => {
    expect([...encodeSize(5, 1)!]).toEqual([0x85]);
    expect([...encodeSize(300, 2)!]).toEqual([0x41, 0x2c]);
    expect(encodeSize(127, 1)).toBeNull(); // all ones is reserved for "unknown"
    expect(encodeSize(126, 1)).not.toBeNull();
  });
});

describe('recording formats', () => {
  const supports = (list: string[]) => (t: string) => list.includes(t);

  it('prefers H.264 + AAC in MP4, then H.264 + Opus, then WebM', () => {
    expect(chooseMimeType('mp4', true, supports(['video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1.640033,opus']))).toEqual({
      mimeType: 'video/mp4;codecs=avc1.640033,mp4a.40.2',
      container: 'mp4',
      fallback: false,
    });
    expect(chooseMimeType('mp4', true, supports(['video/mp4;codecs=avc1,opus', 'video/webm;codecs=vp9,opus']))?.mimeType).toBe('video/mp4;codecs=avc1,opus');
    const fallback = chooseMimeType('mp4', true, supports(['video/webm;codecs=vp8,opus']));
    expect(fallback).toEqual({ mimeType: 'video/webm;codecs=vp8,opus', container: 'webm', fallback: true });
  });

  it('asks for video-only types when there is no sound', () => {
    const asked: string[] = [];
    chooseMimeType('mp4', false, (t) => {
      asked.push(t);
      return false;
    });
    expect(asked.some((t) => t.includes('opus') || t.includes('mp4a'))).toBe(false);
    expect(chooseMimeType('webm', false, supports(['video/webm;codecs=vp9']))?.mimeType).toBe('video/webm;codecs=vp9');
  });

  it('returns null when nothing can be recorded, and survives a throwing isTypeSupported', () => {
    expect(chooseMimeType('webm', true, () => false)).toBeNull();
    expect(
      chooseMimeType('webm', true, () => {
        throw new Error('boom');
      }),
    ).toBeNull();
  });

  it('describes containers and codecs', () => {
    expect(containerOf('video/mp4;codecs=avc1.64001f,opus')).toBe('mp4');
    expect(containerOf('video/webm;codecs=vp9')).toBe('webm');
    expect(baseMimeType('video/mp4;codecs=avc1')).toBe('video/mp4');
    expect(describeMimeType('video/mp4;codecs=avc1.64001f,mp4a.40.2')).toBe('MP4 · H.264 · AAC');
    expect(describeMimeType('video/webm;codecs=vp9,opus')).toBe('WEBM · VP9 · Opus');
    expect(describeMimeType('video/webm')).toBe('WEBM');
  });

  it('picks sensible bitrates and even frame sizes', () => {
    expect(videoBitsPerSecond(1920, 1080, 30)).toBe(6_220_800);
    // 60 fps costs 1.5×, not 2×, for screen content.
    expect(videoBitsPerSecond(1920, 1080, 60)).toBe(9_331_200);
    expect(videoBitsPerSecond(320, 200, 15)).toBe(1_000_000);
    expect(videoBitsPerSecond(7680, 4320, 60)).toBe(25_000_000);
    expect(evenSize(1281)).toBe(1280);
    expect(evenSize(800)).toBe(800);
    expect(evenSize(1)).toBe(2);
  });
});

describe('camera bubble geometry', () => {
  it('sizes the bubble from the short side and keeps a margin from the corner', () => {
    expect(bubbleRect(1920, 1080, { position: 'bottom-right', size: 'medium' })).toEqual({ x: 1920 - 38 - 302, y: 1080 - 38 - 302, d: 302 });
    expect(bubbleRect(1920, 1080, { position: 'top-left', size: 'small' })).toEqual({ x: 38, y: 38, d: 216 });
    const large = bubbleRect(1080, 1920, { position: 'top-right', size: 'large' });
    expect(large.d).toBe(410);
    expect(large.x + large.d).toBe(1080 - 38);
  });
});

describe('recorder state helpers', () => {
  const state = (patch: Partial<RecorderPublicState>): RecorderPublicState => ({ phase: 'recording', activeMs: 0, hasMic: false, micMuted: false, updatedAt: 0, ...patch });

  it('computes elapsed time without counting pauses', () => {
    expect(elapsedMs(state({ activeMs: 5000, since: 1000 }), 4000)).toBe(8000);
    expect(elapsedMs(state({ phase: 'paused', activeMs: 5000 }), 99999)).toBe(5000);
  });

  it('maps phases to toolbar badges', () => {
    expect(recorderBadge(state({ phase: 'countdown', countdown: 3 }))?.text).toBe('3');
    expect(recorderBadge(state({ phase: 'recording' }))?.text).toBe('REC');
    expect(recorderBadge(state({ phase: 'paused' }))?.text).toBe('II');
    expect(recorderBadge(state({ phase: 'idle' }))).toBeNull();
    expect(recorderBadge(null)).toBeNull();
    expect(isActivePhase('saving')).toBe(true);
    expect(isActivePhase('done')).toBe(false);
    expect(isActivePhase(undefined)).toBe(false);
  });

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_400)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });

  it('recognises Studio routes', () => {
    expect(isRecorderRoute('#/record')).toBe(true);
    expect(isRecorderRoute('#/recordings')).toBe(false);
    expect(isLibraryRoute('#/')).toBe(true);
    expect(isLibraryRoute('')).toBe(true);
    expect(isLibraryRoute('#/settings')).toBe(false);
  });
});

describe('recorder settings', () => {
  it('defaults to private choices: microphone and camera off', () => {
    const s = sanitizeSettings(undefined);
    expect(s.recorder).toMatchObject({ mic: false, camera: false, systemAudio: true, format: 'mp4', quality: '1080p', fps: 30, countdown: 3 });
  });

  it('clamps invalid stored values and keeps valid ones', () => {
    const s = sanitizeSettings({ recorder: { format: 'avi', quality: '8k', fps: 59, countdown: 7, surface: 'printer', cameraPosition: 'middle', micDeviceId: 'x'.repeat(300) } });
    expect(s.recorder).toEqual(DEFAULT_SETTINGS.recorder);
    const ok = sanitizeSettings({ recorder: { format: 'webm', quality: '720p', fps: '60', countdown: 0, surface: 'monitor', cameraSize: 'large', micDeviceId: 'abc' } });
    expect(ok.recorder).toMatchObject({ format: 'webm', quality: '720p', fps: 60, countdown: 0, surface: 'monitor', cameraSize: 'large', micDeviceId: 'abc' });
  });

  it('deep-merges recorder patches', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { recorder: { mic: true } });
    expect(merged.recorder.mic).toBe(true);
    expect(merged.recorder.format).toBe('mp4');
  });

  it('names recording files with a video extension', () => {
    expect(buildFilename('frameshot-{domain}-{date}', { date: new Date(2026, 10, 8), mode: 'recording' }, 'mp4')).toBe('frameshot-2026-11-08.mp4');
    expect(buildFilename('{mode} {date}', { date: new Date(2026, 10, 8), mode: 'recording' }, 'webm')).toBe('recording 2026-11-08.webm');
  });
});

// ── Storage ──

function recordingItem(id: string, patch: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id,
    name: `Recording ${id}`,
    createdAt: 5,
    updatedAt: 5,
    kind: 'recording',
    width: 1280,
    height: 720,
    byteSize: 30,
    mimeType: 'video/mp4;codecs=avc1,opus',
    favorite: false,
    collectionId: null,
    tags: [],
    hasEdits: false,
    warnings: [],
    durationMs: 3000,
    hasAudio: true,
    surface: 'browser',
    ...patch,
  };
}

function session(id: string, patch: Partial<RecordingSessionRecord> = {}): RecordingSessionRecord {
  return { id, startedAt: 1, updatedAt: 1, mimeType: 'video/webm;codecs=vp9', durationMs: 0, bytes: 0, chunks: 0, width: 1280, height: 720, hasAudio: false, warnings: [], ...patch };
}

describe('recording storage', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('stores chunks in order with running totals, and assembles the file without copying', async () => {
    await createRecordingSession(session('r1'));
    // Written out of order on purpose: keys sort by [id, sequence].
    await appendRecordingChunk('r1', 1, new Blob(['bb']), { bytes: 3, chunks: 2, durationMs: 2000 });
    await appendRecordingChunk('r1', 0, new Blob(['a']), { bytes: 1, chunks: 1, durationMs: 1000 });
    await appendRecordingChunk('r1', 2, new Blob(['ccc']), { bytes: 6, chunks: 3, durationMs: 3000 });
    // Another recording's chunks never mix in.
    await createRecordingSession(session('r2'));
    await appendRecordingChunk('r2', 0, new Blob(['zzzz']), {});
    const blob = await getRecordingBlob('r1', 'video/webm');
    expect(blob?.type).toBe('video/webm');
    expect(await blob!.text()).toBe('abbccc');
    const s = await getRecordingSession('r1');
    expect(s).toMatchObject({ bytes: 6, chunks: 3, durationMs: 3000 });
    expect(s!.updatedAt).toBeGreaterThan(1);
    expect((await listRecordingSessions()).map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    await replaceRecordingChunk('r1', 0, new Blob(['A']));
    expect(await (await getRecordingBlob('r1', 'video/webm'))!.text()).toBe('Abbccc');
  });

  it('finalizes a session into a library item, keeps the chunks, and deletes them with the item', async () => {
    await createRecordingSession(session('r1'));
    await appendRecordingChunk('r1', 0, new Blob(['x'.repeat(30)]), {});
    await finalizeRecording(recordingItem('r1'), new Blob(['thumb'], { type: 'image/png' }));
    expect(await getRecordingSession('r1')).toBeUndefined();
    expect((await getItem('r1'))?.kind).toBe('recording');
    expect((await getThumb('r1'))?.size).toBe(5);
    expect((await getRecordingChunks('r1')).length).toBe(1);
    expect((await storageStats()).imageBytes).toBe(30);
    await deleteItems(['r1']);
    expect(await getItem('r1')).toBeUndefined();
    expect(await getRecordingChunks('r1')).toEqual([]);
    expect(await getRecordingBlob('r1', 'video/mp4')).toBeUndefined();
  });

  it('discards unfinished sessions and clears everything with "delete all data"', async () => {
    await createRecordingSession(session('r1'));
    await appendRecordingChunk('r1', 0, new Blob(['a']), {});
    await discardRecordingSession('r1');
    expect(await listRecordingSessions()).toEqual([]);
    expect(await getRecordingChunks('r1')).toEqual([]);

    await createRecordingSession(session('r2'));
    await appendRecordingChunk('r2', 0, new Blob(['a']), {});
    await finalizeRecording(recordingItem('r3'));
    await clearAllData();
    expect(await listRecordingSessions()).toEqual([]);
    expect(await getRecordingChunks('r2')).toEqual([]);
    expect(await listItems()).toEqual([]);
  });

  it('filters recordings in the library and finds them by search', async () => {
    const image = { ...recordingItem('i1'), kind: 'capture' as const, mimeType: 'image/png', name: 'Pricing page' };
    await addItem(image, new Blob(['p']));
    await finalizeRecording(recordingItem('r1', { name: 'Demo walkthrough' }));
    const items = await listItems();
    const q = { search: '', domain: '', sort: 'newest' as const };
    expect(filterItems(items, { ...q, view: { kind: 'recordings' } }).map((i) => i.id)).toEqual(['r1']);
    expect(filterItems(items, { ...q, view: { kind: 'all' }, search: 'recording' }).map((i) => i.id)).toEqual(['r1']);
    expect(filterItems(items, { ...q, view: { kind: 'all' } })).toHaveLength(2);
  });
});

// ── Review prompt rules ──
import { defaultReviewState, reviewUrl, sanitizeReviewState, shouldAskForReview, REVIEW_RULES } from '../../src/core/review';

describe('review prompt rules', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 1_800_000_000_000;
  const base = { ...defaultReviewState(now - 10 * DAY), successes: 10 };

  it('asks only after enough successes and days, and never once done', () => {
    expect(shouldAskForReview(base, now)).toBe(true);
    expect(shouldAskForReview({ ...base, successes: REVIEW_RULES.minSuccesses - 1 }, now)).toBe(false);
    expect(shouldAskForReview({ ...base, installedAt: now - 2 * DAY }, now)).toBe(false);
    expect(shouldAskForReview({ ...base, done: true }, now)).toBe(false);
  });

  it('pauses between asks and stops after the maximum number of asks', () => {
    expect(shouldAskForReview({ ...base, snoozeUntil: now + 1 }, now)).toBe(false);
    expect(shouldAskForReview({ ...base, snoozeUntil: now - 1 }, now)).toBe(true);
    expect(shouldAskForReview({ ...base, asks: REVIEW_RULES.maxAsks }, now)).toBe(false);
  });

  it('repairs corrupted stored state without asking early', () => {
    const s = sanitizeReviewState({ successes: -4, asks: 'x', done: 'yes', installedAt: Number.NaN }, now);
    expect(s).toEqual({ installedAt: now, successes: 0, asks: 0, lastAskedAt: 0, snoozeUntil: 0, done: false });
    expect(shouldAskForReview(s, now)).toBe(false);
  });

  it('links to the listing’s reviews for this extension id', () => {
    expect(reviewUrl('abcdefghijklmnopabcdefghijklmnop')).toBe('https://chromewebstore.google.com/detail/frameshot/abcdefghijklmnopabcdefghijklmnop/reviews');
  });
});
