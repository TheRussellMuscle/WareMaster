import * as React from 'react';

interface DialogActionsProps {
  hasResult: boolean;
  onRoll: () => void;
  onAdd: () => void;
  onDiscard: () => void;
  rolling?: boolean;
  /** Disables the Roll button (e.g. inputs invalid, target weapon missing). */
  disabledReason?: string;
}

/** Roll / Reroll / Add-to-log buttons shared by every roll dialog. */
export function DialogActions({
  hasResult,
  onRoll,
  onAdd,
  onDiscard,
  rolling,
  disabledReason,
}: DialogActionsProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-end gap-2">
      {disabledReason && !hasResult && (
        <div className="mr-auto text-xs text-[var(--color-rust)]">
          {disabledReason}
        </div>
      )}
      {hasResult && (
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
        >
          Reroll
        </button>
      )}
      {!hasResult && (
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling || !!disabledReason}
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Roll
        </button>
      )}
      {hasResult && (
        <button
          type="button"
          onClick={onAdd}
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25"
        >
          Add to log
        </button>
      )}
    </div>
  );
}
