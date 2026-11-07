/** Dialogs, menus, popovers and toasts (Radix primitives, Frameora styling). */
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, cx } from './primitives';

// ── Dialog ──

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 440,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="fr-animate-in fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-border bg-surface p-5 shadow-pop focus:outline-none"
          style={{ maxWidth: width }}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-fg">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-fg-subtle">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
              aria-label="Close"
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          {children}
          {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Confirmation dialog (promise-based) ──

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({ ...opts, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);
  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((s) => (s ? { ...s, open: false } : s));
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Dialog
          open={state.open}
          onOpenChange={(o) => !o && close(false)}
          title={state.title}
          description={state.message}
          footer={
            <>
              <Button onClick={() => close(false)}>Cancel</Button>
              <Button variant={state.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                {state.confirmLabel ?? 'Confirm'}
              </Button>
            </>
          }
        />
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// ── Dropdown menu ──

export const DropdownMenu = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export function DropdownContent({ children, align = 'end', className }: { children: ReactNode; align?: 'start' | 'end' | 'center'; className?: string }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className={cx('fr-animate-in z-50 min-w-[200px] rounded-xl border border-border bg-surface p-1 shadow-pop focus:outline-none', className)}
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

export function DropdownItem({
  children,
  icon,
  onSelect,
  danger,
  disabled,
  shortcut,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}) {
  return (
    <Menu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cx(
        'flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 text-[13px] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
        danger ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-fg data-[highlighted]:bg-surface-2',
      )}
    >
      {icon && <span className="flex w-4 justify-center text-fg-subtle">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-fg-subtle">{shortcut}</span>}
    </Menu.Item>
  );
}

export function DropdownSeparator() {
  return <Menu.Separator className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{children}</Menu.Label>;
}

// ── Popover ──

export function Popover({ trigger, children, align = 'start', side = 'bottom' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'center' | 'end'; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          className="fr-animate-in z-50 rounded-xl border border-border bg-surface p-3 shadow-pop focus:outline-none"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// ── Toasts ──

type ToastTone = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: ReactNode;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show(message: ReactNode, tone?: ToastTone, action?: ToastItem['action']): void;
  success(message: ReactNode): void;
  error(message: ReactNode): void;
  info(message: ReactNode): void;
}

const ToastContext = createContext<ToastApi>({ show() {}, success() {}, error() {}, info() {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const remove = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (message: ReactNode, tone: ToastTone = 'info', action?: ToastItem['action']) => {
      const id = ++counter.current;
      setItems((list) => [...list.slice(-3), { id, tone, message, action }]);
      setTimeout(() => remove(id), tone === 'error' ? 8000 : 4500);
    },
    [remove],
  );
  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
    }),
    [show],
  );
  const icons = {
    success: <CheckCircle2 size={16} className="text-success" />,
    error: <XCircle size={16} className="text-danger" />,
    info: <Info size={16} className="text-primary" />,
    warning: <AlertTriangle size={16} className="text-warning" />,
  };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="fr-animate-in pointer-events-auto flex items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-fg shadow-pop"
          >
            <span className="mt-0.5">{icons[t.tone]}</span>
            <div className="min-w-0 flex-1 break-words">{t.message}</div>
            {t.action && (
              <button
                type="button"
                className="text-[13px] font-semibold text-primary hover:underline"
                onClick={() => {
                  t.action!.onClick();
                  remove(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss notification" className="text-fg-subtle hover:text-fg" onClick={() => remove(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
