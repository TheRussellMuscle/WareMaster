import * as React from 'react';
import { cn } from '@/lib/cn';

interface DiceInputsProps {
  count: number;
  faces: 10 | 5;
  values: number[];
  onChange: (next: number[]) => void;
  /** Disable interaction (used while rolling). */
  disabled?: boolean;
  className?: string;
  label?: React.ReactNode;
}

/**
 * Row of N narrow number inputs for entering manual dice values (the player
 * rolled physical dice and the WM types each face into this control). Each
 * input clamps to `[1, faces]`.
 */
export function DiceInputs({
  count,
  faces,
  values,
  onChange,
  disabled,
  className,
  label,
}: DiceInputsProps): React.JSX.Element {
  // Reconcile values[] length with `count` so removing a LUC die doesn't
  // leave stale entries in state.
  React.useEffect(() => {
    if (values.length !== count) {
      const next = new Array(count).fill(1).map((_, i) => values[i] ?? 1);
      onChange(next);
    }
    // We intentionally only run this when count changes — values updates
    // come from the user typing, which we want to leave alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const update = (i: number, raw: string) => {
    const next = values.slice();
    if (raw === '') {
      next[i] = 1;
    } else {
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) return;
      next[i] = Math.max(1, Math.min(faces, n));
    }
    onChange(next);
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <input
            key={i}
            type="number"
            min={1}
            max={faces}
            value={values[i] ?? 1}
            disabled={disabled}
            onChange={(e) => update(i, e.target.value)}
            className="h-8 w-12 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gilt)]/40 disabled:opacity-50"
          />
        ))}
        <span className="self-center text-[10px] italic text-[var(--color-ink-faint)]">
          D{faces} each
        </span>
      </div>
    </div>
  );
}
