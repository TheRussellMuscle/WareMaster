import { Heart } from 'lucide-react';
import { useOptionalSheetActions } from '@/components/sheet/SheetActionsContext';
import { DamageTrack, type TrackCell } from './DamageTrack';

interface DurabilityTracksProps {
  /** Cap (CON or WIL + Resistance Skill). The "Light" track uses these boxes. */
  durability: number;
  /** Current accumulated damage on this track. */
  current: number;
  /** Optional Resistance Skill Level (Mental/Physical Resistance). */
  resistanceLevel?: number;
  /** "Physical" or "Mental" header label. */
  label: string;
  /**
   * When provided, cells become interactive. Click semantics:
   *   - click N where N > current → onChange(N)         (advance damage)
   *   - click N where N === current → onChange(N - 1)   (clear back one)
   *   - click N where N < current → onChange(N)         (drop to N)
   * Caller decides what "current" means in its store and persists.
   */
  onChange?: (next: number) => void;
}

/**
 * Three-row track (Light / Heavy / Incapacitated) per the official sheet
 * (Playkit p. 80). A box is filled when accumulated damage has reached its
 * threshold:
 *   Light     1..durability
 *   Heavy     durability+1..2×durability
 *   Incap     2×durability+1..3×durability
 *
 * Track length scales with durability so high-CON characters aren't
 * truncated (durability * 3 covers the full range; minimum 15 for visual
 * consistency with the printed sheet).
 */
export function DurabilityTracks({
  durability,
  current,
  resistanceLevel,
  label,
  onChange,
}: DurabilityTracksProps): React.JSX.Element {
  const heavyStart = durability + 1;
  const incapStart = durability * 2 + 1;
  const incapEnd = durability * 3;
  const trackLength = Math.max(15, durability);

  const lightRow: TrackCell[] = [];
  const heavyRow: TrackCell[] = [];
  const incapRow: TrackCell[] = [];
  for (let i = 1; i <= trackLength; i += 1) {
    lightRow.push({
      n: i,
      filled: i <= Math.min(current, durability),
      threshold: i === durability,
    });
    const heavyN = heavyStart + i - 1;
    heavyRow.push({
      n: heavyN,
      filled: current >= heavyN && heavyN <= durability * 2,
      threshold: heavyN === durability * 2,
    });
    const incapN = incapStart + i - 1;
    incapRow.push({
      n: incapN,
      filled: current >= incapN && incapN <= incapEnd,
      threshold: incapN === incapEnd,
    });
  }

  // Click semantics common to all three rows.
  const onCellClick = onChange
    ? (n: number) => {
        const clamped = Math.max(0, Math.min(n, incapEnd));
        if (clamped === current) {
          onChange(Math.max(0, clamped - 1));
        } else {
          onChange(clamped);
        }
      }
    : undefined;

  const lightRemaining = Math.max(0, durability - current);
  const adjust = onChange
    ? (delta: number) =>
        onChange(Math.max(0, Math.min(incapEnd, current + delta)))
    : null;
  const actions = useOptionalSheetActions();
  const inHeavy = current > durability;
  return (
    <div className="flex flex-col gap-2">
      <header className="flex flex-wrap items-baseline gap-3">
        <h3 className="font-display text-base text-[var(--color-ink)]">
          {label} Durability
        </h3>
        <span className="text-xs text-[var(--color-ink-faint)]">
          score {durability - (resistanceLevel ?? 0)}
          {resistanceLevel ? ` + resist ${resistanceLevel}` : ''} = {durability}
        </span>
        {adjust && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-ink-faint)]">
            <button
              type="button"
              onClick={() => adjust(-5)}
              disabled={current === 0}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-verdigris)]/10 px-1.5 py-0 hover:bg-[var(--color-verdigris)]/20 disabled:opacity-30"
              title="Heal 5"
            >
              −5
            </button>
            <button
              type="button"
              onClick={() => adjust(-1)}
              disabled={current === 0}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-verdigris)]/10 px-1.5 py-0 hover:bg-[var(--color-verdigris)]/20 disabled:opacity-30"
              title="Heal 1"
            >
              −1
            </button>
            <button
              type="button"
              onClick={() => adjust(1)}
              disabled={current >= incapEnd}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-rust)]/10 px-1.5 py-0 hover:bg-[var(--color-rust)]/20 disabled:opacity-30"
              title="Take 1"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => adjust(5)}
              disabled={current >= incapEnd}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-rust)]/10 px-1.5 py-0 hover:bg-[var(--color-rust)]/20 disabled:opacity-30"
              title="Take 5"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => onChange?.(0)}
              disabled={current === 0}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0 hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-30"
              title="Heal to full"
            >
              full
            </button>
          </div>
        )}
        <span className="ml-auto font-mono text-xs text-[var(--color-ink-soft)]">
          remaining {lightRemaining} / {durability}
          <span className="ml-2 text-[var(--color-ink-faint)]">
            · damage {current} / cap {incapEnd}
          </span>
        </span>
        {actions && inHeavy && (
          <button
            type="button"
            onClick={() => actions.openSave('heavy-state-action')}
            title="Roll the WIL save required to act while in Heavy (Rule §09)"
            className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-rust)]/60 bg-[var(--color-rust)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-rust)] hover:bg-[var(--color-rust)]/20"
          >
            <Heart className="h-3 w-3" aria-hidden /> Save
          </button>
        )}
      </header>
      <DamageTrack row={lightRow} label="Light" onCellClick={onCellClick} />
      <DamageTrack
        row={heavyRow}
        label="Heavy"
        tone="rust"
        onCellClick={onCellClick}
      />
      <DamageTrack
        row={incapRow}
        label="Incapacitated"
        tone="dark-rust"
        onCellClick={onCellClick}
      />
    </div>
  );
}
