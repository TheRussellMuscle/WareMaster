import * as React from 'react';
import { RollResultBadge } from '@/components/dice/RollResultBadge';
import type { RollOutcome } from '@/engine/dice/roll';

interface ResultDisplayProps {
  dice: number[];
  total: number;
  outcome: RollOutcome;
  difficulty?: number;
  isCritical?: boolean;
  /** Free-form supporting text — outcome consequence, PP gain, LUC restore, etc. */
  extra?: React.ReactNode;
}

/**
 * Wraps a `RollResultBadge` with a parchment surface and an optional extra
 * line of consequence text, used inside every roll dialog after the engine
 * resolves a roll.
 */
export function ResultDisplay({
  dice,
  total,
  outcome,
  difficulty,
  isCritical,
  extra,
}: ResultDisplayProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3 text-sm">
      <RollResultBadge
        diceRolled={dice}
        total={total}
        outcome={outcome}
        difficulty={difficulty}
        isCritical={isCritical}
      />
      {extra && (
        <div className="text-xs text-[var(--color-ink-soft)]">{extra}</div>
      )}
    </div>
  );
}
