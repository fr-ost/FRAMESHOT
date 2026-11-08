/**
 * Sound effects in extension pages (popup, Studio). Captures started from the
 * toolbar, menu or keyboard play their sounds from the service worker via an
 * offscreen document instead (see background/sound.ts).
 */
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, type SoundSettings } from '../core/settings';
import { playSynth, SOUND_NAMES, type SoundName } from '../core/sound-synth';

let prefs: SoundSettings = DEFAULT_SETTINGS.sounds;
let watching = false;

function watchPrefs(): void {
  if (watching || typeof chrome === 'undefined' || !chrome.storage?.local) return;
  watching = true;
  void loadSettings().then((s) => (prefs = s.sounds));
  onSettingsChanged((s) => (prefs = s.sounds));
}
watchPrefs();

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  try {
    ctx ??= new AudioContext({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a click handler before sounds that play later (e.g. a countdown). */
export function primeSounds(): void {
  watchPrefs();
  context();
}

/**
 * Resolves after `seconds`, timed by the audio clock: unlike timers, it is not
 * throttled while the tab is in the background (the recorder's countdown runs
 * while you look at the tab you are recording).
 */
export function waitAudio(seconds: number): Promise<void> {
  const ms = Math.max(0, seconds * 1000);
  const c = context();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    if (!c || c.state !== 'running' || typeof c.createConstantSource !== 'function') {
      setTimeout(finish, ms);
      return;
    }
    // Safety net in case the audio clock stops.
    const fallback = setTimeout(finish, ms + 1500);
    const src = c.createConstantSource();
    const silent = c.createGain();
    silent.gain.value = 0;
    src.connect(silent);
    silent.connect(c.destination);
    src.onended = () => {
      clearTimeout(fallback);
      src.disconnect();
      silent.disconnect();
      finish();
    };
    src.start();
    src.stop(c.currentTime + seconds);
  });
}

/** Plays a sound effect if sounds are on. Returns its length in seconds (0 if silent). */
export function playSound(name: SoundName, opts: { force?: boolean; volume?: number } = {}): number {
  watchPrefs();
  if (!prefs.enabled && !opts.force) return 0;
  const c = context();
  if (!c) return 0;
  try {
    const length = playSynth(c, name, opts.volume ?? prefs.volume);
    if (__FRAMESHOT_E2E__) {
      const w = window as unknown as { __frameshotSounds?: { name: SoundName; state: string }[] };
      (w.__frameshotSounds ??= []).push({ name, state: c.state });
    }
    return length;
  } catch {
    return 0;
  }
}

// Test hook (E2E builds only): render every sound offline to check it is audible and does not clip.
if (__FRAMESHOT_E2E__ && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__frameshotSoundCheck = async () => {
    const out: Record<string, { rms: number; peak: number }> = {};
    for (const name of SOUND_NAMES) {
      const offline = new OfflineAudioContext(1, 44100, 44100);
      playSynth(offline, name, 1, 0);
      const data = (await offline.startRendering()).getChannelData(0);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
        peak = Math.max(peak, Math.abs(data[i]));
      }
      out[name] = { rms: Math.sqrt(sum / data.length), peak };
    }
    return out;
  };
}
