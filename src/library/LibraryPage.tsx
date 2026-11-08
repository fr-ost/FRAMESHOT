/**
 * Local screenshot library: everything stays in IndexedDB on this device.
 */
import {
  CheckSquare,
  ClipboardCopy,
  Download,
  FolderPlus,
  Folder,
  Grid2x2,
  HardDrive,
  ImagePlus,
  Images,
  Info,
  LayoutTemplate,
  List,
  MoreHorizontal,
  Pencil,
  Search,
  Settings as SettingsIcon,
  Square,
  Star,
  Trash2,
  X,
  Columns2,
  Camera,
  Monitor,
  Moon,
  Play,
  Sparkles,
  Sun,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatBytes, formatDate, formatDimensions, formatDuration, formatRelative, newId } from '../core/format';
import { isSafeLink } from '../core/restricted';
import { type Settings, updateSettings } from '../core/settings';
import { CAPTURE_MODE_LABELS, SURFACE_LABELS, isRecording, type Collection, type LibraryItem } from '../core/types';
import { deleteCollection, deleteItems, getThumb, putCollection, updateItem, updateItems } from '../db/db';
import { copyImageBlob, displayPath, downloadBlob, DownloadCancelledError } from '../export/deliver';
import { ExportDialog, type ExportChoice } from '../export/ExportDialog';
import { exportItem, exportMany, exportRecording } from '../export/service';
import { describeMimeType } from '../recorder/formats';
import { isActivePhase } from '../recorder/channel';
import { useRecorder } from '../recorder/useMedia';
import { ReviewCard, useReviewPrompt } from '../ui/ReviewPrompt';
import { navigate } from '../ui/hooks';
import { Dialog, DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger, useConfirm, useToast } from '../ui/overlays';
import { Badge, Button, Credits, EmptyState, Field, IconButton, Input, Kbd, Logo, Select, Spinner, cx } from '../ui/primitives';
import { withFolder } from '../core/filename';
import { importImageFile } from './importer';
import { domainsOf, filterItems, findDuplicateGroups, useLibraryData, type SortKey, type ViewFilter } from './useLibrary';

const PAGE = 60;

/** "screenshot", "recording" or "item", pluralised. */
function nounFor(items: LibraryItem[], count = items.length): string {
  const recordings = items.filter(isRecording).length;
  const base = recordings === items.length && items.length > 0 ? 'recording' : recordings > 0 ? 'item' : 'screenshot';
  return count === 1 ? base : `${base}s`;
}

const openItem = (item: LibraryItem) => navigate(`/${isRecording(item) ? 'play' : 'edit'}/${encodeURIComponent(item.id)}`);

export function LibraryPage({ settings }: { settings: Settings }) {
  const { items, collections, stats, error } = useLibraryData();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<ViewFilter>({ kind: 'all' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [details, setDetails] = useState<LibraryItem | null>(null);
  const [bulkExport, setBulkExport] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [collectionDialog, setCollectionDialog] = useState<{ mode: 'create' | 'rename'; collection?: Collection } | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const layout = settings.library.view;
  const recorder = useRecorder();
  // Never while recording; only once the library has something in it.
  const review = useReviewPrompt(!!items && items.length > 0 && !isActivePhase(recorder.phase), 1200);

  const visible = useMemo(() => (items ? filterItems(items, { search, domain, sort, view }) : []), [items, search, domain, sort, view]);
  const domains = useMemo(() => domainsOf(items ?? []), [items]);
  const dupCount = useMemo(() => findDuplicateGroups(items ?? []).reduce((n, g) => n + g.length, 0), [items]);
  const selectedItems = visible.filter((i) => selected.has(i.id));

  useEffect(() => setLimit(PAGE), [search, domain, sort, view]);
  useEffect(() => {
    // Drop selections that no longer exist.
    if (!items) return;
    setSelected((prev) => new Set([...prev].filter((id) => items.some((i) => i.id === id))));
  }, [items]);

  // Paste images from the clipboard straight into the library.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        void importFiles(files);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKey);
    };
  });

  const importFiles = async (files: File[]) => {
    setBusy(`Importing ${files.length} image${files.length > 1 ? 's' : ''}…`);
    let ok = 0;
    for (const f of files) {
      try {
        await importImageFile(f, f.name);
        ok++;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Could not import ${f.name}.`);
      }
    }
    setBusy(null);
    if (ok) toast.success(`Imported ${ok} image${ok > 1 ? 's' : ''}.`);
  };

  const toggle = (id: string, range = false) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (range && prev.size) {
        const ids = visible.map((i) => i.id);
        const last = [...prev].pop()!;
        const a = ids.indexOf(last);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next.add(ids[i]);
        return next;
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const download = async (item: LibraryItem) => {
    setBusy(isRecording(item) ? 'Preparing video…' : 'Exporting…');
    try {
      const { blob, filename } = isRecording(item) ? await exportRecording(item.id, settings) : await exportItem(item.id, settings.defaultFormat, settings);
      const res = await downloadBlob(blob, withFolder(settings.downloadFolder, filename), { saveAs: settings.askWhereToSave });
      toast.success(<span>Saved <strong>{displayPath(res.path || filename)}</strong></span>);
    } catch (err) {
      if (err instanceof DownloadCancelledError) toast.info('Download cancelled.');
      else toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (item: LibraryItem) => {
    if (isRecording(item)) return;
    try {
      await copyImageBlob(exportItem(item.id, 'png', settings).then((r) => r.blob));
      toast.success('Copied to clipboard.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Copy failed.');
    }
  };

  const remove = async (ids: string[]) => {
    const targets = (items ?? []).filter((i) => ids.includes(i.id));
    const noun = nounFor(targets, ids.length);
    const ok = await confirm({
      title: ids.length > 1 ? `Delete ${ids.length} ${noun}?` : `Delete ${noun}?`,
      message: 'They will be permanently removed from the library on this device. Files you already downloaded are not affected.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteItems(ids);
    setSelected(new Set());
    toast.success(ids.length > 1 ? `Deleted ${ids.length} ${noun}.` : `${noun.charAt(0).toUpperCase()}${noun.slice(1)} deleted.`);
  };

  const runBulkExport = async (choice: ExportChoice) => {
    const ids = selectedItems.map((i) => i.id);
    setBusy(`Exporting 0 of ${ids.length}…`);
    try {
      const s: Settings = { ...settings, jpegQuality: choice.quality, webpQuality: choice.quality, pdf: { ...settings.pdf, pageSize: choice.pageSize } };
      const { blob, filename, skippedRecordings } = await exportMany(ids, choice.format, s, (d, t) => setBusy(`Exporting ${d} of ${t}…`));
      const res = await downloadBlob(blob, filename, { saveAs: choice.saveAs });
      toast.success(<span>Saved <strong>{displayPath(res.path || filename)}</strong></span>);
      if (skippedRecordings > 0) toast.info(`${skippedRecordings} recording${skippedRecordings > 1 ? 's were' : ' was'} left out: PDF files hold images only.`);
    } catch (err) {
      if (err instanceof DownloadCancelledError) toast.info('Download cancelled.');
      else toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const viewTitle =
    view.kind === 'all'
      ? 'All captures'
      : view.kind === 'favorites'
        ? 'Favorites'
        : view.kind === 'recordings'
          ? 'Screen recordings'
          : view.kind === 'duplicates'
            ? 'Possible duplicates'
            : collections.find((c) => c.id === view.id)?.name ?? 'Collection';
  const recordingCount = items?.filter(isRecording).length ?? 0;

  const nextTheme = settings.theme === 'system' ? 'light' : settings.theme === 'light' ? 'dark' : 'system';
  const themeIcon = settings.theme === 'dark' ? <Moon size={16} /> : settings.theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />;

  return (
    <div
      className="flex h-full"
      onDragOver={(e) => {
        if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
        if (files.length) void importFiles(files);
      }}
    >
      {/* Sidebar */}
      <aside className="fr-glass fr-scroll flex w-[252px] shrink-0 flex-col overflow-y-auto border-r border-border">
        <div className="flex h-16 items-center px-5">
          <Logo size={30} />
        </div>
        <nav aria-label="Library sections" className="space-y-0.5 px-3">
          <NavItem icon={<Images size={16} />} label="All captures" count={items?.length} active={view.kind === 'all'} onClick={() => setView({ kind: 'all' })} />
          <NavItem icon={<Star size={16} />} label="Favorites" count={items?.filter((i) => i.favorite).length} active={view.kind === 'favorites'} onClick={() => setView({ kind: 'favorites' })} />
          <NavItem icon={<Video size={16} />} label="Recordings" count={recordingCount || undefined} active={view.kind === 'recordings'} onClick={() => setView({ kind: 'recordings' })} />
          <NavItem icon={<Columns2 size={16} />} label="Duplicates" count={dupCount || undefined} active={view.kind === 'duplicates'} onClick={() => setView({ kind: 'duplicates' })} />
        </nav>
        <div className="mt-6 flex items-center justify-between px-5 pb-1.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Collections</h2>
          <IconButton label="New collection" size="sm" onClick={() => setCollectionDialog({ mode: 'create' })}>
            <FolderPlus size={15} />
          </IconButton>
        </div>
        <nav aria-label="Collections" className="space-y-0.5 px-3">
          {collections.length === 0 && <p className="px-2.5 py-1 text-[12px] leading-relaxed text-fg-subtle">Group related screenshots into collections.</p>}
          {collections.map((c) => (
            <div key={c.id} className="group relative">
              <NavItem icon={<Folder size={16} />} label={c.name} count={items?.filter((i) => i.collectionId === c.id).length} active={view.kind === 'collection' && view.id === c.id} onClick={() => setView({ kind: 'collection', id: c.id })} />
              <div className="absolute right-1 top-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownTrigger asChild>
                    <IconButton label={`Options for ${c.name}`} size="sm">
                      <MoreHorizontal size={14} />
                    </IconButton>
                  </DropdownTrigger>
                  <DropdownContent align="start">
                    <DropdownItem icon={<Pencil size={14} />} onSelect={() => setCollectionDialog({ mode: 'rename', collection: c })}>
                      Rename
                    </DropdownItem>
                    <DropdownItem
                      icon={<Trash2 size={14} />}
                      danger
                      onSelect={async () => {
                        const ok = await confirm({ title: `Delete “${c.name}”?`, message: 'Screenshots in it stay in your library.', confirmLabel: 'Delete collection', danger: true });
                        if (ok) {
                          await deleteCollection(c.id);
                          if (view.kind === 'collection' && view.id === c.id) setView({ kind: 'all' });
                        }
                      }}
                    >
                      Delete collection
                    </DropdownItem>
                  </DropdownContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto space-y-3 p-4">
          <StorageMeter used={stats?.usage ?? stats?.imageBytes ?? 0} count={stats?.count ?? 0} quota={stats?.quota} />
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start" icon={<SettingsIcon size={15} />} onClick={() => navigate('/settings')}>
              Settings
            </Button>
            <Button variant="ghost" size="sm" icon={<Sparkles size={15} />} onClick={() => navigate('/welcome')} aria-label="Welcome guide" title="Welcome guide" />
          </div>
          <Credits align="start" className="px-1" />
        </div>
      </aside>

      {/* Main */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="fr-glass z-20 flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
          <div className="mr-1 flex min-w-0 shrink-0 items-baseline gap-2">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">{viewTitle}</h1>
            {items && <span className="text-[13px] tabular-nums text-fg-subtle">{visible.length}</span>}
          </div>
          <div className="relative ml-auto w-full min-w-[160px] max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <Input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, site, tag…" aria-label="Search screenshots" className="pl-9 pr-9" />
            {search ? (
              <button type="button" aria-label="Clear search" className="fr-press absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            ) : (
              <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2">/</Kbd>
            )}
          </div>
          <Select aria-label="Filter by website" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-40">
            <option value="">All websites</option>
            {domains.map((d) => (
              <option key={d.domain} value={d.domain}>
                {d.domain} ({d.count})
              </option>
            ))}
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-36">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="largest">Largest first</option>
          </Select>
          <div className="flex rounded-[11px] border border-border bg-surface-2 p-[3px]">
            <IconButton label="Grid view" size="sm" active={layout === 'grid'} onClick={() => void updateSettings({ library: { view: 'grid' } })}>
              <Grid2x2 size={15} />
            </IconButton>
            <IconButton label="List view" size="sm" active={layout === 'list'} onClick={() => void updateSettings({ library: { view: 'list' } })}>
              <List size={15} />
            </IconButton>
          </div>
          <IconButton label={`Theme: ${settings.theme === 'system' ? 'System' : settings.theme === 'light' ? 'Light' : 'Dark'} (switch to ${nextTheme})`} onClick={() => void updateSettings({ theme: nextTheme })}>
            {themeIcon}
          </IconButton>
          <Button icon={<ImagePlus size={16} />} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <button
            type="button"
            onClick={() => navigate('/record')}
            data-testid="library-record"
            className="fr-rec-btn fr-press inline-flex h-9 shrink-0 items-center gap-2 rounded-[11px] px-3.5 text-sm font-semibold"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_3px_rgb(255_255_255/0.25)]" /> Record
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              if (files.length) void importFiles(files);
            }}
          />
        </header>

        <div className="fr-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-6" data-testid="library-scroll">
          {error && <p className="mb-4 text-sm text-danger">{error}</p>}
          {review.visible && (
            <div className="mb-5">
              <ReviewCard controls={review} />
            </div>
          )}
          {items === null ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-5" aria-hidden>
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="fr-card overflow-hidden">
                  <div className="fr-skeleton aspect-[4/3]" />
                  <div className="space-y-2 p-3.5">
                    <div className="fr-skeleton h-3 w-3/4 rounded" />
                    <div className="fr-skeleton h-2.5 w-1/2 rounded" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Camera size={28} />}
              title="No captures yet"
              action={
                <>
                  <Button variant="primary" icon={<Video size={16} />} onClick={() => navigate('/record')}>
                    Record your screen
                  </Button>
                  <Button icon={<ImagePlus size={16} />} onClick={() => fileRef.current?.click()}>
                    Import an image
                  </Button>
                  <Button icon={<Sparkles size={16} />} onClick={() => navigate('/welcome')}>
                    How to capture
                  </Button>
                </>
              }
            >
              <p>
                Click the FrameShot icon in the Chrome toolbar, right-click any page, or press <Kbd>Alt</Kbd> <Kbd>Shift</Kbd> <Kbd>F</Kbd> to capture a full page.
              </p>
              <p className="mt-2">Screen recordings, pasted and dropped images land here too.</p>
            </EmptyState>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={view.kind === 'recordings' ? <Video size={26} /> : <Search size={26} />}
              title={view.kind === 'recordings' && !search && !domain ? 'No recordings yet' : 'Nothing matches'}
              action={
                view.kind === 'recordings' && !search && !domain ? (
                  <Button variant="primary" icon={<Video size={16} />} onClick={() => navigate('/record')}>
                    Record your screen
                  </Button>
                ) : undefined
              }
            >
              {view.kind === 'duplicates'
                ? 'No visually identical screenshots were found.'
                : view.kind === 'recordings' && !search && !domain
                  ? 'Record a tab, a window or your whole screen, with sound and an optional camera bubble.'
                  : 'Try a different search or filter.'}
            </EmptyState>
          ) : layout === 'grid' ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-5" aria-label="Screenshots">
              {visible.slice(0, limit).map((item, index) => (
                <li key={item.id} className="fr-stagger" style={{ '--i': index % PAGE } as CSSProperties}>
                  <Card
                    item={item}
                    selected={selected.has(item.id)}
                    selecting={selected.size > 0}
                    onToggle={(range) => toggle(item.id, range)}
                    onCopy={() => void copy(item)}
                    onDownload={() => void download(item)}
                    menu={<ItemMenu item={item} onDownload={download} onCopy={copy} onDetails={setDetails} onDelete={(i) => void remove([i.id])} />}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ListView items={visible.slice(0, limit)} selected={selected} onToggle={toggle} renderMenu={(item) => <ItemMenu item={item} onDownload={download} onCopy={copy} onDetails={setDetails} onDelete={(i) => void remove([i.id])} />} />
          )}
          {visible.length > limit && <LoadMore onVisible={() => setLimit((l) => l + PAGE)} />}
        </div>

        {/* Floating bulk-action bar */}
        {selected.size > 0 && (
          <div
            className="fr-glass absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-[18px] border border-border p-2 pl-4 shadow-pop"
            style={{ animation: 'fr-slide-up 420ms var(--fr-ease)' }}
          >
            <span className="mr-1 text-[13px] font-semibold">{selected.size} selected</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(visible.map((i) => i.id)))}>
              Select all {visible.length}
            </Button>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button size="sm" variant="primary" icon={<Download size={14} />} onClick={() => setBulkExport(true)}>
              Export
            </Button>
            {selected.size === 2 && !selectedItems.some(isRecording) && (
              <Button size="sm" icon={<Columns2 size={14} />} onClick={() => navigate(`/compare/${[...selected].map(encodeURIComponent).join('/')}`)}>
                Compare
              </Button>
            )}
            <Button size="sm" icon={<Folder size={14} />} onClick={() => setMoveOpen(true)}>
              Move to…
            </Button>
            <Button size="sm" icon={<Star size={14} />} onClick={() => void updateItems([...selected], { favorite: !selectedItems.every((i) => i.favorite) })}>
              {selectedItems.every((i) => i.favorite) ? 'Unfavorite' : 'Favorite'}
            </Button>
            <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => void remove([...selected])}>
              Delete
            </Button>
            <IconButton label="Clear selection" size="sm" onClick={() => setSelected(new Set())}>
              <X size={15} />
            </IconButton>
          </div>
        )}

        {busy && (
          <div className="fr-glass pointer-events-none absolute bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-full border border-border px-4 py-2.5 text-[13px] font-medium shadow-pop fr-animate-in">
            <Spinner className="text-primary" /> {busy}
          </div>
        )}
        {dragOver && (
          <div className="pointer-events-none absolute inset-4 z-40 flex flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-primary/60 bg-primary-soft/70 text-primary-soft-fg backdrop-blur-sm fr-fade">
            <ImagePlus size={32} className="fr-float" />
            <span className="text-sm font-semibold">Drop images to import them</span>
          </div>
        )}
      </main>

      {details && <DetailsDialog item={items?.find((i) => i.id === details.id) ?? details} collections={collections} onClose={() => setDetails(null)} />}
      <ExportDialog open={bulkExport} onOpenChange={setBulkExport} settings={settings} onExport={runBulkExport} title={`Export ${selected.size} ${nounFor(selectedItems, selected.size)}`} count={selected.size} />
      <CollectionDialog state={collectionDialog} onClose={() => setCollectionDialog(null)} />
      <MoveDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        collections={collections}
        onMove={async (collectionId) => {
          await updateItems([...selected], { collectionId });
          toast.success(collectionId ? 'Moved to collection.' : 'Removed from collection.');
          setMoveOpen(false);
        }}
        onCreate={() => {
          setMoveOpen(false);
          setCollectionDialog({ mode: 'create' });
        }}
      />
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }: { icon: ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'fr-press group relative flex h-9 w-full items-center gap-2.5 rounded-[11px] px-2.5 text-left text-[13px] font-medium transition-colors duration-200',
        active ? 'bg-surface-solid text-fg shadow-card' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      <span className={cx('shrink-0 transition-colors', active ? 'text-primary' : 'text-fg-subtle group-hover:text-fg-muted')}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg-subtle')}>{count}</span>}
      {active && <span className="fr-accent-bg absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full" aria-hidden />}
    </button>
  );
}

function StorageMeter({ used, count, quota }: { used: number; count: number; quota?: number }) {
  const pct = quota ? Math.min(100, (used / quota) * 100) : 0;
  return (
    <div className="rounded-[14px] border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-[12px] font-medium text-fg-muted">
        <HardDrive size={14} className="text-primary" /> Stored on this device
      </div>
      <div className="mt-1.5 text-[13px] font-semibold tabular-nums">
        {formatBytes(used)} · {count} {count === 1 ? 'item' : 'items'}
      </div>
      {quota ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Storage used">
          <div className="fr-accent-bg h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function useThumbUrl(item: LibraryItem, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let revoked = false;
    let objectUrl: string | null = null;
    void getThumb(item.id).then((blob) => {
      if (revoked || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.updatedAt, enabled]);
  return url;
}

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setInView(true), { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView];
}

function Card({
  item,
  selected,
  selecting,
  onToggle,
  onCopy,
  onDownload,
  menu,
}: {
  item: LibraryItem;
  selected: boolean;
  selecting: boolean;
  onToggle: (range: boolean) => void;
  onCopy: () => void;
  onDownload: () => void;
  menu: ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const thumb = useThumbUrl(item, inView);
  const [loaded, setLoaded] = useState(false);
  const [pop, setPop] = useState(false);
  const video = isRecording(item);
  const open = () => openItem(item);
  const w = item.editedWidth ?? item.width;
  const h = item.editedHeight ?? item.height;
  return (
    <div
      ref={ref}
      data-testid="library-card"
      data-id={item.id}
      data-kind={item.kind}
      className={cx('fr-card fr-lift group overflow-hidden', selected && '!border-primary ring-[3px] ring-primary/25')}
    >
      <div className={cx('relative aspect-[4/3] overflow-hidden', !loaded && 'fr-skeleton')}>
        <button
          type="button"
          className="fr-checker block h-full w-full overflow-hidden"
          onClick={(e) => (selecting || e.shiftKey || e.metaKey || e.ctrlKey ? onToggle(e.shiftKey) : open())}
          aria-label={`Open ${item.name}`}
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              onLoad={() => setLoaded(true)}
              data-loaded={loaded}
              className={cx('fr-img-fade h-full w-full object-cover group-hover:scale-[1.04]', video ? 'object-center' : 'object-top')}
              draggable={false}
            />
          ) : video ? (
            <span className="fr-stage flex h-full w-full items-center justify-center text-white/60">
              <Video size={26} />
            </span>
          ) : null}
        </button>
        {video && (
          <>
            <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-pop ring-1 ring-white/30 backdrop-blur-md transition-transform duration-300 group-hover:scale-110" style={{ transitionTimingFunction: 'var(--fr-ease-spring)' }} aria-hidden>
              <Play size={20} fill="currentColor" className="translate-x-[1px]" />
            </span>
            <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur" data-testid="card-duration">
              {formatDuration(item.durationMs ?? 0)}
            </span>
          </>
        )}
        {/* Hover veil + quick actions */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-2.5 right-2.5 flex translate-y-2 gap-1.5 opacity-0 transition-all duration-300 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
          {!video && (
            <button type="button" aria-label={`Copy ${item.name}`} title="Copy image" onClick={onCopy} className="fr-press flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/90 text-[#111118] shadow-card backdrop-blur hover:bg-white">
              <ClipboardCopy size={15} />
            </button>
          )}
          <button type="button" aria-label={`Download ${item.name}`} title={video ? 'Download video' : 'Download'} onClick={onDownload} className="fr-press flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/90 text-[#111118] shadow-card backdrop-blur hover:bg-white">
            <Download size={15} />
          </button>
        </div>
        <button
          type="button"
          aria-label={selected ? `Deselect ${item.name}` : `Select ${item.name}`}
          aria-pressed={selected}
          onClick={(e) => onToggle(e.shiftKey)}
          className={cx(
            'fr-press absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-[9px] shadow-card backdrop-blur transition-all duration-200',
            selected ? 'fr-accent-bg text-white opacity-100' : 'bg-white/90 text-[#111118]',
            selected || selecting ? 'opacity-100' : 'opacity-0 focus:opacity-100 group-hover:opacity-100',
          )}
        >
          {selected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
        <button
          type="button"
          aria-label={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={item.favorite}
          onClick={() => {
            setPop(true);
            void updateItem(item.id, { favorite: !item.favorite });
          }}
          onAnimationEnd={() => setPop(false)}
          className={cx(
            'fr-press absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-[9px] bg-white/90 shadow-card backdrop-blur transition-opacity duration-200',
            item.favorite ? 'text-amber-500 opacity-100' : 'text-[#55556a] opacity-0 focus:opacity-100 group-hover:opacity-100',
          )}
        >
          <Star size={15} fill={item.favorite ? 'currentColor' : 'none'} className={pop ? 'fr-star-pop' : undefined} />
        </button>
      </div>
      <div className="flex items-start gap-1 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-fg" title={item.name}>
            {item.name}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-fg-subtle">
            {[item.source?.domain || kindLabel(item), formatRelative(item.createdAt)].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums text-fg-subtle">
            {video ? `${formatBytes(item.byteSize)} · ${h}p` : formatDimensions(w, h)}
            {video && <Badge tone="primary">{item.mimeType.includes('mp4') ? 'MP4' : 'WebM'}</Badge>}
            {item.hasEdits && <Badge tone="primary">Edited</Badge>}
            {item.group && (
              <Badge>
                Part {item.group.index + 1}/{item.group.count}
              </Badge>
            )}
            {item.partial && <Badge tone="warning">Partial</Badge>}
          </p>
        </div>
        {menu}
      </div>
    </div>
  );
}

function ListView({ items, selected, onToggle, renderMenu }: { items: LibraryItem[]; selected: Set<string>; onToggle: (id: string, range?: boolean) => void; renderMenu: (i: LibraryItem) => ReactNode }) {
  return (
    <div className="fr-card overflow-hidden">
      <table className="w-full border-separate border-spacing-0 text-[13px]" aria-label="Screenshots">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            <th className="w-12 border-b border-border py-3 pl-4 font-semibold">
              <span className="sr-only">Select</span>
            </th>
            <th className="border-b border-border py-3 font-semibold">Name</th>
            <th className="border-b border-border py-3 font-semibold">Website</th>
            <th className="border-b border-border py-3 font-semibold">Captured</th>
            <th className="border-b border-border py-3 text-right font-semibold">Size</th>
            <th className="w-12 border-b border-border py-3 pr-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <ListRow key={item.id} index={index} item={item} selected={selected.has(item.id)} onToggle={(r) => onToggle(item.id, r)} menu={renderMenu(item)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListRow({ item, selected, onToggle, menu, index }: { item: LibraryItem; selected: boolean; onToggle: (range: boolean) => void; menu: ReactNode; index: number }) {
  const [ref, inView] = useInView<HTMLTableRowElement>();
  const thumb = useThumbUrl(item, inView);
  return (
    <tr ref={ref} className={cx('fr-stagger group transition-colors hover:bg-surface-2', selected && 'bg-primary-soft')} style={{ '--i': index % PAGE } as CSSProperties} data-testid="library-row">
      <td className="border-b border-border py-2 pl-4">
        <input type="checkbox" aria-label={`Select ${item.name}`} checked={selected} onChange={(e) => onToggle((e.nativeEvent as MouseEvent).shiftKey)} className="h-4 w-4 rounded" />
      </td>
      <td className="border-b border-border py-2">
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => openItem(item)}>
          <span className="fr-checker relative h-11 w-16 shrink-0 overflow-hidden rounded-[9px] border border-border">
            {thumb && <img src={thumb} alt="" className={cx('h-full w-full object-cover', isRecording(item) ? 'object-center' : 'object-top')} />}
            {isRecording(item) && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white" aria-hidden>
                <Play size={14} fill="currentColor" />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 truncate font-semibold text-fg">
              {item.favorite && <Star size={12} className="shrink-0 text-amber-500" fill="currentColor" />}
              <span className="truncate">{item.name}</span>
            </span>
            <span className="block text-[11px] tabular-nums text-fg-subtle">
              {isRecording(item) ? `Recording · ${formatDuration(item.durationMs ?? 0)} · ${item.width}×${item.height}` : `${formatDimensions(item.editedWidth ?? item.width, item.editedHeight ?? item.height)} px`}
            </span>
          </span>
        </button>
      </td>
      <td className="border-b border-border py-2 text-fg-muted">{item.source?.domain ?? '—'}</td>
      <td className="border-b border-border py-2 text-fg-muted">{formatDate(item.createdAt)}</td>
      <td className="border-b border-border py-2 text-right tabular-nums text-fg-muted">{formatBytes(item.byteSize)}</td>
      <td className="border-b border-border py-2 pr-3 text-right">{menu}</td>
    </tr>
  );
}

function ItemMenu({ item, onDownload, onCopy, onDetails, onDelete }: { item: LibraryItem; onDownload: (i: LibraryItem) => void; onCopy: (i: LibraryItem) => void; onDetails: (i: LibraryItem) => void; onDelete: (i: LibraryItem) => void }) {
  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <IconButton label={`Actions for ${item.name}`} size="sm">
          <MoreHorizontal size={16} />
        </IconButton>
      </DropdownTrigger>
      <DropdownContent>
        {isRecording(item) ? (
          <>
            <DropdownItem icon={<Play size={14} />} onSelect={() => openItem(item)}>
              Play
            </DropdownItem>
            <DropdownItem icon={<Download size={14} />} onSelect={() => onDownload(item)}>
              Download video
            </DropdownItem>
          </>
        ) : (
          <>
            <DropdownItem icon={<Pencil size={14} />} onSelect={() => navigate(`/edit/${encodeURIComponent(item.id)}`)}>
              Open in editor
            </DropdownItem>
            <DropdownItem icon={<LayoutTemplate size={14} />} onSelect={() => navigate(`/compose/${encodeURIComponent(item.id)}`)}>
              Compose
            </DropdownItem>
            <DropdownItem icon={<ClipboardCopy size={14} />} onSelect={() => onCopy(item)}>
              Copy image
            </DropdownItem>
            <DropdownItem icon={<Download size={14} />} onSelect={() => onDownload(item)}>
              Download
            </DropdownItem>
          </>
        )}
        <DropdownItem icon={<Star size={14} />} onSelect={() => void updateItem(item.id, { favorite: !item.favorite })}>
          {item.favorite ? 'Remove from favorites' : 'Add to favorites'}
        </DropdownItem>
        <DropdownItem icon={<Info size={14} />} onSelect={() => onDetails(item)}>
          Details, rename & tags…
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem icon={<Trash2 size={14} />} danger onSelect={() => onDelete(item)}>
          Delete
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}

function LoadMore({ onVisible }: { onVisible: () => void }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  useEffect(() => {
    if (inView) onVisible();
  }, [inView, onVisible]);
  return (
    <div ref={ref} className="flex justify-center py-8 text-sm text-fg-subtle">
      <Spinner className="text-primary" />
    </div>
  );
}

function DetailsDialog({ item, collections, onClose }: { item: LibraryItem; collections: Collection[]; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [tags, setTags] = useState(item.tags.join(', '));
  const [collectionId, setCollectionId] = useState(item.collectionId ?? '');
  const save = async () => {
    const cleanTags = [...new Set(tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30).map((t) => t.slice(0, 40));
    await updateItem(item.id, { name: name.trim().slice(0, 200) || item.name, tags: cleanTags, collectionId: collectionId || null });
    toast.success('Saved.');
    onClose();
  };
  const row = (label: string, value: ReactNode) => (
    <>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="min-w-0 break-words text-fg-muted">{value}</dd>
    </>
  );
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={isRecording(item) ? 'Recording details' : 'Screenshot details'}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="fr-d-name">
          <Input id="fr-d-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Tags" htmlFor="fr-d-tags" hint="Separate tags with commas. Tags are searchable.">
          <Input id="fr-d-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, bug-report" />
        </Field>
        <Field label="Collection" htmlFor="fr-d-col">
          <Select id="fr-d-col" value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 rounded-xl bg-surface-2 p-3 text-[12px]">
          {row('Type', item.kind === 'capture' ? `Capture · ${item.mode ? CAPTURE_MODE_LABELS[item.mode] : ''}` : kindLabel(item))}
          {isRecording(item) && row('Length', formatDuration(item.durationMs ?? 0))}
          {isRecording(item) && row('Format', describeMimeType(item.mimeType))}
          {isRecording(item) && row('Sound', item.hasAudio ? 'Yes' : 'No sound')}
          {isRecording(item) && item.surface && row('Recorded', SURFACE_LABELS[item.surface])}
          {item.source?.url &&
            row(
              'Source',
              isSafeLink(item.source.url) ? (
                <a href={item.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {item.source.url.length > 90 ? `${item.source.url.slice(0, 90)}…` : item.source.url}
                </a>
              ) : (
                item.source.url
              ),
            )}
          {item.source?.title && row(isRecording(item) ? 'Shared tab' : 'Page title', item.source.title)}
          {row(isRecording(item) ? 'Recorded on' : 'Captured', formatDate(item.createdAt))}
          {row(isRecording(item) ? 'Video size' : 'Dimensions', `${formatDimensions(item.width, item.height)} px`)}
          {item.hasEdits && item.editedWidth && row('Edited size', `${formatDimensions(item.editedWidth, item.editedHeight ?? 0)} px`)}
          {row('Stored size', formatBytes(item.byteSize))}
          {item.scale && row('Pixel density', `${Math.round(item.scale * 100) / 100}× (device pixels per CSS pixel)`)}
          {item.group && row('Part', `${item.group.index + 1} of ${item.group.count}`)}
          {item.warnings.length > 0 && row('Notes', <ul className="list-disc pl-4">{item.warnings.map((w) => <li key={w}>{w}</li>)}</ul>)}
        </dl>
      </div>
    </Dialog>
  );
}

function CollectionDialog({ state, onClose }: { state: { mode: 'create' | 'rename'; collection?: Collection } | null; onClose: () => void }) {
  const [name, setName] = useState('');
  useEffect(() => setName(state?.collection?.name ?? ''), [state]);
  if (!state) return null;
  const submit = async () => {
    const n = name.trim().slice(0, 60);
    if (!n) return;
    await putCollection(state.collection ? { ...state.collection, name: n } : { id: newId(), name: n, createdAt: Date.now() });
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={state.mode === 'create' ? 'New collection' : 'Rename collection'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => void submit()}>
            {state.mode === 'create' ? 'Create' : 'Rename'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Name" htmlFor="fr-col-name">
          <Input id="fr-col-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Bug reports" />
        </Field>
      </form>
    </Dialog>
  );
}

function MoveDialog({ open, onOpenChange, collections, onMove, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; collections: Collection[]; onMove: (id: string | null) => void; onCreate: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Move to collection">
      <div className="space-y-1">
        {collections.map((c) => (
          <button key={c.id} type="button" onClick={() => onMove(c.id)} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-surface-2">
            <Folder size={15} className="text-fg-subtle" /> {c.name}
          </button>
        ))}
        <button type="button" onClick={() => onMove(null)} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-fg-muted hover:bg-surface-2">
          <X size={15} /> Remove from collection
        </button>
        <button type="button" onClick={onCreate} className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-primary hover:bg-surface-2">
          <FolderPlus size={15} /> New collection…
        </button>
      </div>
    </Dialog>
  );
}


function kindLabel(item: LibraryItem): string {
  switch (item.kind) {
    case 'import':
      return 'Imported image';
    case 'composition':
      return 'Composition';
    case 'recording':
      return 'Screen recording';
    case 'frame':
      return 'Frame from a recording';
    default:
      return '';
  }
}
