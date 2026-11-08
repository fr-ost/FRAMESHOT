/** Types for gifenc (MIT, https://github.com/mattdesl/gifenc), which ships none. */
declare module 'gifenc' {
  export type Palette = number[][];
  export type ColorFormat = 'rgb565' | 'rgb444' | 'rgba4444';
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: ColorFormat; oneBitAlpha?: boolean | number; clearAlpha?: boolean; clearAlphaThreshold?: number; clearAlphaColor?: number },
  ): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: ColorFormat): Uint8Array;
  export interface FrameOptions {
    palette?: Palette | null;
    /** Delay in milliseconds (stored as centiseconds). */
    delay?: number;
    /** -1 = play once, 0 = loop forever, > 0 = extra loops. Written with the first frame. */
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    /** GIF disposal method (1 = leave the frame in place). */
    dispose?: number;
    colorDepth?: number;
    first?: boolean;
  }
  export interface GIFEncoderStream {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }
  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): GIFEncoderStream;
}
