/**
 * High-level export operations shared by the editor, library and composer:
 * load an item with its edits, render it flattened, encode it, name it.
 */
import { buildFilename, uniquifyNames, withFolder } from '../core/filename';
import { qualityFor, type Settings } from '../core/settings';
import type { ExportFormat, ImageFormat, LibraryItem } from '../core/types';
import { getDoc, getItem, getOriginal } from '../db/db';
import { createBaseImage, disposeBaseImage, type BaseImage } from '../editor/render/base';
import { renderFlattened } from '../editor/render/flatten';
import { createDoc, isValidDoc, type EditorDoc } from '../editor/model/types';
import { blobToBitmap, canvasToBlob } from '../imaging/image-io';
import { canvasesToPdf } from './pdf';
import { createZip } from './zip';

export interface LoadedItem {
  item: LibraryItem;
  base: BaseImage;
  doc: EditorDoc;
}

export async function loadItem(id: string): Promise<LoadedItem> {
  const item = await getItem(id);
  if (!item) throw new Error('This screenshot is no longer in your library.');
  const blob = await getOriginal(id);
  if (!blob) throw new Error('The image data for this screenshot is missing.');
  const bitmap = await blobToBitmap(blob);
  const base = await createBaseImage(bitmap);
  const stored = await getDoc(id);
  const doc = stored && isValidDoc(stored.doc, { width: base.width, height: base.height }) ? stored.doc : createDoc(base.width, base.height);
  return { item, base, doc };
}

export function filenameFor(item: LibraryItem, settings: Settings, format: ExportFormat | 'zip', size?: { width: number; height: number }): string {
  return buildFilename(
    settings.filenameTemplate,
    {
      date: new Date(item.createdAt),
      domain: item.source?.domain,
      title: item.source?.title,
      mode: item.mode,
      width: size?.width ?? item.editedWidth ?? item.width,
      height: size?.height ?? item.editedHeight ?? item.height,
      name: item.name,
    },
    format,
  );
}

export function pdfOptions(settings: Settings, item?: LibraryItem, compact = false) {
  return {
    pageSize: settings.pdf.pageSize,
    marginPt: settings.pdf.marginPt,
    pxPerPt: item?.scale && item.scale > 0 ? item.scale : 1,
    compact,
    jpegQuality: settings.jpegQuality,
    title: item?.name,
  };
}

export async function encodeCanvas(
  canvas: OffscreenCanvas,
  format: ExportFormat,
  settings: Settings,
  opts: { item?: LibraryItem; compactPdf?: boolean; quality?: number } = {},
): Promise<Blob> {
  if (format === 'pdf') return canvasesToPdf([{ canvas }], pdfOptions(settings, opts.item, opts.compactPdf));
  return canvasToBlob(canvas, format, opts.quality ?? qualityFor(settings, format as ImageFormat));
}

/** Renders one library item (with its edits) to an encoded file. */
export async function exportItem(id: string, format: ExportFormat, settings: Settings, opts: { compactPdf?: boolean; quality?: number } = {}) {
  const loaded = await loadItem(id);
  try {
    const canvas = renderFlattened(loaded.doc, loaded.base);
    const blob = await encodeCanvas(canvas, format, settings, { item: loaded.item, ...opts });
    return { blob, filename: filenameFor(loaded.item, settings, format, { width: canvas.width, height: canvas.height }), item: loaded.item };
  } finally {
    disposeBaseImage(loaded.base);
  }
}

/** Renders a flattened, possibly scaled canvas for an item (composer, thumbnails). */
export async function renderItemCanvas(id: string, scale = 1): Promise<{ canvas: OffscreenCanvas; item: LibraryItem }> {
  const loaded = await loadItem(id);
  try {
    return { canvas: renderFlattened(loaded.doc, loaded.base, { scale }), item: loaded.item };
  } finally {
    disposeBaseImage(loaded.base);
  }
}

/** Bulk export: one ZIP of images, or one combined PDF. */
export async function exportMany(
  ids: string[],
  format: ExportFormat,
  settings: Settings,
  onProgress?: (done: number, total: number) => void,
): Promise<{ blob: Blob; filename: string }> {
  const stamp = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const baseName = `frameshot-${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}-${ids.length}-screenshots`;
  if (format === 'pdf') {
    const canvases: { canvas: OffscreenCanvas; pxPerPt?: number }[] = [];
    for (let i = 0; i < ids.length; i++) {
      const { canvas, item } = await renderItemCanvas(ids[i]);
      canvases.push({ canvas, pxPerPt: item.scale && item.scale > 0 ? item.scale : 1 });
      onProgress?.(i + 1, ids.length);
    }
    const blob = await canvasesToPdf(canvases, { ...pdfOptions(settings), title: `${ids.length} screenshots` });
    return { blob, filename: withFolder(settings.downloadFolder, `${baseName}.pdf`) };
  }
  const files: { name: string; data: Uint8Array; date: Date }[] = [];
  for (let i = 0; i < ids.length; i++) {
    const { blob, filename, item } = await exportItem(ids[i], format, settings);
    files.push({ name: filename, data: new Uint8Array(await blob.arrayBuffer()), date: new Date(item.createdAt) });
    onProgress?.(i + 1, ids.length);
  }
  const names = uniquifyNames(files.map((f) => f.name));
  const zip = createZip(files.map((f, i) => ({ ...f, name: names[i] })));
  return { blob: new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), filename: withFolder(settings.downloadFolder, `${baseName}.zip`) };
}
