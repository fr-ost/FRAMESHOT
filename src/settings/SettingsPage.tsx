import { ArrowLeft, Camera, Check, Download, ExternalLink, HardDrive, Heart, Info, Keyboard, Lock, Mic, Palette, Play, Shield, Star, Trash2, Video, Volume2 } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { BRAND } from '../core/brand';
import { buildFilename, FILENAME_TOKENS } from '../core/filename';
import { formatBytes } from '../core/format';
import { DEFAULT_SETTINGS, LIMITS, saveSettings, sanitizeFolder, type Settings, type DeepPartial, mergeSettings, type RecorderSettings } from '../core/settings';
import { QUALITY_PRESETS } from '../recorder/formats';
import { hasStoreListing, markReviewDone, reviewUrl } from '../core/review';
import { playSound } from '../ui/sounds';
import { SlidingHighlight } from '../ui/motion';
import { queryRecorder } from '../recorder/channel';
import { clearAllData, storageStats, type StorageStats } from '../db/db';
import { navigate } from '../ui/hooks';
import { useConfirm, useToast } from '../ui/overlays';
import { Button, Credits, cx, DeveloperCard, Field, Input, Logo, SegmentedControl, Select, Slider, Switch } from '../ui/primitives';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={15} /> },
  { id: 'sounds', label: 'Sounds', icon: <Volume2 size={15} /> },
  { id: 'capture', label: 'Capture', icon: <Camera size={15} /> },
  { id: 'recording', label: 'Screen recording', icon: <Video size={15} /> },
  { id: 'export', label: 'Export & downloads', icon: <Download size={15} /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={15} /> },
  { id: 'storage', label: 'Storage', icon: <HardDrive size={15} /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield size={15} /> },
  { id: 'about', label: 'About', icon: <Info size={15} /> },
] as const;

function Card({ title, description, children, id }: { title: string; description?: ReactNode; children: ReactNode; id?: string }) {
  const section = SECTIONS.find((s) => s.id === id);
  return (
    <section id={id} className="fr-card fr-spot fr-stagger scroll-mt-24 p-6" style={{ '--i': SECTIONS.findIndex((s) => s.id === id) } as CSSProperties}>
      <div className="flex items-start gap-3">
        {section && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-primary-soft text-primary">{section.icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-subtle">{description}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function ThemeTile({ value, label, current, onSelect }: { value: Settings['theme']; label: string; current: Settings['theme']; onSelect: () => void }) {
  const active = value === current;
  const pane = (dark: boolean) => (
    <span className={cx('flex h-full flex-1 flex-col gap-1 p-1.5', dark ? 'bg-[#0d0d14]' : 'bg-[#f4f4f8]')}>
      <span className={cx('h-1.5 w-8 rounded-full', dark ? 'bg-white/25' : 'bg-black/15')} />
      <span className={cx('flex-1 rounded-[5px]', dark ? 'bg-white/[0.07]' : 'bg-white shadow-sm')} />
      <span className="h-1.5 w-5 rounded-full bg-[linear-gradient(90deg,#6366f1,#8b5cf6)]" />
    </span>
  );
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onSelect}
      className={cx(
        'fr-press group flex flex-col gap-2 rounded-[14px] border p-2 text-left transition-all duration-300',
        active ? 'border-primary bg-primary-soft shadow-glow' : 'border-border bg-surface-2 hover:border-border-strong',
      )}
    >
      <span className="flex h-16 w-full overflow-hidden rounded-[10px] border border-border">
        {value === 'system' ? (
          <>
            {pane(false)}
            {pane(true)}
          </>
        ) : (
          pane(value === 'dark')
        )}
      </span>
      <span className="flex items-center justify-between px-1 text-[13px] font-medium">
        {label}
        <span className={cx('flex h-4 w-4 items-center justify-center rounded-full border transition-colors', active ? 'fr-accent-bg border-transparent text-white' : 'border-border-strong')}>
          {active && <Check size={10} strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}

/** A slider that moves freely while dragged and saves once, when released. */
function SettingSlider({ value, onSave, ...rest }: { label: string; value: number; min: number; max: number; step?: number; format?: (v: number) => string; id?: string; onSave: (v: number) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return <Slider {...rest} value={local} onChange={setLocal} onCommit={(v) => v !== value && onSave(v)} />;
}

function VolumeSlider({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [local, setLocal] = useState(Math.round(value * 100));
  useEffect(() => setLocal(Math.round(value * 100)), [value]);
  return (
    <Slider
      label="Volume"
      id="fr-s-volume"
      min={0}
      max={100}
      value={local}
      onChange={setLocal}
      onCommit={(v) => {
        onCommit(v / 100);
        // Let the user hear the new level.
        playSound('shutter', { force: true, volume: v / 100 });
      }}
      format={(v) => `${v}%`}
    />
  );
}

export function SettingsPage({ settings }: { settings: Settings }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [commands, setCommands] = useState<chrome.commands.Command[]>([]);
  const [template, setTemplate] = useState(settings.filenameTemplate);
  const [folder, setFolder] = useState(settings.downloadFolder);
  const [activeSection, setActiveSection] = useState<string>('appearance');
  const [listed, setListed] = useState(false);
  useEffect(() => {
    void hasStoreListing().then(setListed);
  }, []);

  // Highlight the section currently in view.
  useEffect(() => {
    const root = document.getElementById('fr-settings-scroll');
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { root, rootMargin: '-80px 0px -55% 0px' },
    );
    for (const sct of SECTIONS) {
      const el = document.getElementById(sct.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    void storageStats().then(setStats);
    void chrome.commands.getAll().then(setCommands).catch(() => setCommands([]));
  }, []);
  useEffect(() => {
    setTemplate(settings.filenameTemplate);
    setFolder(settings.downloadFolder);
  }, [settings.filenameTemplate, settings.downloadFolder]);

  const update = async (patch: DeepPartial<Settings>) => {
    await saveSettings(mergeSettings(settings, patch));
  };

  const preview = buildFilename(template || DEFAULT_SETTINGS.filenameTemplate, { domain: 'example.com', title: 'Example page', mode: 'full', width: 1440, height: 6200, name: 'Example page' }, settings.defaultFormat);
  const version = chrome.runtime.getManifest().version;

  return (
    <div id="fr-settings-scroll" className="fr-scroll h-full overflow-y-auto">
      <header className="fr-glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border px-5">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Library
        </Button>
        <span className="h-5 w-px bg-border" aria-hidden />
        <h1 className="text-[17px] font-semibold tracking-tight">Settings</h1>
      </header>
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-8 lg:grid-cols-[210px_1fr]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <div className="sticky top-24">
          <div className="relative">
          <SlidingHighlight activeKey={activeSection} />
          <ul className="relative space-y-0.5">
            {SECTIONS.map((sct) => (
              <li key={sct.id}>
                <a
                  href={`#/settings`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(sct.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  aria-current={activeSection === sct.id ? 'true' : undefined}
                  className={cx(
                    'flex h-9 items-center gap-2.5 rounded-[11px] px-3 text-[13px] font-medium transition-colors duration-200',
                    activeSection === sct.id ? 'text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <span className={activeSection === sct.id ? 'text-primary' : 'text-fg-subtle'}>{sct.icon}</span>
                  {sct.label}
                </a>
              </li>
            ))}
          </ul>
          </div>
          </div>
        </nav>
        <div className="min-w-0 space-y-6">
        <Card title="Appearance" id="appearance" description="FrameShot follows your system theme by default.">
          <div role="radiogroup" aria-label="Theme" className="grid max-w-md grid-cols-3 gap-3">
            <ThemeTile value="system" label="System" current={settings.theme} onSelect={() => void update({ theme: 'system' })} />
            <ThemeTile value="light" label="Light" current={settings.theme} onSelect={() => void update({ theme: 'light' })} />
            <ThemeTile value="dark" label="Dark" current={settings.theme} onSelect={() => void update({ theme: 'dark' })} />
          </div>
        </Card>

        <Card title="Sounds" id="sounds" description="Short sounds confirm what happened, even when FrameShot is in the background.">
          <Switch
            label="Sound effects"
            description="A camera shutter when a screenshot is saved, a countdown and start/stop chimes for recordings, and a chime when an export is ready."
            checked={settings.sounds.enabled}
            onChange={(v) => void update({ sounds: { enabled: v } })}
            id="fr-s-sounds"
          />
          <div className={cx('flex items-end gap-4', !settings.sounds.enabled && 'pointer-events-none opacity-50')}>
            <div className="w-full max-w-xs">
              <VolumeSlider value={settings.sounds.volume} onCommit={(v) => void update({ sounds: { volume: v } })} />
            </div>
            <Button size="sm" icon={<Play size={14} />} onClick={() => playSound('shutter', { force: true })} data-testid="sound-test">
              Play a test sound
            </Button>
          </div>
        </Card>

        <Card title="Capture" id="capture" description="How FrameShot captures long pages. These apply to full-page, element, and scrolling-area captures.">
          <Field label="Fixed & sticky elements" htmlFor="fr-fixed" hint="Smart keeps headers at the top and footers at the bottom, once — instead of repeating them on every screen.">
            <Select id="fr-fixed" value={settings.capture.fixedElements} onChange={(e) => void update({ capture: { fixedElements: e.target.value as Settings['capture']['fixedElements'] } })}>
              <option value="smart">Smart: show once (recommended)</option>
              <option value="keep">Keep as on screen (may repeat)</option>
              <option value="hide">Hide fixed elements</option>
            </Select>
          </Field>
          <Switch label="Load lazy content first" description="Scrolls through the page before capturing so lazy-loaded images and infinite-scroll content appear." checked={settings.capture.preloadLazyContent} onChange={(v) => void update({ capture: { preloadLazyContent: v } })} />
          <Switch label="Finish animations instantly" description="Temporarily speeds up CSS animations and transitions so every part of the page is captured in its final state." checked={settings.capture.freezeAnimations} onChange={(v) => void update({ capture: { freezeAnimations: v } })} />
          <Switch label="Include horizontal overflow" description="Capture the full width of pages that scroll sideways." checked={settings.capture.includeHorizontalOverflow} onChange={(v) => void update({ capture: { includeHorizontalOverflow: v } })} />
          <SettingSlider label="Delay between scroll steps" min={LIMITS.settleDelayMs.min} max={2000} step={50} value={settings.capture.settleDelayMs} onSave={(v) => void update({ capture: { settleDelayMs: v } })} format={(v) => `${v} ms`} id="fr-settle" />
          <p className="-mt-2 text-xs text-fg-subtle">Increase this for slow or animated pages. Chrome also limits captures to two per second.</p>
          <Field label="Maximum page height" htmlFor="fr-maxh" hint="A safety limit for endless pages. You can always stop a capture early from the toolbar popup.">
            <Select id="fr-maxh" value={String(settings.capture.maxPageHeight)} onChange={(e) => void update({ capture: { maxPageHeight: Number(e.target.value) } })}>
              {[...new Set([10000, 20000, 30000, 60000, 100000, 200000, settings.capture.maxPageHeight])].sort((a, b) => a - b).map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString('en-US')} px
                </option>
              ))}
            </Select>
          </Field>
          <Field label="When a page is larger than the browser can hold in one image" htmlFor="fr-oversize">
            <Select id="fr-oversize" value={settings.capture.oversize} onChange={(e) => void update({ capture: { oversize: e.target.value as Settings['capture']['oversize'] } })}>
              <option value="split">Split into parts at full resolution (recommended)</option>
              <option value="scale">Scale down into a single image</option>
            </Select>
          </Field>
          <Field label="After a capture" htmlFor="fr-after">
            <Select id="fr-after" value={settings.afterCapture} onChange={(e) => void update({ afterCapture: e.target.value as Settings['afterCapture'] })}>
              <option value="editor">Open it in the editor</option>
              <option value="library">Save to the library only</option>
            </Select>
          </Field>
        </Card>

        <Card title="Screen recording" id="recording" description="Defaults for new recordings. You can also change these on the recorder screen; FrameShot remembers your last choice.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Format" htmlFor="fr-s-rec-format" hint="MP4 (H.264) plays on every phone, Mac and PC.">
              <Select id="fr-s-rec-format" value={settings.recorder.format} onChange={(e) => void update({ recorder: { format: e.target.value as RecorderSettings['format'] } })}>
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
              </Select>
            </Field>
            <Field label="Quality" htmlFor="fr-s-rec-quality" hint="The largest size recorded; smaller screens keep their size.">
              <Select id="fr-s-rec-quality" value={settings.recorder.quality} onChange={(e) => void update({ recorder: { quality: e.target.value as RecorderSettings['quality'] } })}>
                {Object.entries(QUALITY_PRESETS).map(([k, q]) => (
                  <option key={k} value={k}>
                    {q.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Frame rate" htmlFor="fr-s-rec-fps">
              <Select id="fr-s-rec-fps" value={String(settings.recorder.fps)} onChange={(e) => void update({ recorder: { fps: Number(e.target.value) as RecorderSettings['fps'] } })}>
                <option value="15">15 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </Select>
            </Field>
            <Field label="Countdown before recording" htmlFor="fr-s-rec-countdown">
              <Select id="fr-s-rec-countdown" value={String(settings.recorder.countdown)} onChange={(e) => void update({ recorder: { countdown: Number(e.target.value) as RecorderSettings['countdown'] } })}>
                <option value="0">None</option>
                <option value="3">3 seconds</option>
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
              </Select>
            </Field>
          </div>
          <Switch label="Record tab & system sound" description="Sound from the shared tab (and the whole screen where Chrome offers it)." checked={settings.recorder.systemAudio} onChange={(v) => void update({ recorder: { systemAudio: v } })} />
          <p className="flex gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px] leading-snug text-fg-muted">
            <Mic size={15} className="mt-px shrink-0 text-primary" /> The microphone and camera are only used while you record, after you switch them on in the recorder. Chrome asks your permission the first time.
          </p>
          <Button icon={<Video size={15} />} onClick={() => navigate('/record')}>
            Open the recorder
          </Button>
        </Card>

        <Card title="Export & downloads" id="export" description="Formats, quality, file names and where files are saved.">
          <Field label="Default format">
            <SegmentedControl
              label="Default format"
              value={settings.defaultFormat}
              onChange={(defaultFormat) => void update({ defaultFormat })}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpeg', label: 'JPEG' },
                { value: 'webp', label: 'WebP' },
              ]}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingSlider label="JPEG quality" min={0.5} max={1} step={0.01} value={settings.jpegQuality} onSave={(v) => void update({ jpegQuality: v })} format={(v) => `${Math.round(v * 100)}%`} id="fr-jq" />
            <SettingSlider label="WebP quality" min={0.5} max={1} step={0.01} value={settings.webpQuality} onSave={(v) => void update({ webpQuality: v })} format={(v) => `${Math.round(v * 100)}%`} id="fr-wq" />
          </div>
          <Field label="File name template" htmlFor="fr-tpl" hint={<>Preview: <span className="font-mono text-fg-muted">{preview}</span></>}>
            <Input
              id="fr-tpl"
              value={template}
              maxLength={LIMITS.filenameTemplateMaxLength}
              onChange={(e) => setTemplate(e.target.value)}
              onBlur={() => void update({ filenameTemplate: template })}
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {FILENAME_TOKENS.map((t) => (
              <button key={t.token} type="button" title={t.description} className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted hover:border-border-strong" onClick={() => {
                const next = `${template}${template.endsWith('-') || !template ? '' : '-'}${t.token}`;
                setTemplate(next);
                void update({ filenameTemplate: next });
              }}>
                {t.token}
              </button>
            ))}
          </div>
          <Field label="Save into a folder inside Downloads" htmlFor="fr-folder" hint="Leave empty to save directly into your Downloads folder.">
            <Input id="fr-folder" value={folder} placeholder="e.g. FrameShot" onChange={(e) => setFolder(e.target.value)} onBlur={() => void update({ downloadFolder: sanitizeFolder(folder) })} />
          </Field>
          <Switch label="Ask where to save each file" checked={settings.askWhereToSave} onChange={(v) => void update({ askWhereToSave: v })} />
          <Field label="PDF page size" htmlFor="fr-pdf">
            <Select id="fr-pdf" value={settings.pdf.pageSize} onChange={(e) => void update({ pdf: { pageSize: e.target.value as Settings['pdf']['pageSize'] } })}>
              <option value="a4">A4 (long screenshots continue across pages)</option>
              <option value="letter">US Letter (long screenshots continue across pages)</option>
              <option value="image">Fit page to image</option>
            </Select>
          </Field>
          <SettingSlider label="PDF margin" min={0} max={72} value={settings.pdf.marginPt} onSave={(v) => void update({ pdf: { marginPt: v } })} format={(v) => `${v} pt`} id="fr-margin" />
        </Card>

        <Card title="Keyboard shortcuts" description="Chrome manages extension shortcuts. Change them on Chrome’s shortcuts page." id="shortcuts">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {commands
              .filter((c) => c.name !== '_execute_action')
              .map((c) => (
                <li key={c.name} className="flex items-center justify-between px-3 py-2 text-[13px]">
                  <span className="text-fg-muted">{c.description || c.name}</span>
                  {c.shortcut ? <kbd className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-sans text-[12px] font-medium">{c.shortcut}</kbd> : <span className="text-[12px] text-fg-subtle">Not set</span>}
                </li>
              ))}
          </ul>
          <p className="text-[12px] text-fg-subtle">If a suggested shortcut conflicts with another extension or with Chrome, it stays “Not set” until you choose one. Press <strong>Esc</strong> on the page to cancel a capture.</p>
          <Button icon={<Keyboard size={15} />} onClick={() => void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>
            Customize shortcuts
          </Button>
        </Card>

        <Card title="Storage" id="storage" description="Screenshots and recordings are stored only in this browser on this device.">
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <span>
              <strong>{stats?.count ?? 0}</strong> items · <strong>{formatBytes(stats?.usage ?? stats?.imageBytes ?? 0)}</strong> used
            </span>
            {stats?.quota ? <span className="text-[12px] text-fg-subtle">{formatBytes(stats.quota)} available to FrameShot</span> : null}
          </div>
          <Button
            variant="danger"
            icon={<Trash2 size={15} />}
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete all FrameShot data?',
                message: 'This permanently deletes every screenshot, recording, edit, and collection stored by FrameShot in this browser. Settings are kept. This cannot be undone.',
                confirmLabel: 'Delete everything',
                danger: true,
              });
              if (!ok) return;
              if (await queryRecorder(400)) {
                toast.error('A screen recording is in progress. Stop it before clearing all data.');
                return;
              }
              await clearAllData();
              setStats(await storageStats());
              toast.success('All local data deleted.');
            }}
          >
            Clear all local data
          </Button>
        </Card>

        <Card title="Privacy" id="privacy">
          <Switch
            id="fr-share-stats"
            label="Share anonymous install counts"
            description="Tells FrameShot’s server when it is installed, updated or removed, with a random ID, the version, your operating system and browser language. Nothing about the pages you capture, your screenshots or recordings, or your settings is ever sent. Turning this off also deletes the random ID."
            checked={settings.shareStats}
            onChange={(v) => void update({ shareStats: v })}
          />
          <ul className="space-y-2 text-[13px] text-fg-muted">
            <li className="flex gap-2"><Lock size={15} className="mt-0.5 shrink-0 text-success" /> Screenshots and recordings never leave your device. FrameShot has no accounts, ads, or analytics of what you do.</li>
            <li className="flex gap-2"><Shield size={15} className="mt-0.5 shrink-0 text-success" /> A strict Content Security Policy blocks FrameShot’s pages from connecting anywhere except its own install-count server.</li>
            <li className="flex gap-2"><Shield size={15} className="mt-0.5 shrink-0 text-success" /> FrameShot only accesses a tab when you start a capture on it (the “activeTab” permission).</li>
            <li className="flex gap-2"><Shield size={15} className="mt-0.5 shrink-0 text-success" /> Screen recording uses Chrome’s own share picker: you choose exactly which tab, window or screen is recorded, and Chrome shows that it is being shared.</li>
          </ul>
        </Card>

        <Card title="About" id="about">
          <div className="flex items-center justify-between">
            <Logo size={38} />
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium tabular-nums text-fg-muted">Version {version}</span>
          </div>
          <p className="text-[13px] leading-relaxed text-fg-muted">
            <strong className="text-fg">FrameShot</strong> — {BRAND.tagline} No subscriptions, no watermarks, no accounts, no locked features.
          </p>
          <p className="text-[13px] text-fg-subtle">{BRAND.principle}</p>
          {listed && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
              <p className="text-[13px] leading-snug text-fg-muted">FrameShot is free and stays that way. A rating on the Chrome Web Store helps others find it.</p>
              <Button
                size="sm"
                icon={<Star size={14} className="text-amber-500" fill="currentColor" />}
                onClick={() => {
                  void markReviewDone();
                  void chrome.tabs.create({ url: reviewUrl() });
                }}
                data-testid="settings-rate"
              >
                Rate FrameShot
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-500/[0.07] px-4 py-3">
            <p className="text-[13px] leading-snug text-fg-muted">Enjoying FrameShot? It’s free forever. If it saves you time, an optional tip helps keep it going.</p>
            <Button size="sm" icon={<Heart size={14} className="text-rose-500" fill="currentColor" />} onClick={() => navigate('/donate')} data-testid="settings-donate">
              Support FrameShot
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <DeveloperCard compact />
            <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />} onClick={() => navigate('/welcome')}>
              Show the welcome guide
            </Button>
          </div>
        </Card>
        <footer className="pb-6 pt-2">
          <Credits />
        </footer>
        </div>
      </div>
    </div>
  );
}
