/// <reference lib="webworker" />
/** Encodes GIFs off the main thread so the Studio stays smooth. */
import { buildPalette, GifBuilder, type GifBuildOptions } from './gif';

export type GifWorkerRequest =
  | { type: 'start'; options: GifBuildOptions; samples: ArrayBuffer[] }
  | { type: 'frame'; seq: number; rgba: ArrayBuffer; delayCs: number }
  | { type: 'finish' };

export type GifWorkerResponse = { type: 'ready' } | { type: 'frame-done'; seq: number } | { type: 'done'; bytes: ArrayBuffer; frames: number; merged: number } | { type: 'error'; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let builder: GifBuilder | null = null;

const reply = (msg: GifWorkerResponse, transfer: Transferable[] = []) => scope.postMessage(msg, transfer);

scope.onmessage = (e: MessageEvent<GifWorkerRequest>) => {
  const m = e.data;
  try {
    if (m.type === 'start') {
      builder = new GifBuilder(m.options, buildPalette(m.samples.map((b) => new Uint8ClampedArray(b))));
      reply({ type: 'ready' });
    } else if (m.type === 'frame') {
      if (!builder) throw new Error('The GIF encoder was not started.');
      builder.addFrame(new Uint8ClampedArray(m.rgba), m.delayCs);
      reply({ type: 'frame-done', seq: m.seq });
    } else if (m.type === 'finish') {
      if (!builder) throw new Error('The GIF encoder was not started.');
      const { frames, merged } = builder.stats;
      const bytes = builder.finish();
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      reply({ type: 'done', bytes: buffer, frames, merged }, [buffer]);
      builder = null;
    }
  } catch (err) {
    reply({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
