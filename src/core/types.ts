/**
 * Shared domain types used across the service worker, content agent, and UI.
 * Everything here must be structured-clone friendly (no class instances).
 */

export type CaptureMode = 'visible' | 'full' | 'area' | 'element' | 'scrollable';

export const CAPTURE_MODE_LABELS: Record<CaptureMode, string> = {
  visible: 'Visible area',
  full: 'Full page',
  area: 'Selected area',
  element: 'Element',
  scrollable: 'Scrolling area',
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ExportFormat = ImageFormat | 'pdf';

export const FORMAT_MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export const FORMAT_EXTENSION: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  pdf: 'pdf',
};

export interface CaptureSource {
  url: string;
  title: string;
  domain: string;
}

/** Library item metadata (the image bytes live in the `blobs` store). */
export interface LibraryItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  kind: 'capture' | 'import' | 'composition';
  mode?: CaptureMode;
  source?: CaptureSource;
  /** Original image pixel size. */
  width: number;
  height: number;
  /** Size of the edited result, when edits exist. */
  editedWidth?: number;
  editedHeight?: number;
  /** Byte size of the stored original image. */
  byteSize: number;
  mimeType: string;
  favorite: boolean;
  collectionId: string | null;
  tags: string[];
  hasEdits: boolean;
  /** Present when a page was too large and had to be split into parts. */
  group?: { id: string; index: number; count: number };
  /** Honest notes about the capture (e.g. page changed height, stopped early). */
  warnings: string[];
  /** True when the capture intentionally does not contain the whole target. */
  partial?: boolean;
  /** Device pixels per CSS pixel at capture time. */
  scale?: number;
  /** 64-bit difference hash as 16 hex chars, for duplicate detection. */
  dhash?: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
}

export type CaptureErrorCode =
  | 'restricted-page'
  | 'no-tab'
  | 'busy'
  | 'permission'
  | 'tab-changed'
  | 'cancelled'
  | 'canvas-limit'
  | 'quota'
  | 'incomplete'
  | 'unknown';

export type CapturePhase =
  | 'idle'
  | 'waiting'
  | 'selecting'
  | 'preparing'
  | 'loading'
  | 'capturing'
  | 'stitching'
  | 'saving'
  | 'done'
  | 'error'
  | 'cancelled';

export interface CaptureStatus {
  phase: CapturePhase;
  mode?: CaptureMode;
  /** 0..1 when known. */
  progress?: number;
  frame?: number;
  frames?: number;
  message?: string;
  errorCode?: CaptureErrorCode;
  /** Library item ids created by a finished capture. */
  itemIds?: string[];
  warnings?: string[];
  /** Whether the "stop & save" action makes sense right now. */
  canStop?: boolean;
  updatedAt: number;
}
