/**
 * Frameora design-system primitives. Accessible by default: real <button>s,
 * visible focus rings (global :focus-visible), labels for icon-only controls.
 */
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import logoUrl from '../assets/logo.svg';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-card disabled:opacity-50',
  secondary: 'bg-surface text-fg border border-border hover:bg-surface-2 hover:border-border-strong disabled:opacity-50',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-2 disabled:opacity-40',
  danger: 'bg-danger text-white hover:bg-danger-hover disabled:opacity-50',
  soft: 'bg-primary-soft text-primary-soft-fg hover:brightness-95 dark:hover:brightness-125 disabled:opacity-50',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  variant?: 'ghost' | 'secondary';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, active, size = 'md', tooltipSide = 'bottom', variant = 'ghost', className, children, type = 'button', ...rest },
  ref,
) {
  const dims = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-9 w-9';
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      className={cx(
        'inline-flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        dims,
        active
          ? 'bg-primary-soft text-primary-soft-fg'
          : variant === 'secondary'
            ? 'border border-border bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg'
            : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
  return (
    <Tooltip content={label} shortcut={shortcut} side={tooltipSide}>
      {button}
    </Tooltip>
  );
});

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  shortcut,
  side = 'bottom',
  children,
}: {
  content: ReactNode;
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="fr-animate-in z-50 flex items-center gap-2 rounded-md bg-[#18181b] px-2 py-1 text-xs font-medium text-white shadow-pop dark:bg-[#f4f4f5] dark:text-[#18181b]"
        >
          {content}
          {shortcut && <Kbd className="!border-white/20 !bg-white/10 !text-white/80 dark:!border-black/10 dark:!bg-black/5 dark:!text-black/60">{shortcut}</Kbd>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-2 px-1 font-sans text-[11px] font-medium text-fg-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent', className)}
      style={{ animation: 'fr-spin 0.7s linear infinite' }}
    />
  );
}

export function Logo({ size = 28, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <img src={logoUrl} width={size} height={size} alt={withText ? '' : 'Frameora'} className="shrink-0" draggable={false} />
      {withText && <span className="text-[15px] font-semibold tracking-tight text-fg">Frameora</span>}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <label className={cx('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-fg-subtle">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-5 w-9 rounded-full bg-surface-3 transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        'h-9 rounded-lg border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 disabled:opacity-60',
        !/(^|\s)w-/.test(className ?? '') && 'w-full',
        className,
      )}
      {...rest}
    />
  );
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'h-9 cursor-pointer rounded-lg border border-border bg-surface px-2.5 text-sm text-fg transition-colors hover:border-border-strong focus:border-primary focus:outline-none',
        !/(^|\s)w-/.test(className ?? '') && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  format,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  format?: (v: number) => string;
  id?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <label htmlFor={id} className="font-medium text-fg-muted">
          {label}
        </label>
        <span className="tabular-nums text-fg-subtle">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        className="h-1.5 w-full cursor-pointer"
      />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex h-7 items-center justify-center gap-1 rounded-md px-2.5 text-[13px] font-medium transition-colors',
            value === o.value ? 'bg-surface text-fg shadow-card' : 'text-fg-subtle hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-fg">{icon}</div>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {children && <div className="mt-1.5 text-sm text-fg-subtle">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Banner({ tone = 'info', icon, children, action }: { tone?: 'info' | 'warning' | 'danger' | 'success'; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  const tones = {
    info: 'bg-primary-soft text-primary-soft-fg border-primary/20',
    warning: 'bg-warning-soft text-warning border-warning/25',
    danger: 'bg-danger-soft text-danger-soft-fg border-danger/25',
    success: 'bg-success-soft text-success border-success/25',
  } as const;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px]', tones[tone])}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
