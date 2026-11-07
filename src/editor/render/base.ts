/**
 * The original screenshot as drawable tiles. Very large captures (e.g. long
 * full-page screenshots) are split into overlapping tiles so drawing stays
 * fast and within GPU texture limits. Tiles overlap by 2px so anti-aliased
 * tile edges never produce visible seams under scaling.
 */
import type { Rect } from '../../core/types';
import type { Ctx2D } from '../../imaging/image-io';
import { applyMatrix, invertMatrix, type Matrix } from '../model/transform';

export interface Tile {
  x: number;
  y: number;
  w: number;
  h: number;
  bitmap: ImageBitmap;
}

export interface BaseImage {
  width: number;
  height: number;
  tiles: Tile[];
}

const TILE = 2048;
const OVERLAP = 2;
const TILE_THRESHOLD = 4096;

export async function createBaseImage(bitmap: ImageBitmap): Promise<BaseImage> {
  const { width, height } = bitmap;
  if (width <= TILE_THRESHOLD && height <= TILE_THRESHOLD) {
    return { width, height, tiles: [{ x: 0, y: 0, w: width, h: height, bitmap }] };
  }
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y += TILE) {
    for (let x = 0; x < width; x += TILE) {
      const w = Math.min(TILE + OVERLAP, width - x);
      const h = Math.min(TILE + OVERLAP, height - y);
      tiles.push({ x, y, w, h, bitmap: await createImageBitmap(bitmap, x, y, w, h) });
    }
  }
  bitmap.close();
  return { width, height, tiles };
}

export function disposeBaseImage(base: BaseImage): void {
  for (const t of base.tiles) t.bitmap.close();
  base.tiles = [];
}

/**
 * Draws the base image through the document matrix. `visible` (document
 * coords) lets the view skip tiles that are off-screen.
 */
export function drawBase(ctx: Ctx2D, base: BaseImage, matrix: Matrix, visible?: Rect): void {
  let srcVisible: Rect | null = null;
  if (visible) {
    const inv = invertMatrix(matrix);
    const pts = [
      applyMatrix(inv, { x: visible.x, y: visible.y }),
      applyMatrix(inv, { x: visible.x + visible.w, y: visible.y }),
      applyMatrix(inv, { x: visible.x, y: visible.y + visible.h }),
      applyMatrix(inv, { x: visible.x + visible.w, y: visible.y + visible.h }),
    ];
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    srcVisible = { x: Math.min(...xs) - 4, y: Math.min(...ys) - 4, w: Math.max(...xs) - Math.min(...xs) + 8, h: Math.max(...ys) - Math.min(...ys) + 8 };
  }
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
  for (const t of base.tiles) {
    if (
      srcVisible &&
      (t.x > srcVisible.x + srcVisible.w || t.x + t.w < srcVisible.x || t.y > srcVisible.y + srcVisible.h || t.y + t.h < srcVisible.y)
    ) {
      continue;
    }
    ctx.drawImage(t.bitmap, t.x, t.y, t.w, t.h);
  }
  ctx.restore();
}
