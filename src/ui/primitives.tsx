/**
 * FrameShot design-system primitives. Accessible by default: real <button>s,
 * visible focus rings (global :focus-visible), labels for icon-only controls.
 */
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ArrowUpRight } from 'lucide-react';
import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import logoUrl from '../assets/logo.svg';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'fr-btn-primary disabled:opacity-50',
  secondary:
    'border border-border bg-surface-solid/85 text-fg shadow-card hover:border-border-strong hover:bg-surface-solid disabled:opacity-50',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40',
  danger: 'bg-danger text-white shadow-card hover:bg-danger-hover disabled:opacity-50',
  soft: 'bg-primary-soft text-primary-soft-fg hover:bg-primary-soft/80 disabled:opacity-50',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-[11px]',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-[13px]',
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
        'fr-press inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,filter] duration-200 disabled:cursor-not-allowed',
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
  /** "solid" gives the active state the gradient accent (tool rails). */
  activeStyle?: 'soft' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  variant?: 'ghost' | 'secondary';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, active, activeStyle = 'soft', size = 'md', tooltipSide = 'bottom', variant = 'ghost', className, children, type = 'button', ...rest },
  ref,
) {
  const dims = size === 'sm' ? 'h-7 w-7 rounded-[9px]' : size === 'lg' ? 'h-10 w-10 rounded-[12px]' : 'h-9 w-9 rounded-[11px]';
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      className={cx(
        'fr-press inline-flex items-center justify-center transition-[background-color,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-40',
        dims,
        active
          ? activeStyle === 'solid'
            ? 'fr-accent-bg text-white shadow-glow'
            : 'bg-primary-soft text-primary-soft-fg'
          : variant === 'secondary'
            ? 'border border-border bg-surface text-fg-muted hover:bg-surface-solid hover:text-fg'
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
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={120}>
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
          sideOffset={7}
          className="fr-pop z-50 flex items-center gap-2 rounded-[9px] border border-white/10 bg-[#111118]/92 px-2.5 py-1.5 text-xs font-medium text-white shadow-pop backdrop-blur-md"
        >
          {content}
          {shortcut && <Kbd className="!border-white/15 !bg-white/10 !text-white/75">{shortcut}</Kbd>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] border border-border bg-surface-2 px-1.5 font-sans text-[11px] font-medium text-fg-muted shadow-[inset_0_-1px_0_var(--fr-border)]',
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
      className={cx('inline-block h-4 w-4 rounded-full', className)}
      style={{
        background: 'conic-gradient(from 90deg, transparent 0deg, currentColor 300deg)',
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
        animation: 'fr-spin 0.8s linear infinite',
      }}
    />
  );
}

export function Logo({ size = 28, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <img
        src={logoUrl}
        width={size}
        height={size}
        alt={withText ? '' : 'FrameShot'}
        className="shrink-0 drop-shadow-[0_4px_12px_rgba(99,102,241,0.35)]"
        draggable={false}
      />
      {withText && <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">FrameShot</span>}
    </span>
  );
}

/** Fixed, slowly drifting aurora behind the whole app. */
export function Aurora() {
  return (
    <div className="fr-aurora" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'warning' | 'success'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-3 text-fg-muted',
    primary: 'bg-primary-soft text-primary-soft-fg',
    warning: 'bg-warning-soft text-warning',
    success: 'bg-success-soft text-success',
  } as const;
  return <span className={cx('inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide', tones[tone], className)}>{children}</span>;
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
    <label className={cx('group flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-fg-subtle">{description}</span>}
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
        <span className="h-[22px] w-[38px] rounded-full bg-surface-3 shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] transition-colors duration-300 peer-checked:bg-[linear-gradient(135deg,var(--fr-accent-1),var(--fr-accent-2))] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring" />
        <span
          className="pointer-events-none absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform duration-300 peer-checked:translate-x-4"
          style={{ transitionTimingFunction: 'var(--fr-ease-spring)' }}
        />
      </span>
    </label>
  );
}

const fieldBase =
  'h-9 rounded-[11px] border border-border bg-surface-solid/85 text-sm text-fg shadow-[inset_0_1px_0_var(--fr-surface-2)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:border-border-strong focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 focus-visible:outline-none disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(fieldBase, 'px-3', !/(^|\s)w-/.test(className ?? '') && 'w-full', className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, 'fr-select cursor-pointer pl-3', !/(^|\s)w-/.test(className ?? '') && 'w-full', className)} {...rest}>
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
      {hint && <p className="text-xs leading-relaxed text-fg-subtle">{hint}</p>}
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
  const fill = `${((Math.min(max, Math.max(min, value)) - min) / (max - min || 1)) * 100}%`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <label htmlFor={id} className="font-medium text-fg-muted">
          {label}
        </label>
        <span className="rounded-md bg-surface-2 px-1.5 py-px font-medium tabular-nums text-fg-muted">{format ? format(value) : value}</span>
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
        className="fr-range w-full"
        style={{ '--fill': fill } as CSSProperties}
      />
    </div>
  );
}

/** Segmented control with a sliding selection indicator. */
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
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el || !wrap.current) return;
    const update = () => setPill({ left: el.offsetLeft, width: el.offsetWidth });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, options.length]);
  return (
    <div
      ref={wrap}
      role="radiogroup"
      aria-label={label}
      className="relative inline-flex rounded-[11px] border border-border bg-surface-2 p-[3px]"
      onKeyDown={(e) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const i = options.findIndex((o) => o.value === value);
        const next = options[(i + step + options.length) % options.length];
        onChange(next.value);
        requestAnimationFrame(() => wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
      }}
    >
      {pill && (
        <span
          aria-hidden
          className="absolute bottom-[3px] top-[3px] rounded-[8px] bg-surface-solid shadow-card transition-[left,width] duration-300"
          style={{ left: pill.left, width: pill.width, transitionTimingFunction: 'var(--fr-ease)' }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'relative z-10 inline-flex h-7 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium transition-colors duration-200',
            value === o.value ? 'text-fg' : 'text-fg-subtle hover:text-fg',
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
    <div className="fr-animate-in mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-7">
        <div className="fr-accent-bg absolute inset-0 rounded-[22px] opacity-40 blur-2xl" aria-hidden />
        <div className="fr-rings rounded-[22px]" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="fr-float fr-accent-bg relative flex h-16 w-16 items-center justify-center rounded-[22px] text-white shadow-glow">{icon}</div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
      {children && <div className="mt-2 text-sm leading-relaxed text-fg-subtle">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
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
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('fr-animate-in flex items-start gap-2.5 rounded-[12px] border px-3 py-2 text-[13px]', tones[tone])}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

// ── Credits ──────────────────────────────────────────────────────────────

/** Developer website (opened in a new tab only when clicked). */
export const DEVELOPER_URL = 'https://www.shahriarahmed.net';
/** Set this once the Unique Labs website is live to hyperlink the name. */
export const UNIQUE_LABS_URL: string | null = null;

const creditLink =
  'group/link inline-flex items-center gap-0.5 font-medium text-fg-muted underline decoration-transparent underline-offset-[3px] transition-colors duration-200 hover:text-fg hover:decoration-current';

export function Credits({ className, align = 'center' }: { className?: string; align?: 'center' | 'start' }) {
  const link = (href: string, text: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={creditLink}>
      {text}
      <ArrowUpRight size={11} className="opacity-0 transition-[opacity,transform] duration-200 group-hover/link:-translate-y-px group-hover/link:translate-x-px group-hover/link:opacity-70" aria-hidden />
    </a>
  );
  return (
    <p className={cx('text-[11.5px] leading-relaxed text-fg-subtle', align === 'center' ? 'text-center' : 'text-left', className)}>
      A Product of {UNIQUE_LABS_URL ? link(UNIQUE_LABS_URL, 'Unique Labs') : <span className="font-medium text-fg-muted">Unique Labs</span>}. Developed by{' '}
      {link(DEVELOPER_URL, 'Shahriar Ahmed')}
    </p>
  );
}
