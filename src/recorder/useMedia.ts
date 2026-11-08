/** React hooks for the recorder: live engine state, device previews, device lists. */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getRecorderSnapshot, openCamera, openMicrophone, subscribeRecorder, type RecorderSnapshot } from './recorder';

export function useRecorder(): RecorderSnapshot {
  return useSyncExternalStore(subscribeRecorder, getRecorderSnapshot);
}

/** Re-renders every `ms` while `active` (for running timers). */
export function useNow(active: boolean, ms = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/**
 * A camera or microphone stream for the setup preview. `detach()` hands the
 * live stream over to the recorder (the hook then no longer stops it).
 */
export function useMediaPreview(kind: 'camera' | 'mic', enabled: boolean, deviceId: string) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const owned = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStream(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    (kind === 'camera' ? openCamera(deviceId) : openMicrophone(deviceId)).then(
      (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        owned.current = s;
        setStream(s);
      },
      (err: unknown) => {
        if (cancelled) return;
        setStream(null);
        setError(err instanceof Error ? err.message : String(err));
      },
    );
    return () => {
      cancelled = true;
      owned.current?.getTracks().forEach((t) => t.stop());
      owned.current = null;
    };
  }, [kind, enabled, deviceId]);

  const detach = useCallback((): MediaStream | null => {
    const s = owned.current;
    owned.current = null;
    return s;
  }, []);

  return { stream, error, detach };
}

export interface DeviceLists {
  mics: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
}

/** Microphones and cameras (names appear once access has been allowed). */
export function useDevices(refreshKey: unknown): DeviceLists {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) return;
    const load = () => void md.enumerateDevices().then(setDevices, () => setDevices([]));
    load();
    md.addEventListener('devicechange', load);
    return () => md.removeEventListener('devicechange', load);
  }, [refreshKey]);
  return {
    mics: devices.filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications'),
    cameras: devices.filter((d) => d.kind === 'videoinput'),
  };
}

/** Writes the stream's loudness (0–1) to a CSS variable, without re-rendering React. */
export function useLevelMeter(stream: MediaStream | null, target: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = target.current;
    if (!stream || !el || stream.getAudioTracks().length === 0) {
      el?.style.setProperty('--fr-level', '0');
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const level = Math.min(1, Math.sqrt(sum / data.length) * 5);
      smooth = Math.max(level, smooth * 0.85);
      el.style.setProperty('--fr-level', smooth.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    tick();
    // Audio may start suspended until the page has been clicked.
    const resume = () => void ctx.resume().catch(() => {});
    window.addEventListener('pointerdown', resume, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', resume);
      source.disconnect();
      void ctx.close().catch(() => {});
      el.style.setProperty('--fr-level', '0');
    };
  }, [stream, target]);
}
