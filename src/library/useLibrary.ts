/** Library data hooks and pure filtering/sorting logic. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Collection, LibraryItem } from '../core/types';
import { listCollections, listItems, onLibraryEvent, storageStats, type StorageStats } from '../db/db';

export type SortKey = 'newest' | 'oldest' | 'name' | 'largest';
export type ViewFilter = { kind: 'all' } | { kind: 'favorites' } | { kind: 'recordings' } | { kind: 'duplicates' } | { kind: 'collection'; id: string };

export interface LibraryQuery {
  search: string;
  domain: string;
  sort: SortKey;
  view: ViewFilter;
}

export function useLibraryData() {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Skip re-rendering the whole library when a refresh finds nothing new
  // (for example every time the window regains focus).
  const lastSig = useRef('');
  const refresh = useCallback(async () => {
    try {
      const [i, c, s] = await Promise.all([listItems(), listCollections(), storageStats()]);
      const sig = `${i.map((x) => `${x.id}:${x.updatedAt}`).join('|')}#${c.map((x) => `${x.id}:${x.name}`).join('|')}#${s.count}:${s.usage ?? s.imageBytes}`;
      if (sig !== lastSig.current) {
        lastSig.current = sig;
        setItems(i);
        setCollections(c);
        setStats(s);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the library.');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onLibraryEvent(() => {
      clearTimeout(timer);
      // A change elsewhere (e.g. a new thumbnail) must always re-render.
      lastSig.current = '';
      timer = setTimeout(() => void refresh(), 120);
    });
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      off();
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { items, collections, stats, error, refresh };
}

function popcount32(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** Last result, keyed by the exact set of hashes (most refreshes change none). */
let duplicateCache: { key: string; groups: string[][] } | null = null;

/**
 * Groups items whose perceptual hashes are within `threshold` bits.
 * Hashes are compared as two 32-bit integers (a bit count, not string work),
 * and the result is reused until an item's hash or shape changes.
 */
export function findDuplicateGroups(items: LibraryItem[], threshold = 4): LibraryItem[][] {
  const withHash = items.filter((i) => i.dhash && i.dhash.length === 16);
  const key = `${threshold}#${withHash.map((i) => `${i.id}:${i.dhash}:${i.width}x${i.height}`).join('|')}`;
  let groupIds: string[][];
  if (duplicateCache?.key === key) {
    groupIds = duplicateCache.groups;
  } else {
    const n = withHash.length;
    const hi = new Uint32Array(n);
    const lo = new Uint32Array(n);
    const ratio = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const h = withHash[i].dhash!;
      hi[i] = parseInt(h.slice(0, 8), 16) >>> 0;
      lo[i] = parseInt(h.slice(8), 16) >>> 0;
      ratio[i] = withHash[i].width / Math.max(1, withHash[i].height);
    }
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // Same hash but very different shapes are not duplicates.
        if (Math.abs(ratio[i] - ratio[j]) / Math.max(ratio[i], ratio[j]) > 0.05) continue;
        if (popcount32(hi[i] ^ hi[j]) + popcount32(lo[i] ^ lo[j]) <= threshold) parent[find(i)] = find(j);
      }
    }
    const groups = new Map<number, string[]>();
    withHash.forEach((item, i) => {
      const root = find(i);
      const g = groups.get(root);
      if (g) g.push(item.id);
      else groups.set(root, [item.id]);
    });
    groupIds = [...groups.values()].filter((g) => g.length > 1);
    duplicateCache = { key, groups: groupIds };
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  return groupIds.map((g) => g.map((id) => byId.get(id)!).filter(Boolean)).filter((g) => g.length > 1);
}

export function filterItems(items: LibraryItem[], q: LibraryQuery): LibraryItem[] {
  let list = items;
  if (q.view.kind === 'favorites') list = list.filter((i) => i.favorite);
  else if (q.view.kind === 'recordings') list = list.filter((i) => i.kind === 'recording');
  else if (q.view.kind === 'collection') {
    const id = q.view.id;
    list = list.filter((i) => i.collectionId === id);
  } else if (q.view.kind === 'duplicates') {
    const ids = new Set(findDuplicateGroups(items).flat().map((i) => i.id));
    list = list.filter((i) => ids.has(i.id));
  }
  if (q.domain) list = list.filter((i) => (i.source?.domain ?? '') === q.domain);
  const terms = q.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length) {
    list = list.filter((i) => {
      const kindWords = i.kind === 'recording' ? 'recording video' : i.kind === 'frame' ? 'frame screenshot' : 'screenshot';
      const hay = [i.name, i.source?.domain, i.source?.title, i.source?.url, ...i.tags, i.mode, kindWords].filter(Boolean).join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  const sorted = [...list];
  switch (q.sort) {
    case 'oldest':
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      break;
    case 'largest':
      sorted.sort((a, b) => b.byteSize - a.byteSize);
      break;
    default:
      sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
  if (q.view.kind === 'duplicates') {
    // Keep duplicates next to each other.
    const order = new Map<string, number>();
    findDuplicateGroups(sorted).forEach((g, gi) => g.forEach((i) => order.set(i.id, gi)));
    sorted.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  return sorted;
}

export function domainsOf(items: LibraryItem[]): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of items) {
    const d = i.source?.domain;
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts.entries()].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}
