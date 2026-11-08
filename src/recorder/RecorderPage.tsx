/**
 * Screen recorder screen: choose sources, record, pause, stop. The finished
 * recording opens in the player (handled app-wide in StudioApp).
 */
import {
  AlertTriangle,
  AppWindow,
  ArrowLeft,
  Download,
  History,
  Mic,
  MicOff,
  Monitor,
  MonitorPlay,
  PanelTop,
  Pause,
  Play,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Webcam,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatBytes, formatDate, formatDuration } from '../core/format';
import { updateSettings, type CameraPosition, type CameraSize, type RecorderSettings, type Settings } from '../core/settings';
import { SURFACE_LABELS } from '../core/types';
import type { RecordingSessionRecord } from '../db/db';
import { displayPath, downloadBlob, DownloadCancelledError } from '../export/deliver';
import { navigate } from '../ui/hooks';
import { useConfirm, useToast } from '../ui/overlays';
import { Badge, Banner, Button, SegmentedControl, Select, Spinner, Switch, cx } from '../ui/primitives';
import { elapsedMs, isActivePhase, queryRecorder, sendRecorderCommand, type RecorderPublicState } from './channel';
import { BUBBLE_SCALE, supportsCameraOverlay } from './compositor';
import { chooseMimeType, containerOf, describeMimeType, QUALITY_PRESETS } from './formats';
import {
  discardById,
  discardRecording,
  discardRecordingSession,
  findRecoverableSessions,
  pauseRecording,
  recoverSession,
  resumeRecording,
  setCameraLayout,
  setMicMuted,
  startRecording,
  stopRecording,
  type RecorderSnapshot,
} from './recorder';
import { useDevices, useLevelMeter, useMediaPreview, useNow, useRecorder } from './useMedia';
import { chromeMajor, detectPlatform, missingSoundMessage, soundHint } from './audio-help';

const POSITIONS: { value: CameraPosition; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];

export function RecorderPage({ settings }: { settings: Settings }) {
  const snap = useRecorder();
  const toast = useToast();
  const confirm = useConfirm();
  const opts = settings.recorder;
  const setOpts = (patch: Partial<RecorderSettings>) => void updateSettings({ recorder: patch });
  const active = isActivePhase(snap.phase);
  const setup = !active && snap.phase !== 'acquiring';

  const cam = useMediaPreview('camera', opts.camera && setup, opts.cameraDeviceId);
  const mic = useMediaPreview('mic', opts.mic && setup, opts.micDeviceId);
  const devices = useDevices(`${!!cam.stream}-${!!mic.stream}`);
  const [elsewhere, setElsewhere] = useState<RecorderPublicState | null>(null);
  const [recoverable, setRecoverable] = useState<RecordingSessionRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Is another tab already recording? (Only asked while this page is not.)
  useEffect(() => {
    if (!setup) return;
    let alive = true;
    const check = () => void queryRecorder().then((s) => alive && setElsewhere(s && (isActivePhase(s.phase) || s.phase === 'acquiring') ? s : null));
    check();
    const t = setInterval(check, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [setup]);

  useEffect(() => {
    if (!setup) return;
    let alive = true;
    // A recording interrupted moments ago becomes recoverable once its heartbeat is clearly stale.
    const look = () => void findRecoverableSessions().then((list) => alive && setRecoverable(list));
    look();
    const t = setInterval(look, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [setup]);

  const mp4Available = useMemo(() => typeof MediaRecorder !== 'undefined' && chooseMimeType('mp4', false, (t) => MediaRecorder.isTypeSupported(t))?.container === 'mp4', []);
  const overlaySupported = useMemo(() => supportsCameraOverlay(), []);

  const start = () => {
    if (elsewhere) return;
    // Hand the live preview devices to the recorder (no second permission prompt).
    const camera = cam.detach();
    const micStream = mic.detach();
    startRecording(opts, { camera, mic: micStream }).catch(() => {
      /* the reason is shown from the recorder state */
    });
  };

  const discard = async () => {
    const id = snap.sessionId;
    const ok = await confirm({
      title: 'Discard this recording?',
      message: 'What you recorded so far will be deleted. This cannot be undone.',
      confirmLabel: 'Discard',
      danger: true,
    });
    if (!ok) return;
    // If the recording ended while the dialog was open, delete the copy that was saved.
    await discardById(id);
    if (id && location.hash.includes(`/play/${encodeURIComponent(id)}`)) navigate('/record');
    toast.info('Recording discarded.');
  };

  const downloadUnsaved = async () => {
    if (!snap.unsaved) return;
    const ext = containerOf(snap.mimeType ?? snap.unsaved.type);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `frameshot-recording-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}.${ext}`;
    try {
      const res = await downloadBlob(snap.unsaved, settings.downloadFolder ? `${settings.downloadFolder}/${name}` : name, { saveAs: settings.askWhereToSave });
      toast.success(
        <span>
          Saved <strong>{displayPath(res.path || name)}</strong>
        </span>,
      );
    } catch (err) {
      if (err instanceof DownloadCancelledError) toast.info('Download cancelled.');
      else toast.error(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const recover = async (rec: RecordingSessionRecord) => {
    setBusy(rec.id);
    try {
      const item = await recoverSession(rec);
      toast.success('Recording recovered.');
      navigate(`/play/${encodeURIComponent(item.id)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The recording could not be recovered.');
      setRecoverable(await findRecoverableSessions());
    } finally {
      setBusy(null);
    }
  };

  const dropRecoverable = async (rec: RecordingSessionRecord) => {
    const ok = await confirm({ title: 'Delete the unfinished recording?', message: 'Its video data will be removed from this device.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await discardRecordingSession(rec.id);
    setRecoverable(await findRecoverableSessions());
  };

  return (
    <div className="flex h-full flex-col">
      <header className="fr-glass relative z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-3">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Library
        </Button>
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">Screen recorder</h1>
          <Badge tone="primary">Free · no watermark</Badge>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 text-[12px] text-fg-subtle md:flex">
          <ShieldCheck size={14} className="text-success" /> Recordings stay on this device
        </span>
      </header>

      <div className="fr-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1360px] gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_384px]">
          <div className="min-w-0 space-y-4">
            {elsewhere && (
              <Banner
                tone="warning"
                icon={<AlertTriangle size={15} />}
                action={
                  <Button size="sm" onClick={() => sendRecorderCommand('focus')}>
                    Go to it
                  </Button>
                }
              >
                A recording is already running in another FrameShot tab ({formatDuration(elapsedMs(elsewhere))}).
              </Banner>
            )}
            {setup &&
              recoverable.slice(0, 3).map((rec) => (
                <Banner
                  key={rec.id}
                  tone="info"
                  icon={<History size={15} />}
                  action={
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="primary" disabled={busy === rec.id} onClick={() => void recover(rec)} data-testid="recover-recording">
                        {busy === rec.id ? 'Recovering…' : 'Recover'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void dropRecoverable(rec)}>
                        Delete
                      </Button>
                    </div>
                  }
                >
                  An unfinished recording from {formatDate(rec.startedAt)} ({formatDuration(rec.durationMs)}, {formatBytes(rec.bytes)}) was found. The recorder closed before it was saved.
                </Banner>
              ))}
            {snap.error && (
              <Banner
                tone="danger"
                icon={<AlertTriangle size={15} />}
                action={
                  snap.unsaved ? (
                    <Button size="sm" variant="primary" icon={<Download size={14} />} onClick={() => void downloadUnsaved()}>
                      Download recording
                    </Button>
                  ) : undefined
                }
              >
                {snap.error}
              </Banner>
            )}
            <Stage snap={snap} opts={opts} camStream={cam.stream} />
            {setup && <Tips />}
          </div>

          <aside className="min-w-0">
            {setup ? (
              <div className="fr-card space-y-5 p-5 fr-animate-in">
                <Section title="Record">
                  <SegmentedControl
                    label="Open Chrome’s picker on"
                    value={opts.surface}
                    onChange={(v) => setOpts({ surface: v })}
                    options={[
                      { value: 'browser', label: <><PanelTop size={14} /> Tab</>, title: 'A Chrome tab (can include its sound)' },
                      { value: 'window', label: <><AppWindow size={14} /> Window</>, title: 'An app window' },
                      { value: 'monitor', label: <><Monitor size={14} /> Screen</>, title: 'Your entire screen' },
                    ]}
                  />
                  <p className="text-[12px] leading-snug text-fg-subtle">Chrome asks what to share when you start. You can switch tabs from Chrome’s sharing bar while recording.</p>
                </Section>

                <Section title="Sound">
                  <Switch label="Tab & system sound" description="What the shared tab or screen plays." checked={opts.systemAudio} onChange={(v) => setOpts({ systemAudio: v })} />
                  {opts.systemAudio && <SoundHintNote surface={opts.surface} />}
                  <Switch label="Microphone" description="Narrate while you record." checked={opts.mic} onChange={(v) => setOpts({ mic: v })} />
                  {opts.mic && (
                    <div className="space-y-2 fr-animate-in">
                      <Select aria-label="Microphone device" value={opts.micDeviceId} onChange={(e) => setOpts({ micDeviceId: e.target.value })}>
                        <option value="">Default microphone</option>
                        {devices.mics.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Microphone ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                      <LevelMeter stream={mic.stream} />
                      {mic.error && <p className="text-[12px] leading-snug text-danger">{mic.error}</p>}
                    </div>
                  )}
                </Section>

                <Section title="Camera">
                  <Switch
                    label="Camera bubble"
                    description={overlaySupported ? 'Your camera in a round bubble, recorded into the video.' : 'Needs a newer version of Chrome.'}
                    checked={opts.camera && overlaySupported}
                    disabled={!overlaySupported}
                    onChange={(v) => setOpts({ camera: v })}
                  />
                  {opts.camera && overlaySupported && (
                    <div className="space-y-3 fr-animate-in">
                      <Select aria-label="Camera device" value={opts.cameraDeviceId} onChange={(e) => setOpts({ cameraDeviceId: e.target.value })}>
                        <option value="">Default camera</option>
                        {devices.cameras.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                      <BubbleControls position={opts.cameraPosition} size={opts.cameraSize} onChange={(p) => setOpts(p)} />
                      {cam.error && <p className="text-[12px] leading-snug text-danger">{cam.error}</p>}
                    </div>
                  )}
                </Section>

                <Section title="Video">
                  <div className="grid grid-cols-2 gap-2.5">
                    <LabeledSelect label="Format" value={opts.format} onChange={(v) => setOpts({ format: v as RecorderSettings['format'] })}>
                      <option value="mp4">{mp4Available ? 'MP4' : 'MP4 (not available)'}</option>
                      <option value="webm">WebM</option>
                    </LabeledSelect>
                    <LabeledSelect label="Quality" value={opts.quality} onChange={(v) => setOpts({ quality: v as RecorderSettings['quality'] })}>
                      {Object.entries(QUALITY_PRESETS).map(([k, p]) => (
                        <option key={k} value={k}>
                          {p.label}
                        </option>
                      ))}
                    </LabeledSelect>
                    <LabeledSelect label="Frame rate" value={String(opts.fps)} onChange={(v) => setOpts({ fps: Number(v) as RecorderSettings['fps'] })}>
                      <option value="15">15 fps · smallest</option>
                      <option value="30">30 fps</option>
                      <option value="60">60 fps · smoothest</option>
                    </LabeledSelect>
                    <LabeledSelect label="Countdown" value={String(opts.countdown)} onChange={(v) => setOpts({ countdown: Number(v) as RecorderSettings['countdown'] })}>
                      <option value="0">None</option>
                      <option value="3">3 seconds</option>
                      <option value="5">5 seconds</option>
                      <option value="10">10 seconds</option>
                    </LabeledSelect>
                  </div>
                  {!mp4Available && opts.format === 'mp4' ? (
                    <p className="text-[12px] leading-snug text-warning">This browser cannot write MP4 video, so recordings are saved as WebM.</p>
                  ) : (
                    <p className="text-[12px] leading-snug text-fg-subtle">MP4 plays on every phone, Mac and PC. Quality is the largest size recorded.</p>
                  )}
                </Section>

                <button
                  type="button"
                  onClick={start}
                  disabled={!!elsewhere}
                  data-testid="record-start"
                  className="fr-rec-btn fr-press group flex h-14 w-full items-center justify-center gap-3 rounded-[16px] text-[16px] font-semibold tracking-tight"
                >
                  <span className="h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_0_4px_rgb(255_255_255/0.22)] transition-transform duration-300 group-hover:scale-110" />
                  Start recording
                </button>
                <p className="text-center text-[11.5px] leading-snug text-fg-subtle">Saved to your FrameShot library on this device. No uploads, no account, no watermark.</p>
              </div>
            ) : (
              <LivePanel snap={snap} opts={opts} onDiscard={() => void discard()} onLayout={(p) => setOpts(p)} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{title}</h2>
      {children}
    </section>
  );
}

function LabeledSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = `fr-rec-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1 block text-[12px] font-medium text-fg-muted">{label}</span>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
        {children}
      </Select>
    </label>
  );
}

/** What to tick in Chrome's picker for sound, for this system and surface. */
function SoundHintNote({ surface }: { surface: RecorderSettings['surface'] }) {
  const hint = soundHint(surface, detectPlatform(), chromeMajor());
  return (
    <p
      className={cx('flex gap-2 rounded-[11px] px-3 py-2 text-[12px] leading-snug fr-animate-in', hint.tone === 'warn' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary-soft-fg')}
      data-testid="sound-hint"
    >
      {hint.tone === 'warn' ? <AlertTriangle size={13} className="mt-px shrink-0" /> : <Volume2 size={13} className="mt-px shrink-0" />}
      <span>{hint.text}</span>
    </p>
  );
}

const EQ = [0.45, 0.7, 0.95, 0.6, 0.85, 1, 0.75, 0.55, 0.9, 0.65, 0.8, 0.5, 0.72, 0.95, 0.6, 0.4];

/** Live microphone level as a small equalizer (driven by one CSS variable). */
function LevelMeter({ stream, kind = 'mic' }: { stream: MediaStream | null; kind?: 'mic' | 'sound' }) {
  const ref = useRef<HTMLDivElement>(null);
  useLevelMeter(stream, ref);
  const Icon = kind === 'mic' ? Mic : Volume2;
  return (
    <div ref={ref} className="flex items-center gap-2" aria-hidden data-testid={kind === 'sound' ? 'sound-meter' : undefined}>
      <Icon size={13} className={stream ? 'text-success' : 'text-fg-subtle'} />
      <div className="flex h-5 flex-1 items-center gap-[3px]">
        {EQ.map((k, i) => (
          <span
            key={i}
            className="h-full flex-1 origin-center rounded-full bg-[linear-gradient(180deg,#facc15,#22c55e_45%,#22c55e_55%,#facc15)] transition-transform duration-100 ease-out"
            style={{ transform: `scaleY(max(0.14, calc(var(--fr-level, 0) * ${k})))` }}
          />
        ))}
      </div>
    </div>
  );
}

function BubbleControls({ position, size, onChange }: { position: CameraPosition; size: CameraSize; onChange: (p: { cameraPosition?: CameraPosition; cameraSize?: CameraSize }) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Bubble position" className="grid grid-cols-2 gap-1 rounded-[11px] border border-border bg-surface-2 p-1">
        {POSITIONS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={position === p.value}
            aria-label={p.label}
            title={p.label}
            onClick={() => onChange({ cameraPosition: p.value })}
            className={cx(
              'fr-press relative h-7 w-10 rounded-[7px] border transition-colors duration-200',
              position === p.value ? 'border-primary bg-primary-soft' : 'border-transparent bg-surface hover:border-border-strong',
            )}
          >
            <span
              className={cx('absolute h-2.5 w-2.5 rounded-full', position === p.value ? 'bg-primary' : 'bg-fg-subtle/60')}
              style={{
                [p.value.startsWith('top') ? 'top' : 'bottom']: 4,
                [p.value.endsWith('left') ? 'left' : 'right']: 5,
              }}
            />
          </button>
        ))}
      </div>
      <SegmentedControl
        label="Bubble size"
        value={size}
        onChange={(v) => onChange({ cameraSize: v })}
        options={[
          { value: 'small', label: 'S', title: 'Small' },
          { value: 'medium', label: 'M', title: 'Medium' },
          { value: 'large', label: 'L', title: 'Large' },
        ]}
      />
    </div>
  );
}

function CameraBubble({ stream, position, size }: { stream: MediaStream | null; position: CameraPosition; size: CameraSize }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  // The stage is 16:9, so its height is the shorter side (like the recording).
  const style: CSSProperties = {
    height: `${BUBBLE_SCALE[size] * 100}%`,
    aspectRatio: '1',
    [position.startsWith('top') ? 'top' : 'bottom']: '3.5%',
    [position.endsWith('left') ? 'left' : 'right']: `${3.5 * (9 / 16)}%`,
    transition: 'height 450ms var(--fr-ease)',
  };
  return (
    <div className="absolute z-10 overflow-hidden rounded-full shadow-[0_12px_34px_rgb(0_0_0/0.5)] ring-[3px] ring-white/90 fr-animate-in" style={style} data-testid="camera-bubble">
      {stream ? (
        <video ref={ref} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/10 text-white/70">
          <Spinner />
        </div>
      )}
    </div>
  );
}

function Stage({ snap, opts, camStream }: { snap: RecorderSnapshot; opts: RecorderSettings; camStream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = snap.preview ?? null;
  }, [snap.preview]);
  const now = useNow(snap.phase === 'recording');
  const elapsed = elapsedMs(snap, now);
  const live = snap.phase === 'recording' || snap.phase === 'paused' || snap.phase === 'countdown';

  return (
    <div className="fr-stage relative aspect-video w-full overflow-hidden rounded-[22px] border border-white/10 shadow-pop" data-testid="record-stage">
      {snap.preview ? (
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-contain" aria-label="Live preview of the recording" />
      ) : (
        <IdleArt />
      )}
      {!snap.preview && opts.camera && supportsCameraOverlay() && snap.phase !== 'acquiring' && <CameraBubble stream={camStream} position={opts.cameraPosition} size={opts.cameraSize} />}

      {snap.phase === 'acquiring' && (
        <Overlay>
          <MonitorPlay size={30} className="fr-float text-white" />
          <p className="text-[17px] font-semibold text-white">Choose what to share</p>
          <p className="max-w-xs text-center text-[13px] text-white/70">Pick a tab, window or screen in Chrome’s window. Choose a tab to include its sound.</p>
        </Overlay>
      )}
      {snap.phase === 'countdown' && (
        <Overlay dim>
          <div className="relative flex h-[200px] w-[200px] items-center justify-center">
            <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="6" />
              <circle key={snap.countdown} cx="100" cy="100" r="90" fill="none" stroke="url(#fr-count-grad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="565.5" className="fr-count-ring" />
              <defs>
                <linearGradient id="fr-count-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#a5b4fc" />
                  <stop offset="1" stopColor="#f0abfc" />
                </linearGradient>
              </defs>
            </svg>
            <span key={snap.countdown} className="fr-count text-[110px] font-bold leading-none text-white tabular-nums drop-shadow-[0_8px_30px_rgb(0_0_0/0.5)]" data-testid="record-countdown">
              {snap.countdown}
            </span>
          </div>
          <p className="text-[14px] font-medium text-white/80">Recording starts…</p>
        </Overlay>
      )}
      {live && snap.phase !== 'countdown' && (
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur-md">
          {snap.phase === 'paused' ? <Pause size={13} /> : <span className="fr-rec-dot" />}
          <span className="tabular-nums">{formatDuration(elapsed)}</span>
          {snap.phase === 'paused' && <span className="text-white/70">Paused</span>}
        </div>
      )}
      {snap.phase === 'paused' && (
        <Overlay dim>
          <Pause size={36} className="text-white" />
          <p className="text-[15px] font-semibold text-white">Paused</p>
          <p className="text-[12.5px] text-white/70">Paused time is left out of the video.</p>
        </Overlay>
      )}
      {(snap.phase === 'stopping' || snap.phase === 'saving') && (
        <Overlay dim>
          <Spinner className="h-7 w-7 text-white" />
          <p className="text-[15px] font-semibold text-white">Saving your recording…</p>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return <div className={cx('absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 fr-fade', dim ? 'bg-black/55 backdrop-blur-[2px]' : '')}>{children}</div>;
}

/** Placeholder "screen" shown before recording. */
function IdleArt() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-[7%]" aria-hidden>
      <div className="relative h-full w-full overflow-hidden rounded-[14px] border border-white/12 bg-white/[0.04] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)]">
        <div className="flex h-[9%] min-h-6 items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]/80" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]/80" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]/80" />
          <span className="ml-3 h-2.5 w-1/3 rounded-full bg-white/10" />
        </div>
        <div className="space-y-[3%] p-[5%]">
          <div className="h-[0.9em] w-2/5 rounded-full bg-white/12" />
          <div className="h-[0.6em] w-4/5 rounded-full bg-white/[0.07]" />
          <div className="h-[0.6em] w-3/4 rounded-full bg-white/[0.07]" />
          <div className="grid grid-cols-3 gap-[3%] pt-[2%]">
            <div className="aspect-[4/3] rounded-[10px] bg-[linear-gradient(135deg,rgb(99_102_241/0.35),rgb(236_72_153/0.25))]" />
            <div className="aspect-[4/3] rounded-[10px] bg-white/[0.06]" />
            <div className="aspect-[4/3] rounded-[10px] bg-white/[0.06]" />
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
            <MonitorPlay size={22} />
          </span>
          <p className="text-[14px] font-semibold text-white/90">Your tab, window or screen appears here</p>
        </div>
      </div>
    </div>
  );
}

function Tips() {
  const tips = [
    { icon: <Volume2 size={16} />, title: 'Record with sound', text: 'Share a Chrome tab and keep “Also share tab audio” on.' },
    { icon: <Pause size={16} />, title: 'Pause any time', text: 'Paused stretches are left out of the video.' },
    { icon: <Square size={16} />, title: 'Stop from anywhere', text: 'Use Chrome’s “Stop sharing” bar or the FrameShot toolbar button.' },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {tips.map((t, i) => (
        <li key={t.title} className="fr-card fr-stagger flex gap-3 p-3.5" style={{ '--i': i } as CSSProperties}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">{t.icon}</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">{t.title}</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-fg-subtle">{t.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Chip({ icon, children, tone = 'neutral' }: { icon: ReactNode; children: ReactNode; tone?: 'neutral' | 'muted' }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-medium', tone === 'muted' ? 'text-fg-subtle' : 'bg-surface-2 text-fg-muted')}>
      {icon}
      {children}
    </span>
  );
}

function LivePanel({
  snap,
  opts,
  onDiscard,
  onLayout,
}: {
  snap: RecorderSnapshot;
  opts: RecorderSettings;
  onDiscard: () => void;
  onLayout: (p: { cameraPosition?: CameraPosition; cameraSize?: CameraSize }) => void;
}) {
  const now = useNow(snap.phase === 'recording');
  const elapsed = elapsedMs(snap, now);
  const status =
    snap.phase === 'acquiring'
      ? 'Waiting for you to choose what to share…'
      : snap.phase === 'countdown'
        ? `Starting in ${snap.countdown}…`
        : snap.phase === 'paused'
          ? 'Paused'
          : snap.phase === 'stopping' || snap.phase === 'saving'
            ? 'Saving…'
            : 'Recording';
  const canControl = snap.phase === 'recording' || snap.phase === 'paused';
  return (
    <div className="fr-card space-y-5 p-5 fr-animate-in" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        {snap.phase === 'recording' ? <span className="fr-rec-dot" /> : snap.phase === 'paused' ? <Pause size={14} className="text-warning" /> : <Spinner className="text-primary" />}
        <span data-testid="record-status">{status}</span>
      </div>
      <div>
        <div className="text-[48px] font-semibold leading-none tracking-tight tabular-nums" data-testid="record-timer">
          {formatDuration(elapsed)}
        </div>
        <p className="mt-2 text-[12px] tabular-nums text-fg-subtle">
          {[snap.bytes > 0 ? `${formatBytes(snap.bytes)} recorded` : null, snap.mimeType ? describeMimeType(snap.mimeType) : null, snap.width && snap.height ? `${snap.width}×${snap.height}` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {snap.phase !== 'acquiring' && (
        <div className="flex flex-wrap gap-1.5">
          {snap.surface && <Chip icon={snap.surface === 'browser' ? <PanelTop size={13} /> : snap.surface === 'window' ? <AppWindow size={13} /> : <Monitor size={13} />}>{SURFACE_LABELS[snap.surface]}</Chip>}
          {snap.hasSystemAudio ? (
            <Chip icon={<Volume2 size={13} />}>{snap.surface === 'browser' ? 'Tab sound' : 'System sound'}</Chip>
          ) : (
            <Chip tone="muted" icon={<VolumeX size={13} />}>{snap.surface === 'browser' ? 'No tab sound' : 'No system sound'}</Chip>
          )}
          {snap.hasMic && <Chip icon={snap.micMuted ? <MicOff size={13} /> : <Mic size={13} />}>{snap.micMuted ? 'Mic muted' : 'Microphone'}</Chip>}
          {snap.hasCamera && <Chip icon={<Webcam size={13} />}>Camera</Chip>}
        </div>
      )}

      {snap.hasSystemAudio && snap.audioPreview && snap.phase !== 'acquiring' && <LevelMeter stream={snap.audioPreview} kind="sound" />}
      {snap.soundMissing && canControl && (
        <div role="alert" className="space-y-2.5 rounded-[12px] border border-warning/30 bg-warning-soft p-3 text-[12.5px] leading-snug text-warning" data-testid="sound-missing">
          <p className="flex gap-2">
            <VolumeX size={15} className="mt-px shrink-0" />
            <span>
              <b className="font-semibold">No sound is being recorded.</b> {missingSoundMessage(snap.surface, detectPlatform(), chromeMajor())}
            </span>
          </p>
          <Button size="sm" className="w-full" onClick={() => void discardRecording()} data-testid="sound-retry">
            Discard and try again
          </Button>
        </div>
      )}

      {canControl && (
        <div className="grid grid-cols-2 gap-2">
          {snap.phase === 'paused' ? (
            <Button size="lg" icon={<Play size={16} />} onClick={resumeRecording} data-testid="record-resume">
              Resume
            </Button>
          ) : (
            <Button size="lg" icon={<Pause size={16} />} onClick={pauseRecording} data-testid="record-pause">
              Pause
            </Button>
          )}
          <button
            type="button"
            onClick={() => void stopRecording()}
            data-testid="record-stop"
            className="fr-rec-btn fr-press inline-flex h-11 items-center justify-center gap-2 rounded-[13px] px-5 text-[15px] font-semibold"
          >
            <Square size={14} fill="currentColor" /> Stop &amp; save
          </button>
        </div>
      )}
      {snap.phase === 'countdown' && (
        <Button className="w-full" onClick={() => void discardRecording()} data-testid="record-cancel">
          Cancel
        </Button>
      )}
      {canControl && snap.hasMic && (
        <Button className="w-full" variant={snap.micMuted ? 'soft' : 'secondary'} icon={snap.micMuted ? <MicOff size={15} /> : <Mic size={15} />} onClick={() => setMicMuted(!snap.micMuted)} aria-pressed={snap.micMuted}>
          {snap.micMuted ? 'Unmute microphone' : 'Mute microphone'}
        </Button>
      )}
      {canControl && snap.hasCamera && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-fg-muted">Camera bubble</p>
          <BubbleControls
            position={opts.cameraPosition}
            size={opts.cameraSize}
            onChange={(p) => {
              onLayout(p);
              setCameraLayout({ position: p.cameraPosition ?? opts.cameraPosition, size: p.cameraSize ?? opts.cameraSize });
            }}
          />
        </div>
      )}
      {snap.warnings.length > 0 && (
        <ul className="space-y-1.5 rounded-[12px] border border-warning/25 bg-warning-soft p-3 text-[12px] leading-snug text-warning">
          {snap.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle size={13} className="mt-px shrink-0" />
              {w}
            </li>
          ))}
        </ul>
      )}
      {canControl && (
        <>
          <Button variant="ghost" className="w-full !text-danger" icon={<Trash2 size={15} />} onClick={onDiscard} data-testid="record-discard">
            Discard recording
          </Button>
          <p className="text-center text-[11.5px] leading-snug text-fg-subtle">You can also stop from Chrome’s “Stop sharing” bar or the FrameShot toolbar button.</p>
        </>
      )}
    </div>
  );
}
