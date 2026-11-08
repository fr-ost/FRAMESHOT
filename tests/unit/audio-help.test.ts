import { describe, expect, it } from 'vitest';
import { chromeMajor, detectPlatform, MAC_SYSTEM_AUDIO_CHROME, missingSoundMessage, soundHint } from '../../src/recorder/audio-help';

describe('sound guidance for screen recording', () => {
  it('detects the platform and Chrome version', () => {
    expect(detectPlatform({ userAgentData: { platform: 'macOS' } })).toBe('mac');
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })).toBe('windows');
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)' })).toBe('chromeos');
    expect(detectPlatform({ platform: 'Linux x86_64' })).toBe('linux');
    expect(chromeMajor('Mozilla/5.0 ... Chrome/141.0.7390.54 Safari/537.36')).toBe(141);
    expect(chromeMajor('nothing')).toBe(0);
  });

  it('tells users what to tick, or that Chrome cannot share sound there', () => {
    expect(soundHint('browser', 'linux', 120)).toMatchObject({ tone: 'ok', text: expect.stringContaining('Also share tab audio') });
    expect(soundHint('window', 'windows', 141).tone).toBe('warn');
    expect(soundHint('monitor', 'windows', 120)).toMatchObject({ tone: 'ok', text: expect.stringContaining('Also share system audio') });
    expect(soundHint('monitor', 'chromeos', 120).tone).toBe('ok');
    expect(soundHint('monitor', 'mac', MAC_SYSTEM_AUDIO_CHROME - 1)).toMatchObject({ tone: 'warn', text: expect.stringContaining(`Chrome ${MAC_SYSTEM_AUDIO_CHROME}`) });
    expect(soundHint('monitor', 'mac', MAC_SYSTEM_AUDIO_CHROME)).toMatchObject({ tone: 'ok', text: expect.stringContaining('macOS 14.2') });
    expect(soundHint('monitor', 'linux', 141)).toMatchObject({ tone: 'ok', text: expect.stringContaining('if it’s offered') });
  });

  it('explains missing sound for each surface', () => {
    expect(missingSoundMessage('browser', 'mac', 141)).toContain('Also share tab audio');
    expect(missingSoundMessage('window', 'windows', 141)).toContain('window');
    expect(missingSoundMessage('monitor', 'windows', 141)).toContain('Also share system audio');
    expect(missingSoundMessage('monitor', 'mac', 130)).toContain(`Chrome ${MAC_SYSTEM_AUDIO_CHROME}`);
    expect(missingSoundMessage(undefined, 'other', 0)).toContain('without sound');
  });
});
