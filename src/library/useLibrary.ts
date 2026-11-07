/** Library data hooks and pure filtering/sorting logic. */
import { useCallback, useEffect, useState } from 'react';
import type { Collection, LibraryItem } from '../core/types';
import { listCollections, listItems, onLibraryEvent, storageStats, type StorageStats } from '../db/db';
import { hammingDistanceHex } from '../imaging/image-io';

export type SortKey = 'newest' | 'oldest' | 'name' | 'largest';
export type ViewFilter = { kind: 'all' } | { kind: 'favorites' } | { kind: 'duplicates' } | { kind: 'collection'; id: string };

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

  const refresh = useCallback(async () => {
    try {
      const [i, c, s] = await Promise.all([listItems(), listCollections(), storageStats()]);
      setItems(i);
      setCollections(c);
      setStats(s);
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

/** Groups items whose perceptual hashes are within `threshold` bits. */
export function findDuplicateGroups(items: LibraryItem[], threshold = 4): LibraryItem[][] {
  const withHash = items.filter((i) => i.dhash && i.dhash.length === 16);
  const parent = withHash.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < withHash.length; i++) {
    for (let j = i + 1; j < withHash.length; j++) {
      const a = withHash[i];
      const b = withHash[j];
      // Same hash but very different shapes are not duplicates.
      const ar = a.width / a.height;
      const br = b.width / b.height;
      if (Math.abs(ar - br) / Math.max(ar, br) > 0.05) continue;
      if (hammingDistanceHex(a.dhash!, b.dhash!) <= threshold) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, LibraryItem[]>();
  withHash.forEach((item, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });
  return [...groups.values()].filter((g) => g.length > 1);
}

export function filterItems(items: LibraryItem[], q: LibraryQuery): LibraryItem[] {
  let list = items;
  if (q.view.kind === 'favorites') list = list.filter((i) => i.favorite);
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
      const hay = [i.name, i.source?.domain, i.source?.title, i.source?.url, ...i.tags, i.mode].filter(Boolean).join(' ').toLowerCase();
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
