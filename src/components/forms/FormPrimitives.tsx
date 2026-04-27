import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const INPUT_CLASS =
  'w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2.5 py-1.5 font-body text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gilt)]/40';

export const SELECT_CLASS =
  'h-9 w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm';

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <header>
        <h3 className="font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs italic text-[var(--color-ink-soft)]">
            {description}
          </p>
        )}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className={cn('flex flex-col gap-1 text-sm', className)}>
      <span className="font-display text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
        {required && <span className="ml-1 text-[var(--color-rust)]">*</span>}
      </span>
      {children}
      {hint && (
        <span className="text-[10px] italic text-[var(--color-ink-faint)]">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={INPUT_CLASS}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  disabled,
  nullable,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  nullable?: boolean;
}): React.JSX.Element {
  const [text, setText] = React.useState(value === null ? '' : String(value));
  React.useEffect(() => {
    setText(value === null ? '' : String(value));
  }, [value]);
  return (
    <input
      type="number"
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value === '') {
          if (nullable) onChange(null);
          return;
        }
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onChange(n);
      }}
      className={cn(INPUT_CLASS, 'font-mono')}
    />
  );
}

export function TextareaInput({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={cn(INPUT_CLASS, 'resize-y')}
    />
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      disabled={disabled}
      className={SELECT_CLASS}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function StringListEditor({
  values,
  onChange,
  placeholder,
  addLabel = 'Add item',
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}): React.JSX.Element {
  const updateAt = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  const removeAt = (i: number) => {
    const next = values.filter((_, idx) => idx !== i);
    onChange(next);
  };
  const add = () => onChange([...values, '']);
  return (
    <div className="flex flex-col gap-1.5">
      {values.length === 0 && (
        <p className="text-[10px] italic text-[var(--color-ink-faint)]">
          (none)
        </p>
      )}
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="text"
            value={v}
            onChange={(e) => updateAt(i, e.target.value)}
            placeholder={placeholder}
            className={INPUT_CLASS}
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label="Remove"
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex w-fit items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
      >
        <Plus className="h-3 w-3" aria-hidden /> {addLabel}
      </button>
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: React.ReactNode;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded-sm border-[var(--color-parchment-400)]"
      />
      <span className="text-[var(--color-ink)]">{label}</span>
      {hint && (
        <span className="text-[10px] italic text-[var(--color-ink-faint)]">
          {hint}
        </span>
      )}
    </label>
  );
}

export function FormError({
  error,
}: {
  error: string | null | undefined;
}): React.JSX.Element | null {
  if (!error) return null;
  return (
    <div className="rounded-sm border border-[var(--color-rust)]/60 bg-[var(--color-rust)]/10 p-2 text-xs text-[var(--color-rust)]">
      {error}
    </div>
  );
}
