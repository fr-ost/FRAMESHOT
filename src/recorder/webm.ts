/**
 * WebM duration repair.
 *
 * MediaRecorder writes WebM as a live stream: the Segment has an "unknown"
 * size and the Info element has no Duration. Players then show no length and
 * cannot seek reliably. Once a recording is finished we know its length, so we
 * add a Duration element to Info. Only the first bytes of the file (the
 * header, which MediaRecorder emits in its first chunk) are rewritten.
 *
 * EBML basics: every element is ID (1–4 bytes) + size (1–8 byte vint) + data.
 */

const ID_EBML = 0x1a45dfa3;
const ID_SEGMENT = 0x18538067;
const ID_SEEKHEAD = 0x114d9b74;
const ID_INFO = 0x1549a966;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;
const ID_CLUSTER = 0x1f43b675;

interface Element {
  id: number;
  start: number;
  sizeStart: number;
  sizeLength: number;
  size: number;
  unknown: boolean;
  dataStart: number;
}

function readId(b: Uint8Array, pos: number): { id: number; length: number } | null {
  const first = b[pos];
  if (first === undefined || first === 0) return null;
  let length = 1;
  let mask = 0x80;
  while (length <= 4 && !(first & mask)) {
    mask >>= 1;
    length++;
  }
  if (length > 4 || pos + length > b.length) return null;
  let id = 0;
  for (let i = 0; i < length; i++) id = id * 256 + b[pos + i];
  return { id, length };
}

function readSize(b: Uint8Array, pos: number): { value: number; length: number; unknown: boolean } | null {
  const first = b[pos];
  if (first === undefined || first === 0) return null;
  let length = 1;
  let mask = 0x80;
  while (!(first & mask)) {
    mask >>= 1;
    length++;
  }
  if (pos + length > b.length) return null;
  let value = first & (mask - 1);
  let allOnes = value === mask - 1;
  for (let i = 1; i < length; i++) {
    value = value * 256 + b[pos + i];
    if (b[pos + i] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: allOnes };
}

function readElement(b: Uint8Array, pos: number): Element | null {
  const id = readId(b, pos);
  if (!id) return null;
  const size = readSize(b, pos + id.length);
  if (!size) return null;
  return {
    id: id.id,
    start: pos,
    sizeStart: pos + id.length,
    sizeLength: size.length,
    size: size.value,
    unknown: size.unknown,
    dataStart: pos + id.length + size.length,
  };
}

/** Encodes an element size as a vint of exactly `length` bytes (null if it does not fit). */
export function encodeSize(value: number, length: number): Uint8Array | null {
  if (length < 1 || length > 8 || value < 0 || value > 2 ** (7 * length) - 2) return null;
  const out = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = v % 256;
    v = Math.floor(v / 256);
  }
  out[0] |= 0x80 >> (length - 1);
  return out;
}

function minimalSizeLength(value: number): number {
  for (let len = 1; len <= 8; len++) if (value <= 2 ** (7 * len) - 2) return len;
  return 8;
}

function readUint(b: Uint8Array, start: number, size: number): number {
  let v = 0;
  for (let i = 0; i < size; i++) v = v * 256 + b[start + i];
  return v;
}

function readFloat(b: Uint8Array, start: number, size: number): number | null {
  const view = new DataView(b.buffer, b.byteOffset + start, size);
  if (size === 8) return view.getFloat64(0, false);
  if (size === 4) return view.getFloat32(0, false);
  return null;
}

interface InfoLocation {
  segment: Element;
  info: Element;
  timecodeScale: number;
  duration: Element | null;
  sawSeekHead: boolean;
}

function locateInfo(b: Uint8Array): InfoLocation | null {
  const ebml = readElement(b, 0);
  if (!ebml || ebml.id !== ID_EBML || ebml.unknown) return null;
  const segment = readElement(b, ebml.dataStart + ebml.size);
  if (!segment || segment.id !== ID_SEGMENT) return null;
  let pos = segment.dataStart;
  let sawSeekHead = false;
  while (pos < b.length) {
    const el = readElement(b, pos);
    if (!el || el.unknown) return null;
    if (el.id === ID_CLUSTER) return null; // Info must come before the media.
    if (el.id === ID_SEEKHEAD) sawSeekHead = true;
    if (el.id === ID_INFO) {
      const end = el.dataStart + el.size;
      if (end > b.length) return null;
      let timecodeScale = 1_000_000;
      let duration: Element | null = null;
      let q = el.dataStart;
      while (q < end) {
        const child = readElement(b, q);
        if (!child || child.unknown || child.dataStart + child.size > end) return null;
        if (child.id === ID_TIMECODE_SCALE) timecodeScale = readUint(b, child.dataStart, child.size) || 1_000_000;
        else if (child.id === ID_DURATION) duration = child;
        q = child.dataStart + child.size;
      }
      return { segment, info: el, timecodeScale, duration, sawSeekHead };
    }
    pos = el.dataStart + el.size;
  }
  return null;
}

/** Reads the Duration of a WebM file header, in milliseconds (null if absent). */
export function readWebmDuration(head: Uint8Array): number | null {
  const loc = locateInfo(head);
  if (!loc?.duration) return null;
  const v = readFloat(head, loc.duration.dataStart, loc.duration.size);
  return v === null ? null : (v * loc.timecodeScale) / 1_000_000;
}

/**
 * Returns a copy of `head` (the start of a WebM file) whose Info element
 * carries `durationMs`, or null when the header has an unexpected layout (the
 * caller then keeps the original bytes; the file still plays).
 */
export function fixWebmDuration(head: Uint8Array, durationMs: number): Uint8Array | null {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  const loc = locateInfo(head);
  if (!loc) return null;
  const value = (durationMs * 1_000_000) / loc.timecodeScale;

  if (loc.duration) {
    const out = head.slice();
    const view = new DataView(out.buffer, out.byteOffset + loc.duration.dataStart, loc.duration.size);
    if (loc.duration.size === 8) view.setFloat64(0, value, false);
    else if (loc.duration.size === 4) view.setFloat32(0, value, false);
    else return null;
    return out;
  }

  // Inserting shifts everything after Info; a SeekHead would then point to the
  // wrong places. MediaRecorder never writes one, so this only guards odd files.
  if (loc.sawSeekHead) return null;

  const durationElement = new Uint8Array(11);
  durationElement[0] = 0x44;
  durationElement[1] = 0x89;
  durationElement[2] = 0x88; // size: 8 bytes
  new DataView(durationElement.buffer).setFloat64(3, value, false);

  const { info, segment } = loc;
  const infoEnd = info.dataStart + info.size;
  const newInfoSize = info.size + durationElement.length;
  const infoSize = encodeSize(newInfoSize, info.sizeLength) ?? encodeSize(newInfoSize, minimalSizeLength(newInfoSize));
  if (!infoSize) return null;
  const delta = durationElement.length + infoSize.length - info.sizeLength;

  let segmentSize: Uint8Array | null = null;
  if (!segment.unknown) {
    segmentSize = encodeSize(segment.size + delta, segment.sizeLength);
    if (!segmentSize) return null;
  }

  const out = new Uint8Array(head.length + delta);
  let w = 0;
  const put = (bytes: Uint8Array) => {
    out.set(bytes, w);
    w += bytes.length;
  };
  if (segmentSize) {
    put(head.subarray(0, segment.sizeStart));
    put(segmentSize);
    put(head.subarray(segment.dataStart, info.sizeStart));
  } else {
    put(head.subarray(0, info.sizeStart));
  }
  put(infoSize);
  put(head.subarray(info.dataStart, infoEnd));
  put(durationElement);
  put(head.subarray(infoEnd));
  return out;
}
