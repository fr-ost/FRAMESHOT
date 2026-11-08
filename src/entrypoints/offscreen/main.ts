/**
 * Offscreen document (reason: AUDIO_PLAYBACK). The service worker cannot play
 * audio, so captures started from the toolbar, menu or keyboard ask this page
 * to play their sound effects. It has no UI and closes itself when idle.
 */
import { playSynth, SOUND_NAMES, type SoundName } from '../../core/sound-synth';

const ctx = new AudioContext({ latencyHint: 'interactive' });

chrome.runtime.onMessage.addListener((msg: { kind?: string; name?: SoundName; volume?: number }, sender, sendResponse) => {
  if (msg?.kind !== 'offscreen.sound' || sender.id !== chrome.runtime.id) return false;
  if (!msg.name || !SOUND_NAMES.includes(msg.name)) {
    sendResponse({ ok: false });
    return false;
  }
  const play = () => {
    playSynth(ctx, msg.name!, typeof msg.volume === 'number' ? msg.volume : 0.6);
    if (__FRAMESHOT_E2E__) void chrome.runtime.sendMessage({ kind: 'test.sound', name: msg.name, state: ctx.state }).catch(() => {});
    sendResponse({ ok: true, state: ctx.state });
  };
  if (ctx.state === 'suspended') void ctx.resume().finally(play);
  else play();
  return true;
});
