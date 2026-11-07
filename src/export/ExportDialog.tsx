import { useEffect, useState } from 'react';
import type { PdfPageSize, Settings } from '../core/settings';
import type { ExportFormat } from '../core/types';
import { Dialog } from '../ui/overlays';
import { Button, Field, SegmentedControl, Select, Slider, Spinner, Switch } from '../ui/primitives';

export interface ExportChoice {
  format: ExportFormat;
  quality: number;
  pageSize: PdfPageSize;
  compactPdf: boolean;
  saveAs: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  settings,
  onExport,
  title = 'Export',
  count = 1,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: Settings;
  onExport: (choice: ExportChoice) => Promise<void>;
  title?: string;
  count?: number;
}) {
  const [choice, setChoice] = useState<ExportChoice>(() => initial(settings));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setChoice(initial(settings));
  }, [open, settings]);

  const lossy = choice.format === 'jpeg' || choice.format === 'webp';
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      title={title}
      description={count > 1 ? `${count} screenshots · ${choice.format === 'pdf' ? 'combined into one PDF' : 'downloaded as one ZIP archive'}` : 'Choose a format. Exports never include watermarks.'}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            icon={busy ? <Spinner /> : undefined}
            onClick={async () => {
              setBusy(true);
              try {
                await onExport(choice);
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Exporting…' : 'Export'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Format">
          <SegmentedControl
            label="Format"
            value={choice.format}
            onChange={(f) => setChoice({ ...choice, format: f })}
            options={[
              { value: 'png', label: 'PNG', title: 'Lossless, best for text and UI' },
              { value: 'jpeg', label: 'JPEG', title: 'Smaller files for photos' },
              { value: 'webp', label: 'WebP', title: 'Modern, compact format' },
              { value: 'pdf', label: 'PDF', title: 'Document; long pages span multiple pages' },
            ]}
          />
        </Field>
        {lossy && (
          <Slider
            label="Quality"
            min={0.5}
            max={1}
            step={0.01}
            value={choice.quality}
            onChange={(q) => setChoice({ ...choice, quality: q })}
            format={(q) => `${Math.round(q * 100)}%`}
            id="fr-export-quality"
          />
        )}
        {choice.format === 'pdf' && (
          <>
            <Field label="Page size" htmlFor="fr-pdf-size">
              <Select id="fr-pdf-size" value={choice.pageSize} onChange={(e) => setChoice({ ...choice, pageSize: e.target.value as PdfPageSize })}>
                <option value="a4">A4 — long screenshots continue across pages</option>
                <option value="letter">US Letter — long screenshots continue across pages</option>
                <option value="image">Fit page to image (single page)</option>
              </Select>
            </Field>
            <Switch label="Smaller file" description="Uses JPEG compression inside the PDF." checked={choice.compactPdf} onChange={(c) => setChoice({ ...choice, compactPdf: c })} />
          </>
        )}
        <Switch label="Ask where to save" checked={choice.saveAs} onChange={(s) => setChoice({ ...choice, saveAs: s })} />
      </div>
    </Dialog>
  );
}

function initial(settings: Settings): ExportChoice {
  return {
    format: settings.defaultFormat,
    quality: settings.defaultFormat === 'webp' ? settings.webpQuality : settings.jpegQuality,
    pageSize: settings.pdf.pageSize,
    compactPdf: false,
    saveAs: settings.askWhereToSave,
  };
}
