import { ArrowLeft, ExternalLink, Keyboard, Lock, Shield, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { buildFilename, FILENAME_TOKENS } from '../core/filename';
import { formatBytes } from '../core/format';
import { DEFAULT_SETTINGS, LIMITS, saveSettings, sanitizeFolder, type Settings, type DeepPartial, mergeSettings } from '../core/settings';
import { clearAllData, storageStats, type StorageStats } from '../db/db';
import { navigate } from '../ui/hooks';
import { useConfirm, useToast } from '../ui/overlays';
import { Button, Field, Input, Logo, SegmentedControl, Select, Slider, Switch } from '../ui/primitives';

function Card({ title, description, children, id }: { title: string; description?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-fg-subtle">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function SettingsPage({ settings }: { settings: Settings }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [commands, setCommands] = useState<chrome.commands.Command[]>([]);
  const [template, setTemplate] = useState(settings.filenameTemplate);
  const [folder, setFolder] = useState(settings.downloadFolder);

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
    <div className="fr-scroll h-full overflow-y-auto">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Library
        </Button>
        <h1 className="text-[15px] font-semibold">Settings</h1>
      </header>
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-8">
        <Card title="Appearance">
          <Field label="Theme">
            <SegmentedControl
              label="Theme"
              value={settings.theme}
              onChange={(theme) => void update({ theme })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Field>
        </Card>

        <Card title="Capture" description="How Frameora captures long pages. These apply to full-page, element, and scrolling-area captures.">
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
          <Slider label="Delay between scroll steps" min={LIMITS.settleDelayMs.min} max={2000} step={50} value={settings.capture.settleDelayMs} onChange={(v) => void update({ capture: { settleDelayMs: v } })} format={(v) => `${v} ms`} id="fr-settle" />
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

        <Card title="Export & downloads">
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
            <Slider label="JPEG quality" min={0.5} max={1} step={0.01} value={settings.jpegQuality} onChange={(v) => void update({ jpegQuality: v })} format={(v) => `${Math.round(v * 100)}%`} id="fr-jq" />
            <Slider label="WebP quality" min={0.5} max={1} step={0.01} value={settings.webpQuality} onChange={(v) => void update({ webpQuality: v })} format={(v) => `${Math.round(v * 100)}%`} id="fr-wq" />
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
            <Input id="fr-folder" value={folder} placeholder="e.g. Frameora" onChange={(e) => setFolder(e.target.value)} onBlur={() => void update({ downloadFolder: sanitizeFolder(folder) })} />
          </Field>
          <Switch label="Ask where to save each file" checked={settings.askWhereToSave} onChange={(v) => void update({ askWhereToSave: v })} />
          <Field label="PDF page size" htmlFor="fr-pdf">
            <Select id="fr-pdf" value={settings.pdf.pageSize} onChange={(e) => void update({ pdf: { pageSize: e.target.value as Settings['pdf']['pageSize'] } })}>
              <option value="a4">A4 (long screenshots continue across pages)</option>
              <option value="letter">US Letter (long screenshots continue across pages)</option>
              <option value="image">Fit page to image</option>
            </Select>
          </Field>
          <Slider label="PDF margin" min={0} max={72} value={settings.pdf.marginPt} onChange={(v) => void update({ pdf: { marginPt: v } })} format={(v) => `${v} pt`} id="fr-margin" />
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

        <Card title="Storage" description="Screenshots are stored only in this browser on this device.">
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <span>
              <strong>{stats?.count ?? 0}</strong> items · <strong>{formatBytes(stats?.usage ?? stats?.imageBytes ?? 0)}</strong> used
            </span>
            {stats?.quota ? <span className="text-[12px] text-fg-subtle">{formatBytes(stats.quota)} available to Frameora</span> : null}
          </div>
          <Button
            variant="danger"
            icon={<Trash2 size={15} />}
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete all Frameora data?',
                message: 'This permanently deletes every screenshot, edit, and collection stored by Frameora in this browser. Settings are kept. This cannot be undone.',
                confirmLabel: 'Delete everything',
                danger: true,
              });
              if (!ok) return;
              await clearAllData();
              setStats(await storageStats());
              toast.success('All local data deleted.');
            }}
          >
            Clear all local data
          </Button>
        </Card>

        <Card title="Privacy">
          <ul className="space-y-2 text-[13px] text-fg-muted">
            <li className="flex gap-2"><Lock size={15} className="mt-0.5 shrink-0 text-success" /> Screenshots never leave your device. Frameora has no servers, accounts, analytics, or tracking.</li>
            <li className="flex gap-2"><Shield size={15} className="mt-0.5 shrink-0 text-success" /> Frameora’s pages block all network connections through a strict Content Security Policy.</li>
            <li className="flex gap-2"><Shield size={15} className="mt-0.5 shrink-0 text-success" /> Frameora only accesses a tab when you start a capture on it (the “activeTab” permission).</li>
          </ul>
        </Card>

        <Card title="About">
          <div className="flex items-center justify-between">
            <Logo size={36} />
            <span className="text-[12px] text-fg-subtle">Version {version}</span>
          </div>
          <p className="text-[13px] text-fg-muted">
            <strong>Frameora: Free Screenshot &amp; Full Page Capture</strong> — capture the web, edit every detail. Free forever: no subscriptions, no watermarks, no accounts, no locked features.
          </p>
          <p className="text-[13px] text-fg-subtle">A Unique Labs product. Useful technology. Accessible to everyone.</p>
          <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />} onClick={() => navigate('/welcome')}>
            Show the welcome guide
          </Button>
        </Card>
      </div>
    </div>
  );
}
