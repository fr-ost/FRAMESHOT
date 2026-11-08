/** Dialogs, menus, popovers and toasts (Radix primitives, animated). */
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
        <DialogPrimitive.Overlay className="fr-overlay fixed inset-0 z-50 bg-overlay backdrop-blur-[6px]" />
        <DialogPrimitive.Content
          className="fr-dialog fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[22px] border border-border bg-surface-solid/95 p-6 shadow-pop backdrop-blur-2xl focus:outline-none"
          style={{ maxWidth: width }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-[17px] font-semibold tracking-tight text-fg">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-fg-subtle">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="fr-press -mr-1.5 -mt-1.5 inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label="Close"
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          {children}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
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
        sideOffset={8}
        className={cx(
          'fr-pop z-50 min-w-[220px] rounded-[16px] border border-border bg-surface-solid/90 p-1.5 shadow-pop backdrop-blur-2xl focus:outline-none',
          className,
        )}
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
        'group flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] font-medium outline-none transition-colors duration-150 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
        danger ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-fg data-[highlighted]:bg-surface-2',
      )}
    >
      {icon && (
        <span className={cx('flex w-4 justify-center transition-colors', danger ? 'text-danger' : 'text-fg-subtle group-data-[highlighted]:text-primary')}>{icon}</span>
      )}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-fg-subtle">{shortcut}</span>}
    </Menu.Item>
  );
}

export function DropdownSeparator() {
  return <Menu.Separator className="mx-1 my-1.5 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{children}</Menu.Label>;
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
          sideOffset={8}
          className="fr-pop z-50 rounded-[16px] border border-border bg-surface-solid/90 p-3 shadow-pop backdrop-blur-2xl focus:outline-none"
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
  leaving?: boolean;
  duration: number;
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
  const remove = useCallback((id: number) => {
    // Play the exit animation, then unmount.
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 230);
  }, []);
  const show = useCallback(
    (message: ReactNode, tone: ToastTone = 'info', action?: ToastItem['action']) => {
      const id = ++counter.current;
      const duration = tone === 'error' ? 8000 : 4500;
      setItems((list) => [...list.slice(-3), { id, tone, message, action, duration }]);
      setTimeout(() => remove(id), duration);
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
    success: <CheckCircle2 size={17} className="text-success" />,
    error: <XCircle size={17} className="text-danger" />,
    info: <Info size={17} className="text-primary" />,
    warning: <AlertTriangle size={17} className="text-warning" />,
  };
  const bar = {
    success: 'bg-success',
    error: 'bg-danger',
    info: 'fr-accent-bg',
    warning: 'bg-warning',
  };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[380px] max-w-[calc(100vw-40px)] flex-col gap-2.5">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[16px] border border-border bg-surface-solid/90 px-4 py-3.5 text-sm text-fg shadow-pop backdrop-blur-2xl',
              t.leaving ? 'fr-toast-leave' : 'fr-toast-enter',
            )}
          >
            <span className="mt-px">{icons[t.tone]}</span>
            <div className="min-w-0 flex-1 break-words leading-snug">{t.message}</div>
            {t.action && (
              <button
                type="button"
                className="fr-press text-[13px] font-semibold text-primary hover:underline"
                onClick={() => {
                  t.action!.onClick();
                  remove(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss notification" className="fr-press text-fg-subtle transition-colors hover:text-fg" onClick={() => remove(t.id)}>
              <X size={14} />
            </button>
            {/* Time remaining */}
            <span
              aria-hidden
              className={cx('absolute bottom-0 left-0 h-[2px] origin-left opacity-60', bar[t.tone])}
              style={{ width: '100%', animation: `fr-toast-timer ${t.duration}ms linear forwards` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
