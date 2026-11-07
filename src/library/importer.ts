/** Importing local image files into the library (no network involved). */
import { newId } from '../core/format';
import type { LibraryItem } from '../core/types';
import { addItem } from '../db/db';
import { canvasToBlob, createCanvas, dHash, get2d, makeThumbnail } from '../imaging/image-io';

const NATIVE = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMPORT_BYTES = 200 * 1024 * 1024;

export async function importImageFile(file: File | Blob, name?: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(`${name ?? 'This file'} is not an image.`);
  if (file.size > MAX_IMPORT_BYTES) throw new Error(`${name ?? 'This image'} is larger than 200 MB.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${name ?? 'This image'} could not be read.`);
  }
  const canvas = createCanvas(bitmap.width, bitmap.height);
  get2d(canvas).drawImage(bitmap, 0, 0);
  bitmap.close();
  // Keep the original bytes for common formats; normalize others to PNG.
  const blob = NATIVE.has(file.type) ? file : await canvasToBlob(canvas, 'png');
  const thumb = await makeThumbnail(canvas);
  const now = Date.now();
  const id = newId();
  const baseName = (name ?? 'Imported image').replace(/\.[a-z0-9]+$/i, '').slice(0, 150) || 'Imported image';
  const item: LibraryItem = {
    id,
    name: baseName,
    createdAt: now,
    updatedAt: now,
    kind: 'import',
    width: canvas.width,
    height: canvas.height,
    byteSize: blob.size,
    mimeType: blob.type || 'image/png',
    favorite: false,
    collectionId: null,
    tags: [],
    hasEdits: false,
    warnings: [],
    dhash: dHash(canvas),
  };
  await addItem(item, blob, thumb);
  return id;
}
