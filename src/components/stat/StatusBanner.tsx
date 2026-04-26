import * as React from 'react';
import { AlertTriangle, Skull, Zap } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Character } from '@/domain/character';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';

interface StatusBannerProps {
  character: Character;
  derived: DerivedCombatValues;
  onResurrect?: () => void | Promise<void>;
}

type Axis = 'physical' | 'mental';
type Stage = 'heavy' | 'incap' | 'gone';

interface AxisStatus {
  axis: Axis;
  stage: Stage;
  damage: number;
  durability: number;
}

function classify(
  axis: Axis,
  damage: number,
  durability: number,
): AxisStatus | null {
  if (damage >= durability * 3) return { axis, stage: 'gone', damage, durability };
  if (damage > durability * 2) return { axis, stage: 'incap', damage, durability };
  if (damage > durability) return { axis, stage: 'heavy', damage, durability };
  return null;
}

/**
 * Surfaces damage-stage consequences above the damage panel — one banner
 * PER AXIS (physical, mental). Both can be active simultaneously: a
 * character can be Heavy Physical AND Heavy Mental at the same time, or
 * Incapacitated Physical AND Heavy Mental, etc. The banners stack.
 *
 * Sources:
 *   - rule §09 §3.1 Heavy: Action Rolls require WIL Roll Difficulty
 *     (damage − durability) first
 *   - rule §09 §3.2 Incap: cannot act; Physical Incap auto-damages 1/Turn
 *   - rule §09 §2.3 Death/Insane at 3× durability
 *
 * Phase 7 wires the actual WIL/CON Rolls; Phase 6 wires Physical Incap
 * auto-damage on time advance. This pass is read-only signaling.
 */
export function StatusBanner({
  character,
  derived,
  onResurrect,
}: StatusBannerProps): React.JSX.Element | null {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const physical = classify(
    'physical',
    character.state.physical_damage,
    derived.physicalDurability,
  );
  const mental = classify(
    'mental',
    character.state.mental_damage,
    derived.mentalDurability,
  );

  const banners = [physical, mental].filter(
    (b): b is AxisStatus => b != null,
  );
  if (banners.length === 0) return null;

  const anyGone = banners.some((b) => b.stage === 'gone');

  return (
    <div className="flex flex-col gap-2">
      {banners.map((b) => (
        <AxisBanner key={b.axis} status={b} />
      ))}
      {anyGone && onResurrect && (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
            >
              Restore character (admin)
            </button>
          </div>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Restore ${character.name}?`}
            description="Sets Physical and Mental damage to 0 and clears any manual status override. Use only for narrative resurrection / WM correction."
            confirmLabel="Restore"
            onConfirm={async () => {
              await onResurrect();
            }}
          />
        </>
      )}
    </div>
  );
}

function AxisBanner({ status }: { status: AxisStatus }): React.JSX.Element {
  const axisLabel = status.axis === 'physical' ? 'Physical' : 'Mental';
  if (status.stage === 'heavy') {
    const difficulty = Math.max(1, status.damage - status.durability);
    return (
      <div className="flex items-start gap-2 rounded-sm border border-[var(--color-rust)]/50 bg-[var(--color-rust)]/10 px-3 py-2 text-sm">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-rust)]"
          aria-hidden
        />
        <div>
          <div className="font-medium text-[var(--color-rust)]">
            Heavy {axisLabel} Damage active
          </div>
          <div className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
            Action Rolls require a <strong>WIL Roll Difficulty {difficulty}</strong>{' '}
            first ({status.damage} damage − {status.durability} durability).
            Failure = lost action (Rule §09 §3.1).
          </div>
        </div>
      </div>
    );
  }
  if (status.stage === 'incap') {
    return (
      <div className="flex items-start gap-2 rounded-sm border border-[var(--color-rust)]/60 bg-[var(--color-rust)]/15 px-3 py-2 text-sm">
        <Zap
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-rust)]"
          aria-hidden
        />
        <div>
          <div className="font-medium text-[var(--color-rust)]">
            Incapacitated ({axisLabel})
          </div>
          <div className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
            Character cannot act.{' '}
            {status.axis === 'physical'
              ? 'Takes +1 Physical at the start of every Turn until treated by a Medicine roll (Rule §09 §3.2). Auto-application arrives in Phase 6.'
              : 'Mental Incapacitation heals at the same rate as Heavy Mental damage.'}
          </div>
        </div>
      </div>
    );
  }
  // gone: dead (physical) / insane (mental)
  const label = status.axis === 'physical' ? 'Dead' : 'Insane';
  return (
    <div className="flex items-start gap-2 rounded-sm border-2 border-[var(--color-rust)] bg-[var(--color-rust)]/15 px-3 py-2 text-sm">
      <Skull
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-rust)]"
        aria-hidden
      />
      <div className="flex-1">
        <div className="font-display text-base text-[var(--color-rust)]">
          {label}
        </div>
        <div className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
          {axisLabel} damage exceeded 3× durability — the character is removed
          from play (Rule §09 §2.3).
        </div>
      </div>
    </div>
  );
}
