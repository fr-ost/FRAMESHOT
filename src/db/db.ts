/**
 * Local-only persistence (IndexedDB). Shared by the service worker (saving
 * captures) and the Studio (library, editor). Nothing here touches the network.
 *
 * Stores:
 *  - items:       LibraryItem metadata (small, loaded in full for filtering)
 *  - blobs:       image bytes keyed by `${id}:original` and `${id}:thumb`
 *  - docs:        editor documents (non-destructive edits) keyed by item id
 *  - collections: user collections (folders)
 *  - recChunks:   screen-recording video data, stored as the ~1 s chunks
 *                 MediaRecorder produces, keyed by [item id, sequence]
 *  - recSessions: recordings still in progress (or interrupted by a crash),
 *                 so an unfinished recording can be recovered
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { LIBRARY_CHANNEL, type LibraryEvent } from '../core/messages';
import type { Collection, DisplaySurfaceKind, LibraryItem } from '../core/types';

// Database name kept from the product's former name (Frameora) so existing
// screenshot libraries survive the rename to FrameShot.
export const DB_NAME = 'frameora';
// v2 (FrameShot 1.2): adds the screen-recording stores.
export const DB_VERSION = 2;

/** A recording that has started but not been saved to the library yet. */
export interface RecordingSessionRecord {
  id: string;
  startedAt: number;
  /** Heartbeat: refreshed while the recorder page is alive. */
  updatedAt: number;
  mimeType: string;
  /** Recorded time so far, excluding pauses. */
  durationMs: number;
  bytes: number;
  chunks: number;
  width: number;
  height: number;
  hasAudio: boolean;
  surface?: DisplaySurfaceKind;
  label?: string;
  thumb?: Blob;
  warnings: string[];
}

export interface StoredDoc {
  id: string;
  doc: unknown;
  updatedAt: number;
}

interface FrameShotDB extends DBSchema {
  items: { key: string; value: LibraryItem; indexes: { createdAt: number } };
  blobs: { key: string; value: Blob };
  docs: { key: string; value: StoredDoc };
  collections: { key: string; value: Collection };
  recChunks: { key: [string, number]; value: Blob };
  recSessions: { key: string; value: RecordingSessionRecord };
}

let dbPromise: Promise<IDBPDatabase<FrameShotDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FrameShotDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FrameShotDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('items')) {
          const items = db.createObjectStore('items', { keyPath: 'id' });
          items.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
        if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('collections')) db.createObjectStore('collections', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('recChunks')) db.createObjectStore('recChunks');
        if (!db.objectStoreNames.contains('recSessions')) db.createObjectStore('recSessions', { keyPath: 'id' });
      },
      blocking() {
        // Another context wants to upgrade; close so it can proceed.
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** Test helper: forget the cached connection (used with fake-indexeddb). */
export function resetDbConnection(): void {
  dbPromise = null;
}

export class StorageFullError extends Error {
  constructor() {
    super(
      'Your browser storage is full. Delete some screenshots from the library or free up disk space, then try again.',
    );
    this.name = 'StorageFullError';
  }
}

function wrapQuota<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((err: unknown) => {
    const name = err instanceof DOMException || err instanceof Error ? err.name : '';
    if (name === 'QuotaExceededError') throw new StorageFullError();
    throw err;
  });
}

const originalKey = (id: string) => `${id}:original`;
const thumbKey = (id: string) => `${id}:thumb`;
const chunkRange = (id: string) => IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);

// ── Change notifications ────────────────────────────────────────────────

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(LIBRARY_CHANNEL);
  return channel;
}

export function notifyLibrary(event: LibraryEvent): void {
  try {
    getChannel()?.postMessage(event);
  } catch {
    // Notifications are best-effort.
  }
}

export function onLibraryEvent(listener: (event: LibraryEvent) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  // A separate channel instance receives messages posted by other instances,
  // including ones in this same context.
  const ch = new BroadcastChannel(LIBRARY_CHANNEL);
  const handler = (e: MessageEvent<LibraryEvent>) => listener(e.data);
  ch.addEventListener('message', handler);
  return () => {
    ch.removeEventListener('message', handler);
    ch.close();
  };
}

// ── Items ───────────────────────────────────────────────────────────────

export async function addItem(item: LibraryItem, original: Blob, thumb?: Blob): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'blobs'], 'readwrite');
  await wrapQuota(
    Promise.all([
      tx.objectStore('items').put(item),
      tx.objectStore('blobs').put(original, originalKey(item.id)),
      thumb ? tx.objectStore('blobs').put(thumb, thumbKey(item.id)) : Promise.resolve(),
      tx.done,
    ]),
  );
  notifyLibrary({ kind: 'items-changed', ids: [item.id] });
}

export async function getItem(id: string): Promise<LibraryItem | undefined> {
  return (await getDb()).get('items', id);
}

export async function listItems(): Promise<LibraryItem[]> {
  const items = await (await getDb()).getAllFromIndex('items', 'createdAt');
  return items.reverse();
}

export async function updateItem(id: string, patch: Partial<Omit<LibraryItem, 'id'>>): Promise<LibraryItem> {
  const db = await getDb();
  const tx = db.transaction('items', 'readwrite');
  const existing = await tx.store.get(id);
  if (!existing) throw new Error('This screenshot no longer exists in the library.');
  const next: LibraryItem = { ...existing, ...patch, id, updatedAt: Date.now() };
  await wrapQuota(Promise.all([tx.store.put(next), tx.done]));
  notifyLibrary({ kind: 'items-changed', ids: [id] });
  return next;
}

export async function updateItems(ids: string[], patch: Partial<Omit<LibraryItem, 'id'>>): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('items', 'readwrite');
  for (const id of ids) {
    const existing = await tx.store.get(id);
    if (existing) await tx.store.put({ ...existing, ...patch, id, updatedAt: Date.now() });
  }
  await wrapQuota(tx.done);
  notifyLibrary({ kind: 'items-changed', ids });
}

export async function deleteItems(ids: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'blobs', 'docs', 'recChunks', 'recSessions'], 'readwrite');
  for (const id of ids) {
    await Promise.all([
      tx.objectStore('items').delete(id),
      tx.objectStore('blobs').delete(originalKey(id)),
      tx.objectStore('blobs').delete(thumbKey(id)),
      tx.objectStore('docs').delete(id),
      tx.objectStore('recChunks').delete(chunkRange(id)),
      tx.objectStore('recSessions').delete(id),
    ]);
  }
  await tx.done;
  notifyLibrary({ kind: 'items-changed', ids });
}

export async function getOriginal(id: string): Promise<Blob | undefined> {
  return (await getDb()).get('blobs', originalKey(id));
}

export async function getThumb(id: string): Promise<Blob | undefined> {
  return (await getDb()).get('blobs', thumbKey(id));
}

export async function putThumb(id: string, thumb: Blob): Promise<void> {
  await wrapQuota((await getDb()).put('blobs', thumb, thumbKey(id)));
  notifyLibrary({ kind: 'items-changed', ids: [id] });
}

/** Replaces the stored original (used by "flatten edits into library copy"). */
export async function replaceOriginal(
  id: string,
  original: Blob,
  thumb: Blob,
  patch: Partial<Omit<LibraryItem, 'id'>>,
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'blobs', 'docs'], 'readwrite');
  const existing = await tx.objectStore('items').get(id);
  if (!existing) throw new Error('This screenshot no longer exists in the library.');
  await wrapQuota(
    Promise.all([
      tx.objectStore('blobs').put(original, originalKey(id)),
      tx.objectStore('blobs').put(thumb, thumbKey(id)),
      tx.objectStore('docs').delete(id),
      tx.objectStore('items').put({ ...existing, ...patch, id, updatedAt: Date.now() }),
      tx.done,
    ]),
  );
  notifyLibrary({ kind: 'items-changed', ids: [id] });
}

// ── Screen recordings ───────────────────────────────────────────────────

export async function createRecordingSession(session: RecordingSessionRecord): Promise<void> {
  await wrapQuota((await getDb()).put('recSessions', session));
}

/** Stores one recorded chunk and updates the session's running totals atomically. */
export async function appendRecordingChunk(id: string, seq: number, chunk: Blob, patch: Partial<Omit<RecordingSessionRecord, 'id'>>): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['recChunks', 'recSessions'], 'readwrite');
  const sessions = tx.objectStore('recSessions');
  const existing = await sessions.get(id);
  await wrapQuota(
    Promise.all([
      tx.objectStore('recChunks').put(chunk, [id, seq]),
      existing ? sessions.put({ ...existing, ...patch, id, updatedAt: Date.now() }) : Promise.resolve(),
      tx.done,
    ]),
  );
}

export async function updateRecordingSession(id: string, patch: Partial<Omit<RecordingSessionRecord, 'id'>>): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('recSessions', 'readwrite');
  const existing = await tx.store.get(id);
  if (!existing) return;
  await wrapQuota(Promise.all([tx.store.put({ ...existing, ...patch, id, updatedAt: Date.now() }), tx.done]));
}

export async function getRecordingSession(id: string): Promise<RecordingSessionRecord | undefined> {
  return (await getDb()).get('recSessions', id);
}

export async function listRecordingSessions(): Promise<RecordingSessionRecord[]> {
  return (await getDb()).getAll('recSessions');
}

export async function getRecordingChunks(id: string): Promise<Blob[]> {
  return (await getDb()).getAll('recChunks', chunkRange(id));
}

export async function replaceRecordingChunk(id: string, seq: number, chunk: Blob): Promise<void> {
  await wrapQuota((await getDb()).put('recChunks', chunk, [id, seq]));
}

/** The complete video file of a recording (assembled from its chunks without copying). */
export async function getRecordingBlob(id: string, mimeType: string): Promise<Blob | undefined> {
  const chunks = await getRecordingChunks(id);
  if (chunks.length === 0) return undefined;
  return new Blob(chunks, { type: mimeType });
}

/** Turns a finished (or recovered) session into a library item. The chunks stay where they are. */
export async function finalizeRecording(item: LibraryItem, thumb?: Blob): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'blobs', 'recSessions'], 'readwrite');
  await wrapQuota(
    Promise.all([
      tx.objectStore('items').put(item),
      thumb ? tx.objectStore('blobs').put(thumb, thumbKey(item.id)) : Promise.resolve(),
      tx.objectStore('recSessions').delete(item.id),
      tx.done,
    ]),
  );
  notifyLibrary({ kind: 'items-changed', ids: [item.id] });
}

/** Deletes an unfinished recording and its data. */
export async function discardRecordingSession(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['recChunks', 'recSessions'], 'readwrite');
  await Promise.all([tx.objectStore('recChunks').delete(chunkRange(id)), tx.objectStore('recSessions').delete(id), tx.done]);
}

// ── Editor documents ────────────────────────────────────────────────────

export async function getDoc(id: string): Promise<StoredDoc | undefined> {
  return (await getDb()).get('docs', id);
}

export async function putDoc(id: string, doc: unknown): Promise<void> {
  await wrapQuota((await getDb()).put('docs', { id, doc, updatedAt: Date.now() }));
}

export async function deleteDoc(id: string): Promise<void> {
  await (await getDb()).delete('docs', id);
}

// ── Collections ─────────────────────────────────────────────────────────

export async function listCollections(): Promise<Collection[]> {
  const all = await (await getDb()).getAll('collections');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function putCollection(collection: Collection): Promise<void> {
  await wrapQuota((await getDb()).put('collections', collection));
  notifyLibrary({ kind: 'collections-changed' });
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['collections', 'items'], 'readwrite');
  await tx.objectStore('collections').delete(id);
  let cursor = await tx.objectStore('items').openCursor();
  while (cursor) {
    if (cursor.value.collectionId === id) await cursor.update({ ...cursor.value, collectionId: null });
    cursor = await cursor.continue();
  }
  await tx.done;
  notifyLibrary({ kind: 'collections-changed' });
  notifyLibrary({ kind: 'items-changed' });
}

// ── Storage ─────────────────────────────────────────────────────────────

export interface StorageStats {
  count: number;
  /** Sum of stored original image and video sizes. */
  imageBytes: number;
  /** Browser-reported usage/quota for this extension, when available. */
  usage?: number;
  quota?: number;
}

export async function storageStats(): Promise<StorageStats> {
  const items = await (await getDb()).getAll('items');
  const imageBytes = items.reduce((sum, i) => sum + (i.byteSize || 0), 0);
  let usage: number | undefined;
  let quota: number | undefined;
  try {
    const est = await navigator.storage?.estimate?.();
    usage = est?.usage;
    quota = est?.quota;
  } catch {
    // Estimate is optional.
  }
  return { count: items.length, imageBytes, usage, quota };
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'blobs', 'docs', 'collections', 'recChunks', 'recSessions'], 'readwrite');
  await Promise.all([
    tx.objectStore('items').clear(),
    tx.objectStore('blobs').clear(),
    tx.objectStore('docs').clear(),
    tx.objectStore('collections').clear(),
    tx.objectStore('recChunks').clear(),
    tx.objectStore('recSessions').clear(),
    tx.done,
  ]);
  notifyLibrary({ kind: 'cleared' });
}
