/**
 * Whether Chrome can share sound for what the user is about to record, and
 * what to tick in Chrome's share picker. Chrome decides this, not FrameShot:
 *  - a tab: its sound, if "Also share tab audio" stays on (every system);
 *  - the entire screen: system sound, if "Also share system audio" is ticked,
 *    on Windows and ChromeOS, and on macOS 14.2+ with Chrome 141+;
 *  - a single window: never any sound.
 */
import type { DisplaySurfaceKind } from '../core/types';

export type Platform = 'mac' | 'windows' | 'chromeos' | 'linux' | 'other';

export function detectPlatform(nav: { userAgent?: string; platform?: string; userAgentData?: { platform?: string } } = typeof navigator === 'undefined' ? {} : navigator): Platform {
  const p = `${nav.userAgentData?.platform ?? ''} ${nav.platform ?? ''} ${nav.userAgent ?? ''}`.toLowerCase();
  if (p.includes('cros') || p.includes('chrome os') || p.includes('chromeos')) return 'chromeos';
  if (p.includes('mac')) return 'mac';
  if (p.includes('win')) return 'windows';
  if (p.includes('linux')) return 'linux';
  return 'other';
}

export function chromeMajor(userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): number {
  const m = /Chrom(?:e|ium)\/(\d+)/.exec(userAgent);
  return m ? Number(m[1]) : 0;
}

/** The first Chrome version that can share system sound on macOS (with macOS 14.2+). */
export const MAC_SYSTEM_AUDIO_CHROME = 141;

export interface SoundHint {
  /** 'ok': sound can be recorded if the box is ticked; 'warn': Chrome cannot share sound here. */
  tone: 'ok' | 'warn';
  text: string;
}

/** Shown under the sound switch before recording. */
export function soundHint(surface: DisplaySurfaceKind, platform: Platform, chrome: number): SoundHint {
  if (surface === 'browser') return { tone: 'ok', text: 'In Chrome’s picker, pick a tab and keep “Also share tab audio” on.' };
  if (surface === 'window') {
    return { tone: 'warn', text: 'Chrome never shares a window’s sound. To record sound, choose Tab, or Screen with system audio.' };
  }
  // Entire screen.
  if (platform === 'windows' || platform === 'chromeos') return { tone: 'ok', text: 'In Chrome’s picker, turn on “Also share system audio” to record your computer’s sound.' };
  if (platform === 'mac') {
    if (chrome && chrome < MAC_SYSTEM_AUDIO_CHROME) {
      return { tone: 'warn', text: `Recording your Mac’s sound needs Chrome ${MAC_SYSTEM_AUDIO_CHROME} or later (and macOS 14.2 or later). Update Chrome, or choose Tab to record a tab’s sound.` };
    }
    return { tone: 'ok', text: 'In Chrome’s picker, turn on “Also share system audio” (needs macOS 14.2 or later). If it isn’t offered, choose Tab to record a tab’s sound.' };
  }
  return { tone: 'ok', text: 'In Chrome’s picker, turn on “Also share system audio” if it’s offered (not every system has it). Otherwise choose Tab to record a tab’s sound.' };
}

/** Shown while recording when sound was requested but Chrome shared none. */
export function missingSoundMessage(surface: DisplaySurfaceKind | undefined, platform: Platform, chrome: number): string {
  if (surface === 'browser') return 'The tab was shared without its sound. To include it, keep “Also share tab audio” on in Chrome’s picker.';
  if (surface === 'window') return 'Chrome doesn’t share a window’s sound. To record sound, share a tab, or your entire screen with “Also share system audio” on.';
  if (surface === 'monitor') {
    if (platform === 'windows' || platform === 'chromeos') return 'The screen was shared without sound. Turn on “Also share system audio” in Chrome’s picker to include it.';
    if (platform === 'mac') {
      return chrome && chrome < MAC_SYSTEM_AUDIO_CHROME
        ? `The screen was shared without sound: recording your Mac’s sound needs Chrome ${MAC_SYSTEM_AUDIO_CHROME} or later and macOS 14.2 or later. You can share a tab instead to record its sound.`
        : 'The screen was shared without sound. Turn on “Also share system audio” in Chrome’s picker (needs macOS 14.2 or later), or share a tab to record its sound.';
    }
    return 'The screen was shared without sound. Turn on “Also share system audio” in Chrome’s picker if it’s offered (not every system has it), or share a tab to record its sound.';
  }
  return 'What you shared came without sound. Share a tab (with “Also share tab audio” on) or your screen with system audio.';
}
