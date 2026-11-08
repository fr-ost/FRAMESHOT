import { Ban } from 'lucide-react';
import { cx } from './primitives';

export const PALETTE = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#111827', '#6b7280', '#ffffff'];
export const HIGHLIGHT_PALETTE = ['#facc15', '#a3e635', '#67e8f9', '#f9a8d4', '#fdba74', '#c4b5fd'];

const NAMES: Record<string, string> = {
  '#ef4444': 'Red',
  '#f97316': 'Orange',
  '#facc15': 'Yellow',
  '#22c55e': 'Green',
  '#06b6d4': 'Cyan',
  '#3b82f6': 'Blue',
  '#6366f1': 'Indigo',
  '#a855f7': 'Purple',
  '#ec4899': 'Pink',
  '#111827': 'Black',
  '#6b7280': 'Gray',
  '#ffffff': 'White',
  '#000000': 'Black',
  '#a3e635': 'Lime',
  '#67e8f9': 'Light cyan',
  '#f9a8d4': 'Light pink',
  '#fdba74': 'Light orange',
  '#c4b5fd': 'Lavender',
};

export function ColorPicker({
  value,
  onChange,
  label,
  palette = PALETTE,
  allowNone,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  label: string;
  palette?: string[];
  allowNone?: boolean;
}) {
  const custom = value && !palette.includes(value.toLowerCase()) ? value : null;
  return (
    <div role="group" aria-label={label} className="space-y-1.5">
      <div className="text-[12px] font-medium text-fg-muted">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {allowNone && (
          <button
            type="button"
            aria-label="None"
            aria-pressed={value === null}
            title="None"
            onClick={() => onChange(null)}
            className={cx(
              'flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-fg-subtle',
              value === null && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
            )}
          >
            <Ban size={13} />
          </button>
        )}
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={NAMES[c] ?? c}
            aria-pressed={value?.toLowerCase() === c}
            title={NAMES[c] ?? c}
            onClick={() => onChange(c)}
            className={cx(
              'fr-press h-6 w-6 rounded-full border border-black/10 transition-transform duration-200 hover:scale-110 dark:border-white/15',
              value?.toLowerCase() === c && 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface',
            )}
            style={{ background: c }}
          />
        ))}
        <label
          title="Custom color"
          className={cx(
            'relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-black/10 dark:border-white/15',
            custom && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
          )}
          style={{ background: custom ?? 'conic-gradient(#ef4444, #facc15, #22c55e, #06b6d4, #6366f1, #ec4899, #ef4444)' }}
        >
          <span className="sr-only">Custom color</span>
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#ef4444'}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
