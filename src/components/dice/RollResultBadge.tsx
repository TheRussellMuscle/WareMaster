import * as React from 'react';
import { cn } from '@/lib/cn';
import type { RollOutcome } from '@/engine/dice/roll';

interface RollResultBadgeProps {
  diceRolled: number[];
  total: number;
  outcome: RollOutcome;
  isCritical?: boolean;
  difficulty?: number | null;
  className?: string;
  /** Show the formula breakdown (dice + base + skill + mod = total). */
  breakdown?: string;
}

/**
 * Compact inline badge for an action / combat / skill roll result. Color-codes
 * 1s (rust) and max dice (gilt) so the eye picks up Total Failure / Perfect
 * Success at a glance, plus an outcome chip on the right.
 */
export function RollResultBadge({
  diceRolled,
  total,
  outcome,
  isCritical,
  difficulty,
  className,
  breakdown,
}: RollResultBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1.5 font-mono text-sm',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        {diceRolled.map((d, i) => (
          <DieValue key={i} value={d} />
        ))}
      </span>
      <span className="text-[var(--color-ink-faint)]">→</span>
      <span className="font-medium text-[var(--color-ink)]">{total}</span>
      {difficulty != null && (
        <span className="text-[var(--color-ink-faint)]">
          vs DC {difficulty}
        </span>
      )}
      <OutcomeChip outcome={outcome} isCritical={!!isCritical} />
      {breakdown && (
        <span className="text-[10px] italic text-[var(--color-ink-faint)]">
          {breakdown}
        </span>
      )}
    </span>
  );
}

function DieValue({ value }: { value: number }): React.JSX.Element {
  const isMax = value === 10;
  const isOne = value === 1;
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm border px-1 text-xs',
        isMax &&
          'border-[var(--color-gilt)] bg-[var(--color-gilt)]/15 font-medium text-[var(--color-gilt)]',
        isOne &&
          'border-[var(--color-rust)] bg-[var(--color-rust)]/10 font-medium text-[var(--color-rust)]',
        !isMax &&
          !isOne &&
          'border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)]',
      )}
    >
      {value}
    </span>
  );
}

function OutcomeChip({
  outcome,
  isCritical,
}: {
  outcome: RollOutcome;
  isCritical: boolean;
}): React.JSX.Element {
  if (outcome === 'perfect-success') {
    return (
      <span className="rounded-sm border border-[var(--color-gilt)] bg-[var(--color-gilt)]/15 px-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-gilt)]">
        Perfect
      </span>
    );
  }
  if (outcome === 'total-failure') {
    return (
      <span className="rounded-sm border border-[var(--color-rust)] bg-[var(--color-rust)]/10 px-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-rust)]">
        Total Fail
      </span>
    );
  }
  if (isCritical) {
    return (
      <span className="rounded-sm border border-[var(--color-rust)] bg-[var(--color-rust)]/10 px-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-rust)]">
        Crit
      </span>
    );
  }
  if (outcome === 'success') {
    return (
      <span className="rounded-sm border border-[var(--color-verdigris)]/60 bg-[var(--color-verdigris)]/10 px-1.5 text-[10px] uppercase tracking-wider text-[var(--color-verdigris)]">
        Hit
      </span>
    );
  }
  return (
    <span className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-100)] px-1.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
      Miss
    </span>
  );
}
