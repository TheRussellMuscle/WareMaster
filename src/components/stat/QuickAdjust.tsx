import * as React from 'react';

interface QuickAdjustProps {
  label: React.ReactNode;
  value: number;
  /** Value to display in place of `value` (e.g. wrapped in a UnitTooltip). */
  display?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void | Promise<void>;
  /** When true, renders inline `label: − value +` instead of a stacked block. */
  inline?: boolean;
}

/**
 * Two-button (− / +) value adjuster with clamped bounds. Used for in-place
 * tweaks of LUC, Golda, Completion Bonus, etc., bypassing the sheet's
 * Edit-mode form for fast adjustments during play.
 */
export function QuickAdjust({
  label,
  value,
  display,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  onChange,
  inline,
}: QuickAdjustProps): React.JSX.Element {
  const dec = () => {
    if (value <= min) return;
    void onChange(Math.max(min, value - step));
  };
  const inc = () => {
    if (value >= max) return;
    void onChange(Math.min(max, value + step));
  };

  const buttons = (
    <>
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0 text-[10px] hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-30"
        aria-label={`Decrease ${typeof label === 'string' ? label : 'value'}`}
      >
        −
      </button>
      <span className="min-w-6 text-center font-mono text-[var(--color-ink)]">
        {display ?? value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0 text-[10px] hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-30"
        aria-label={`Increase ${typeof label === 'string' ? label : 'value'}`}
      >
        +
      </button>
    </>
  );

  if (inline) {
    return (
      <div className="flex items-baseline gap-1.5 text-sm">
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {label}
        </span>
        {buttons}
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="flex items-baseline gap-1">{buttons}</div>
    </div>
  );
}
