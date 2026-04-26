import { cn } from '@/lib/cn';

export interface TrackCell {
  /** The damage value this cell represents (1-based). */
  n: number;
  filled: boolean;
  /** True if this cell sits exactly on a stage boundary (Lt/Hv/Incap). */
  threshold: boolean;
}

export type TrackTone = 'ink' | 'rust' | 'dark-rust';

interface DamageTrackProps {
  row: TrackCell[];
  label: string;
  tone?: TrackTone;
  /**
   * Optional callback fired with the cell's `n` when clicked. When provided,
   * cells render as buttons. Caller is responsible for translating clicks
   * into damage updates per the rules.
   */
  onCellClick?: (n: number) => void;
}

/**
 * One row of the durability track grid. Pure-presentation; click semantics
 * (set damage to N, decrement on click-current) are owned by the parent
 * (DurabilityTracks).
 */
export function DamageTrack({
  row,
  label,
  tone = 'ink',
  onCellClick,
}: DamageTrackProps): React.JSX.Element {
  const fillColor =
    tone === 'rust'
      ? 'bg-[var(--color-rust)]/60 border-[var(--color-rust)]'
      : tone === 'dark-rust'
        ? 'bg-[var(--color-rust)] border-[var(--color-rust)] text-white'
        : 'bg-[var(--color-ink-soft)]/50 border-[var(--color-ink)]';

  const interactive = onCellClick != null;

  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-0.5">
        {row.map((cell) =>
          interactive ? (
            <button
              key={cell.n}
              type="button"
              onClick={() => onCellClick?.(cell.n)}
              className={cn(
                'flex h-5 w-5 cursor-pointer items-center justify-center border text-[10px] font-mono transition-colors',
                cell.filled
                  ? fillColor
                  : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]',
                cell.threshold &&
                  'ring-1 ring-offset-1 ring-[var(--color-gilt)] ring-offset-[var(--color-parchment-50)]',
              )}
              title={`${label} ${cell.n}${cell.threshold ? ' (threshold)' : ''}`}
              aria-label={`Set ${label} damage to ${cell.n}`}
              aria-pressed={cell.filled}
            >
              {cell.n}
            </button>
          ) : (
            <div
              key={cell.n}
              className={cn(
                'flex h-5 w-5 items-center justify-center border text-[10px] font-mono',
                cell.filled
                  ? fillColor
                  : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 text-[var(--color-ink-faint)]',
                cell.threshold &&
                  'ring-1 ring-offset-1 ring-[var(--color-gilt)] ring-offset-[var(--color-parchment-50)]',
              )}
              title={`${label} ${cell.n}${cell.threshold ? ' (threshold)' : ''}`}
            >
              {cell.n}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
