/**
 * FrameShot's sound effects, synthesized with Web Audio (no audio files, so
 * nothing to download or license). Works with any AudioContext, including
 * OfflineAudioContext (used by tests to check the sounds are audible and do
 * not clip).
 */

export type SoundName = 'shutter' | 'tick' | 'rec-start' | 'rec-stop' | 'pause' | 'resume' | 'success' | 'error';

export const SOUND_NAMES: readonly SoundName[] = ['shutter', 'tick', 'rec-start', 'rec-stop', 'pause', 'resume', 'success', 'error'];

/** Approximate length of each sound in seconds (so callers can wait for it). */
export const SOUND_DURATION: Record<SoundName, number> = {
  shutter: 0.2,
  tick: 0.08,
  'rec-start': 0.26,
  'rec-stop': 0.3,
  pause: 0.18,
  resume: 0.18,
  success: 0.42,
  error: 0.34,
};

type Ctx = BaseAudioContext;

function envelope(param: AudioParam, t0: number, attack: number, hold: number, release: number, peak: number): void {
  const floor = 0.0001;
  param.setValueAtTime(floor, t0);
  param.exponentialRampToValueAtTime(Math.max(floor, peak), t0 + attack);
  param.setValueAtTime(Math.max(floor, peak), t0 + attack + hold);
  param.exponentialRampToValueAtTime(floor, t0 + attack + hold + release);
}

function tone(ctx: Ctx, out: AudioNode, freq: number, t0: number, dur: number, opts: { type?: OscillatorType; peak?: number; attack?: number; glideTo?: number } = {}): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + dur);
  const gain = ctx.createGain();
  const attack = opts.attack ?? 0.006;
  envelope(gain.gain, t0, attack, 0, dur, opts.peak ?? 0.4);
  osc.connect(gain);
  gain.connect(out);
  osc.start(t0);
  osc.stop(t0 + attack + dur + 0.03);
}

/** Deterministic white noise (same sound every time). */
function noiseBuffer(ctx: Ctx, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x2f6b1e3d;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

function noiseBurst(ctx: Ctx, out: AudioNode, t0: number, dur: number, opts: { freq: number; q: number; peak: number; filter?: BiquadFilterType }): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.03);
  const filter = ctx.createBiquadFilter();
  filter.type = opts.filter ?? 'bandpass';
  filter.frequency.setValueAtTime(opts.freq, t0);
  filter.Q.setValueAtTime(opts.q, t0);
  const gain = ctx.createGain();
  envelope(gain.gain, t0, 0.0015, 0, dur, opts.peak);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.03);
}

/**
 * Plays `name` on `ctx` at `volume` (0–1) and returns its length in seconds.
 * Peaks are kept well below 1.0 so sounds never clip, even when overlapping.
 */
export function playSynth(ctx: Ctx, name: SoundName, volume: number, at?: number): number {
  const v = Math.min(1, Math.max(0, volume));
  if (v === 0) return 0;
  const t = Math.max(ctx.currentTime, at ?? ctx.currentTime) + 0.005;
  const master = ctx.createGain();
  master.gain.setValueAtTime(v * 0.55, t);
  master.connect(ctx.destination);

  switch (name) {
    case 'shutter':
      // Mechanical "ch-chk": a crisp first blade, a soft body thump, a second blade.
      noiseBurst(ctx, master, t, 0.035, { freq: 3800, q: 0.9, peak: 0.9 });
      tone(ctx, master, 150, t, 0.07, { peak: 0.35, glideTo: 70 });
      noiseBurst(ctx, master, t + 0.075, 0.06, { freq: 2400, q: 0.8, peak: 0.6 });
      break;
    case 'tick':
      tone(ctx, master, 1046.5, t, 0.055, { type: 'sine', peak: 0.32, attack: 0.003 });
      noiseBurst(ctx, master, t, 0.012, { freq: 6000, q: 0.7, peak: 0.15, filter: 'highpass' });
      break;
    case 'rec-start':
      tone(ctx, master, 784, t, 0.09, { type: 'triangle', peak: 0.45 });
      tone(ctx, master, 1174.7, t + 0.09, 0.15, { type: 'triangle', peak: 0.45 });
      break;
    case 'rec-stop':
      tone(ctx, master, 1174.7, t, 0.09, { type: 'triangle', peak: 0.42 });
      tone(ctx, master, 784, t + 0.09, 0.1, { type: 'triangle', peak: 0.42 });
      tone(ctx, master, 587.3, t + 0.18, 0.12, { type: 'triangle', peak: 0.36 });
      break;
    case 'pause':
      tone(ctx, master, 659.3, t, 0.07, { type: 'sine', peak: 0.38 });
      tone(ctx, master, 493.9, t + 0.075, 0.1, { type: 'sine', peak: 0.34 });
      break;
    case 'resume':
      tone(ctx, master, 493.9, t, 0.07, { type: 'sine', peak: 0.34 });
      tone(ctx, master, 659.3, t + 0.075, 0.1, { type: 'sine', peak: 0.38 });
      break;
    case 'success':
      // A bright, quick major arpeggio.
      tone(ctx, master, 1046.5, t, 0.16, { type: 'triangle', peak: 0.3 });
      tone(ctx, master, 1318.5, t + 0.07, 0.18, { type: 'triangle', peak: 0.28 });
      tone(ctx, master, 1568, t + 0.14, 0.26, { type: 'triangle', peak: 0.26 });
      break;
    case 'error':
      tone(ctx, master, 329.6, t, 0.13, { type: 'square', peak: 0.12 });
      tone(ctx, master, 246.9, t + 0.14, 0.18, { type: 'square', peak: 0.12 });
      break;
  }
  return SOUND_DURATION[name];
}
