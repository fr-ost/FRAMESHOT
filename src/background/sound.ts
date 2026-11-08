/**
 * Sound effects for captures run by the service worker (which cannot play
 * audio itself): an offscreen document with the AUDIO_PLAYBACK reason plays
 * them. Chrome closes that document again after about 30 s of silence.
 */
import { loadSettings } from '../core/settings';
import type { SoundName } from '../core/sound-synth';
import type { CaptureStatus } from '../core/types';

const OFFSCREEN_PATH = '/offscreen.html';
let creating: Promise<void> | null = null;

async function ensureOffscreen(): Promise<boolean> {
  if (!chrome.offscreen?.createDocument) return false;
  const url = chrome.runtime.getURL(OFFSCREEN_PATH);
  try {
    const existing = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [url] });
    if (existing.length > 0) return true;
  } catch {
    // getContexts unavailable: fall through and try to create (a duplicate is reported as an error we ignore).
  }
  creating ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Plays FrameShot sound effects (camera shutter, countdown) for captures started from the toolbar, menu or keyboard.',
    })
    .catch((err: unknown) => {
      if (!/single offscreen document|already exists/i.test(String(err))) throw err;
    })
    .finally(() => {
      creating = null;
    });
  try {
    await creating;
    return true;
  } catch {
    return false;
  }
}

export async function playBackgroundSound(name: SoundName): Promise<void> {
  try {
    const settings = await loadSettings();
    if (!settings.sounds.enabled || settings.sounds.volume <= 0) return;
    if (!(await ensureOffscreen())) return;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await chrome.runtime.sendMessage({ kind: 'offscreen.sound', name, volume: settings.sounds.volume });
        return;
      } catch {
        // The document may still be loading.
        await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
      }
    }
  } catch {
    // Sounds are never allowed to break a capture.
  }
}

/** Which sound a capture status change deserves (pure; unit-tested). */
export function soundForStatus(prev: CaptureStatus | null, next: CaptureStatus): SoundName | null {
  if (next.phase === 'done' && prev?.phase !== 'done') return 'shutter';
  if (next.phase === 'error' && next.errorCode !== 'busy' && prev?.phase !== 'error') return 'error';
  if (next.phase === 'waiting' && next.message && /^\d+$/.test(next.message) && (prev?.phase !== 'waiting' || prev.message !== next.message)) return 'tick';
  return null;
}
