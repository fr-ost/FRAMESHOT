import {
  ArrowUpRight,
  Circle,
  Crop,
  EyeOff,
  Grid3x3,
  Hand,
  Highlighter,
  MousePointer2,
  Pencil,
  RectangleHorizontal,
  Slash,
  Square,
  Stamp,
  Type,
  Droplets,
  Hash,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '../../ui/primitives';
import type { ToolId } from '../model/store';

export interface ToolDef {
  id: ToolId;
  label: string;
  shortcut: string;
  icon: ReactNode;
}

const S = 18;
export const TOOL_GROUPS: ToolDef[][] = [
  [
    { id: 'select', label: 'Select & move', shortcut: 'V', icon: <MousePointer2 size={S} /> },
    { id: 'pan', label: 'Pan (hold Space)', shortcut: 'Space', icon: <Hand size={S} /> },
    { id: 'crop', label: 'Crop', shortcut: 'C', icon: <Crop size={S} /> },
  ],
  [
    { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: <ArrowUpRight size={S} /> },
    { id: 'line', label: 'Line', shortcut: 'L', icon: <Slash size={S} /> },
    { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: <Square size={S} /> },
    { id: 'roundrect', label: 'Rounded rectangle', shortcut: 'U', icon: <RectangleHorizontal size={S} /> },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: <Circle size={S} /> },
    { id: 'pen', label: 'Pen', shortcut: 'P', icon: <Pencil size={S} /> },
    { id: 'highlighter', label: 'Highlighter', shortcut: 'H', icon: <Highlighter size={S} /> },
    { id: 'text', label: 'Text', shortcut: 'T', icon: <Type size={S} /> },
    { id: 'marker', label: 'Numbered step', shortcut: 'N', icon: <Hash size={S} /> },
    { id: 'symbol', label: 'Symbol', shortcut: 'S', icon: <Stamp size={S} /> },
  ],
  [
    { id: 'blur', label: 'Blur', shortcut: 'B', icon: <Droplets size={S} /> },
    { id: 'pixelate', label: 'Pixelate', shortcut: 'X', icon: <Grid3x3 size={S} /> },
    { id: 'redact', label: 'Redact (solid)', shortcut: 'D', icon: <EyeOff size={S} /> },
  ],
];

export const TOOL_SHORTCUTS: Record<string, ToolId> = Object.fromEntries(
  TOOL_GROUPS.flat()
    .filter((t) => t.shortcut.length === 1)
    .map((t) => [t.shortcut.toLowerCase(), t.id]),
);

export function Toolbar({ tool, onTool }: { tool: ToolId; onTool: (t: ToolId) => void }) {
  return (
    <div className="relative z-10 flex shrink-0 py-3 pl-3">
      <nav
        aria-label="Editing tools"
        className="fr-glass fr-scroll flex w-[52px] flex-col items-center gap-1 overflow-y-auto rounded-[18px] border border-border py-2 shadow-pop"
      >
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col items-center gap-1">
            {gi > 0 && <div className="my-1 h-px w-6 bg-border" aria-hidden />}
            {group.map((t) => (
              <IconButton
                key={t.id}
                label={t.label}
                shortcut={t.shortcut}
                active={tool === t.id}
                activeStyle="solid"
                tooltipSide="right"
                onClick={() => onTool(t.id)}
                data-tool={t.id}
              >
                {t.icon}
              </IconButton>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
