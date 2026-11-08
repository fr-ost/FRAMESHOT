import { beforeEach, describe, expect, it } from 'vitest';
import type { LibraryItem } from '../../src/core/types';
import {
  addItem,
  clearAllData,
  deleteCollection,
  deleteItems,
  getDoc,
  getItem,
  getOriginal,
  getThumb,
  listCollections,
  listItems,
  putCollection,
  putDoc,
  replaceOriginal,
  storageStats,
  updateItem,
  updateItems,
} from '../../src/db/db';
import { domainsOf, filterItems, findDuplicateGroups } from '../../src/library/useLibrary';

function item(id: string, patch: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id,
    name: `Item ${id}`,
    createdAt: Number(id.replace(/\D/g, '')) || 1,
    updatedAt: 1,
    kind: 'capture',
    mode: 'full',
    source: { url: 'https://example.com/a', title: 'Example', domain: 'example.com' },
    width: 100,
    height: 50,
    byteSize: 10,
    mimeType: 'image/png',
    favorite: false,
    collectionId: null,
    tags: [],
    hasEdits: false,
    warnings: [],
    ...patch,
  };
}

const blob = (n: number) => new Blob([new Uint8Array(n)], { type: 'image/png' });

describe('IndexedDB library storage', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('adds, lists (newest first), reads and updates items', async () => {
    await addItem(item('i1'), blob(10), blob(2));
    await addItem(item('i2'), blob(20));
    expect((await listItems()).map((i) => i.id)).toEqual(['i2', 'i1']);
    expect((await getOriginal('i1'))?.size).toBe(10);
    expect((await getThumb('i1'))?.size).toBe(2);
    const updated = await updateItem('i1', { name: 'Renamed', favorite: true });
    expect(updated.name).toBe('Renamed');
    expect((await getItem('i1'))?.favorite).toBe(true);
    await updateItems(['i1', 'i2'], { tags: ['x'] });
    expect((await listItems()).every((i) => i.tags[0] === 'x')).toBe(true);
    await expect(updateItem('missing', { name: 'x' })).rejects.toThrow(/no longer exists/);
  });

  it('deletes items with their blobs and documents', async () => {
    await addItem(item('i1'), blob(10), blob(2));
    await putDoc('i1', { version: 1 });
    expect(await getDoc('i1')).toBeTruthy();
    await deleteItems(['i1']);
    expect(await getItem('i1')).toBeUndefined();
    expect(await getOriginal('i1')).toBeUndefined();
    expect(await getThumb('i1')).toBeUndefined();
    expect(await getDoc('i1')).toBeUndefined();
  });

  it('replaces originals when flattening edits (and drops the edit document)', async () => {
    await addItem(item('i1'), blob(10), blob(2));
    await putDoc('i1', { version: 1 });
    await replaceOriginal('i1', blob(99), blob(3), { width: 10, height: 10, byteSize: 99 });
    expect((await getOriginal('i1'))?.size).toBe(99);
    expect(await getDoc('i1')).toBeUndefined();
    expect((await getItem('i1'))?.width).toBe(10);
  });

  it('manages collections and un-files items when a collection is deleted', async () => {
    await putCollection({ id: 'c1', name: 'Zeta', createdAt: 1 });
    await putCollection({ id: 'c2', name: 'Alpha', createdAt: 2 });
    expect((await listCollections()).map((c) => c.name)).toEqual(['Alpha', 'Zeta']);
    await addItem(item('i1', { collectionId: 'c1' }), blob(1));
    await deleteCollection('c1');
    expect((await getItem('i1'))?.collectionId).toBeNull();
    expect((await listCollections()).map((c) => c.id)).toEqual(['c2']);
  });

  it('reports storage usage', async () => {
    await addItem(item('i1', { byteSize: 1000 }), blob(1000));
    await addItem(item('i2', { byteSize: 500 }), blob(500));
    const stats = await storageStats();
    expect(stats.count).toBe(2);
    expect(stats.imageBytes).toBe(1500);
  });
});

describe('library filtering', () => {
  const items = [
    item('i1', { name: 'Checkout bug', tags: ['bug'], source: { url: 'https://shop.test/cart', title: 'Cart', domain: 'shop.test' } }),
    item('i2', { name: 'Homepage', favorite: true, collectionId: 'c1' }),
    item('i3', { name: 'Docs page', byteSize: 999, source: { url: 'https://docs.test', title: 'API reference', domain: 'docs.test' } }),
  ];
  const base = { search: '', domain: '', sort: 'newest' as const, view: { kind: 'all' as const } };

  it('searches name, title, domain and tags', () => {
    expect(filterItems(items, { ...base, search: 'bug' }).map((i) => i.id)).toEqual(['i1']);
    expect(filterItems(items, { ...base, search: 'api reference' }).map((i) => i.id)).toEqual(['i3']);
    expect(filterItems(items, { ...base, search: 'shop.test cart' }).map((i) => i.id)).toEqual(['i1']);
  });

  it('filters by domain, favorites and collection; sorts', () => {
    expect(filterItems(items, { ...base, domain: 'docs.test' }).map((i) => i.id)).toEqual(['i3']);
    expect(filterItems(items, { ...base, view: { kind: 'favorites' } }).map((i) => i.id)).toEqual(['i2']);
    expect(filterItems(items, { ...base, view: { kind: 'collection', id: 'c1' } }).map((i) => i.id)).toEqual(['i2']);
    expect(filterItems(items, { ...base, sort: 'oldest' }).map((i) => i.id)).toEqual(['i1', 'i2', 'i3']);
    expect(filterItems(items, { ...base, sort: 'largest' })[0].id).toBe('i3');
    expect(filterItems(items, { ...base, sort: 'name' }).map((i) => i.name)).toEqual(['Checkout bug', 'Docs page', 'Homepage']);
    // Ties are broken alphabetically.
    expect(domainsOf(items).map((d) => d.domain)).toEqual(['docs.test', 'example.com', 'shop.test']);
  });

  it('groups visually identical screenshots as duplicates', () => {
    const dupes = [
      item('d1', { dhash: '0f0f0f0f0f0f0f0f' }),
      item('d2', { dhash: '0f0f0f0f0f0f0f0e' }), // 1 bit different
      item('d3', { dhash: 'f0f0f0f0f0f0f0f0' }),
      item('d4', { dhash: '0f0f0f0f0f0f0f0f', width: 50, height: 500 }), // same hash, different shape
    ];
    const groups = findDuplicateGroups(dupes);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((i) => i.id).sort()).toEqual(['d1', 'd2']);
  });
});

describe('duplicate detection at scale', () => {
  it('groups 4,000 screenshots quickly and reuses the result until a hash changes', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 0xffffffff);
    const hex = () => Array.from({ length: 16 }, () => Math.floor(rand() * 16).toString(16)).join('');
    const many: LibraryItem[] = Array.from({ length: 4000 }, (_, k) => item(`d${k}`, { dhash: hex(), width: 1280, height: 800 }));
    // Two near-identical pairs (1 bit apart).
    many[10] = { ...many[10], dhash: 'ffffffffffffffff' };
    many[20] = { ...many[20], dhash: 'fffffffffffffffe' };
    const t0 = performance.now();
    const groups = findDuplicateGroups(many);
    const first = performance.now() - t0;
    expect(groups.some((g) => g.map((i) => i.id).sort().join() === 'd10,d20')).toBe(true);
    const t1 = performance.now();
    findDuplicateGroups(many.map((i) => ({ ...i, favorite: !i.favorite })));
    const second = performance.now() - t1;
    expect(first).toBeLessThan(1500);
    expect(second).toBeLessThan(first);
    console.log(`duplicates: 4000 items ${first.toFixed(0)} ms, cached ${second.toFixed(1)} ms`);
  });
});
