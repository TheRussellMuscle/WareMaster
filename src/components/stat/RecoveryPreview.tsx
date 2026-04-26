import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import type { Character } from '@/domain/character';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';

interface RecoveryPreviewProps {
  character: Character;
  derived: DerivedCombatValues;
}

/**
 * Shows what would heal naturally if time advanced one Day. Phase 6's
 * AdvanceTimeDialog will turn this into an actual action; for now it's
 * read-only reference so the WM can eyeball the recovery cadence.
 *
 * Source: rule §09 §3 (recovery rates).
 *   Light Physical: 1 / Day
 *   Light Mental:   1 / Hour (so a Day = up to 24 — show as "+24/Day")
 *   Heavy Physical: 1 every (16 − CON) Days
 *   Heavy Mental:   1 every (16 − WIL) Hours
 */
export function RecoveryPreview({
  character,
  derived,
}: RecoveryPreviewProps): React.JSX.Element | null {
  const phys = character.state.physical_damage;
  const ment = character.state.mental_damage;
  if (phys === 0 && ment === 0) return null;

  const lightPhys = phys > 0 && phys <= derived.physicalDurability ? 1 : 0;
  const heavyPhys =
    phys > derived.physicalDurability
      ? `1 per ${derived.heavyPhysicalRecoveryDaysPerPoint} Day${derived.heavyPhysicalRecoveryDaysPerPoint === 1 ? '' : 's'}`
      : null;

  const lightMent = ment > 0 && ment <= derived.mentalDurability ? 24 : 0;
  const heavyMent =
    ment > derived.mentalDurability
      ? `1 per ${derived.heavyMentalRecoveryHoursPerPoint} Hour${derived.heavyMentalRecoveryHoursPerPoint === 1 ? '' : 's'}`
      : null;

  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40 px-3 py-2 text-xs">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        Recovery preview · 1 <UnitTooltip unit="day" />
      </div>
      <div className="mt-0.5 grid grid-cols-1 gap-x-4 font-mono text-[var(--color-ink-soft)] md:grid-cols-2">
        <div>
          Physical:{' '}
          {phys === 0 ? (
            <span className="italic">no damage</span>
          ) : heavyPhys ? (
            <span className="text-[var(--color-rust)]">Heavy: {heavyPhys}</span>
          ) : (
            <span className="text-[var(--color-verdigris)]">+{lightPhys} Light</span>
          )}
        </div>
        <div>
          Mental:{' '}
          {ment === 0 ? (
            <span className="italic">no damage</span>
          ) : heavyMent ? (
            <span className="text-[var(--color-rust)]">Heavy: {heavyMent}</span>
          ) : (
            <span className="text-[var(--color-verdigris)]">+{lightMent} Light/Day</span>
          )}
        </div>
      </div>
      <div className="mt-1 text-[10px] italic text-[var(--color-ink-faint)]">
        Auto-recovery on time advance ships in Phase 6.
      </div>
    </div>
  );
}
