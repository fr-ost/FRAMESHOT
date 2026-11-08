/** Keyboard shortcuts sheet. Opens with "?" anywhere in the Studio. */
import { Keyboard } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { isTypingTarget } from '../ui/hooks';
import { Dialog } from '../ui/overlays';
import { Button, Kbd } from '../ui/primitives';

export const SHORTCUTS_EVENT = 'frameshot:shortcuts';

export function openShortcuts(): void {
  window.dispatchEvent(new Event(SHORTCUTS_EVENT));
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </span>
  );
}

function Group({ title, rows }: { title: string; rows: [ReactNode, string[]][] }) {
  return (
    <section className="break-inside-avoid pb-4">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{title}</h3>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {rows.map(([label, keys], i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[12.5px] text-fg-muted">
            <span className="min-w-0">{label}</span>
            <Keys keys={keys} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<chrome.commands.Command[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target) || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setOpen(true);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(SHORTCUTS_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(SHORTCUTS_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) void chrome.commands.getAll().then(setCommands, () => setCommands([]));
  }, [open]);

  const chromeRows: [ReactNode, string[]][] = commands
    .filter((c) => c.name !== '_execute_action')
    .map((c) => [c.description || c.name || '', c.shortcut ? c.shortcut.split('+') : ['Not set']]);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Keyboard shortcuts"
      description="Capture shortcuts work on any page; the rest work inside FrameShot Studio."
      width={760}
      footer={
        <>
          <Button icon={<Keyboard size={15} />} onClick={() => void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>
            Change capture shortcuts
          </Button>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </>
      }
    >
      <div className="columns-1 gap-5 sm:columns-2" data-testid="shortcuts-sheet">
        <Group title="Anywhere in Chrome" rows={chromeRows.length ? chromeRows : [['Loading…', ['…']]]} />
        <Group
          title="While capturing a page"
          rows={[
            ['Cancel the capture', ['Esc']],
            ['Confirm the selected area', ['Enter']],
            ['Element: select the parent / child', ['↑', '↓']],
          ]}
        />
        <Group
          title="Library"
          rows={[
            ['Search', ['/']],
            ['Select everything shown', [MOD, 'A']],
            ['Select a range', ['Shift', 'Click']],
            ['Delete the selection', ['Delete']],
            ['Clear the selection', ['Esc']],
          ]}
        />
        <Group
          title="Recording player"
          rows={[
            ['Play / pause', ['Space']],
            ['Back / forward 5 seconds', ['←', '→']],
            ['Previous / next frame', [',', '.']],
            ['Full screen', ['F']],
            ['Mute', ['M']],
            ['Save the frame as a screenshot', ['S']],
            ['Export as GIF', ['G']],
          ]}
        />
        <Group
          title="Editor tools"
          rows={[
            ['Select & move · Crop', ['V', 'C']],
            ['Arrow · Line', ['A', 'L']],
            ['Rectangle · Rounded · Ellipse', ['R', 'U', 'O']],
            ['Pen · Highlighter · Text', ['P', 'H', 'T']],
            ['Numbered step · Symbol', ['N', 'S']],
            ['Blur · Pixelate · Redact', ['B', 'X', 'D']],
            ['Pan (hold)', ['Space']],
          ]}
        />
        <Group
          title="Editor actions"
          rows={[
            ['Undo / redo', [MOD, 'Z', '/', MOD, 'Shift', 'Z']],
            ['Duplicate · Select all', [MOD, 'D', '·', MOD, 'A']],
            ['Copy image · Export', [MOD, 'C', '·', MOD, 'S']],
            ['Delete the selection', ['Delete']],
            ['Nudge (Shift: 10 px)', ['←', '↑', '→', '↓']],
            ['Zoom in / out · Fit · 100%', ['+', '−', '0', '1']],
            ['Bring forward / send backward', [']', '[']],
          ]}
        />
        <Group title="This sheet" rows={[['Show keyboard shortcuts', ['?']]]} />
      </div>
    </Dialog>
  );
}
