/**
 * Editor document model.
 *
 * The original screenshot is never modified. A document describes how to
 * render it: a crop (in source pixels), an orientation (rotation/flip), an
 * output size (resize), and a z-ordered list of objects in *output*
 * coordinates. Privacy effects (blur/pixelate/redact) are objects too, so they
 * remain editable until export, where they are flattened into the pixels.
 */
import type { Rect, Size } from '../../core/types';

/** 2×2 integer matrix (a b; c d): x' = a·x + b·y, y' = c·x + d·y. */
export type Orientation = readonly [number, number, number, number];
export const IDENTITY: Orientation = [1, 0, 0, 1];

export type FontKey = 'sans' | 'serif' | 'mono' | 'rounded';
export const FONT_STACKS: Record<FontKey, string> = {
  sans: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "ui-serif, Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace",
  rounded: "ui-rounded, 'SF Pro Rounded', 'Nunito', 'Segoe UI', system-ui, sans-serif",
};
export const FONT_LABELS: Record<FontKey, string> = { sans: 'Sans', serif: 'Serif', mono: 'Mono', rounded: 'Rounded' };

export type SymbolKey = 'check' | 'cross' | 'question' | 'warning' | 'info' | 'star' | 'heart';
export const SYMBOL_LABELS: Record<SymbolKey, string> = {
  check: 'Check',
  cross: 'Cross',
  question: 'Question',
  warning: 'Warning',
  info: 'Info',
  star: 'Star',
  heart: 'Heart',
};

interface Base {
  id: string;
  opacity: number;
}

export interface ArrowObject extends Base {
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  heads: 'end' | 'both';
}

export interface LineObject extends Base {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  dashed: boolean;
}

export interface RectObject extends Base {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  strokeWidth: number;
  fill: string | null;
  radius: number;
}

export interface EllipseObject extends Base {
  type: 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  strokeWidth: number;
  fill: string | null;
}

export interface PenObject extends Base {
  type: 'pen' | 'highlighter';
  /** Flat list of x,y pairs. */
  points: number[];
  color: string;
  width: number;
}

export interface TextObject extends Base {
  type: 'text';
  /** Top-left of the text box. */
  x: number;
  y: number;
  text: string;
  font: FontKey;
  size: number;
  color: string;
  bold: boolean;
  background: string | null;
  outline: boolean;
}

export interface MarkerObject extends Base {
  type: 'marker';
  /** Center. */
  x: number;
  y: number;
  n: number;
  size: number;
  fill: string;
  textColor: string;
}

export interface SymbolObject extends Base {
  type: 'symbol';
  /** Center. */
  x: number;
  y: number;
  size: number;
  symbol: SymbolKey;
  color: string;
}

export interface BlurObject extends Base {
  type: 'blur';
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
}

export interface PixelateObject extends Base {
  type: 'pixelate';
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
}

export interface RedactObject extends Base {
  type: 'redact';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export type EffectObject = BlurObject | PixelateObject | RedactObject;
export type AnnotationObject =
  | ArrowObject
  | LineObject
  | RectObject
  | EllipseObject
  | PenObject
  | TextObject
  | MarkerObject
  | SymbolObject;
export type EditorObject = AnnotationObject | EffectObject;
export type ObjectType = EditorObject['type'];

export const EFFECT_TYPES: ReadonlySet<ObjectType> = new Set(['blur', 'pixelate', 'redact']);
export const isEffect = (o: EditorObject): o is EffectObject => EFFECT_TYPES.has(o.type);

export interface EditorDoc {
  version: 1;
  source: Size;
  crop: Rect;
  orientation: Orientation;
  output: Size;
  objects: EditorObject[];
}

export function createDoc(width: number, height: number): EditorDoc {
  return {
    version: 1,
    source: { width, height },
    crop: { x: 0, y: 0, w: width, h: height },
    orientation: IDENTITY,
    output: { width, height },
    objects: [],
  };
}

export const OBJECT_LABELS: Record<ObjectType, string> = {
  arrow: 'Arrow',
  line: 'Line',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  pen: 'Pen',
  highlighter: 'Highlight',
  text: 'Text',
  marker: 'Step marker',
  symbol: 'Symbol',
  blur: 'Blur',
  pixelate: 'Pixelate',
  redact: 'Redaction',
};

/** Validates a stored document (never trust persisted data blindly). */
export function isValidDoc(value: unknown, source: Size): value is EditorDoc {
  if (!value || typeof value !== 'object') return false;
  const d = value as EditorDoc;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  return (
    d.version === 1 &&
    d.source?.width === source.width &&
    d.source?.height === source.height &&
    finite(d.crop?.x) &&
    finite(d.crop?.w) &&
    Array.isArray(d.orientation) &&
    d.orientation.length === 4 &&
    finite(d.output?.width) &&
    d.output.width >= 1 &&
    d.output.height >= 1 &&
    Array.isArray(d.objects)
  );
}
