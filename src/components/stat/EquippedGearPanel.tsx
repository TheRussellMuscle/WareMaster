import { X, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { resolveEquippedSlots, type EquipmentSlots } from '@/engine/derive/equipment-slots';
import type {
  Character,
  BastardSwordGrip,
} from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { UnequipTarget } from '@/engine/equipment/apply';

interface EquippedGearPanelProps {
  character: Character;
  catalog: ReferenceCatalog | null;
  /** Move a slotted item back to inventory. */
  onUnequip?: (target: UnequipTarget) => void | Promise<void>;
  /** Switch the equipped Bastard Sword's grip. */
  onSetBastardGrip?: (grip: BastardSwordGrip) => void | Promise<void>;
}

/**
 * Renders the equipped gear: three armor slot rows (Body / Head / Shield)
 * and a list of equipped weapons annotated with grip (1H / 2H / Bastard).
 * Surfaces rule §06 §2.1 conflicts.
 *
 * When `onUnequip` is provided, each slot/weapon gets an "unequip"
 * affordance that moves the item back into inventory. The Bastard Sword
 * grip toggle appears only when one is equipped.
 */
export function EquippedGearPanel({
  character,
  catalog,
  onUnequip,
  onSetBastardGrip,
}: EquippedGearPanelProps): React.JSX.Element {
  const slots = resolveEquippedSlots(character, catalog);
  const grip = character.equipment.bastard_sword_grip;
  return (
    <ParchmentCard className="flex flex-col gap-3">
      <IlluminatedHeading level={2}>Equipped gear</IlluminatedHeading>

      <ArmorRows slots={slots} onUnequip={onUnequip} />

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
          Weapons
        </h3>
        {slots.weapons.length === 0 ? (
          <p className="text-sm italic text-[var(--color-ink-faint)]">
            No weapons equipped.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {slots.weapons.map(({ weapon, hands }, i) => {
              const isBastard = weapon.id === 'bastard-sword';
              const effectiveHands = isBastard ? grip : hands;
              return (
                <li
                  key={`${weapon.id}-${i}`}
                  className="flex items-baseline justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{weapon.name}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                      {weapon.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-soft)]">
                    {isBastard && onSetBastardGrip ? (
                      <button
                        type="button"
                        onClick={() =>
                          void onSetBastardGrip(grip === '1H' ? '2H' : '1H')
                        }
                        title={`Currently ${grip}. Click to switch grip.`}
                        className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-gilt)]/60 bg-[var(--color-gilt)]/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-gilt)] hover:bg-[var(--color-gilt)]/25"
                      >
                        {grip === '2H' ? (
                          <ToggleRight className="h-3 w-3" aria-hidden />
                        ) : (
                          <ToggleLeft className="h-3 w-3" aria-hidden />
                        )}
                        {grip}
                      </button>
                    ) : (
                      <span
                        className={
                          effectiveHands === 2
                            ? 'rounded-sm bg-[var(--color-rust)]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-rust)]'
                            : effectiveHands === 'bastard'
                              ? 'rounded-sm bg-[var(--color-gilt)]/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-gilt)]'
                              : 'rounded-sm bg-[var(--color-parchment-300)]/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]'
                        }
                      >
                        {effectiveHands === 2
                          ? '2H'
                          : effectiveHands === 'bastard'
                            ? '1H/2H'
                            : '1H'}
                      </span>
                    )}
                    <UnitTooltip
                      unit="golda"
                      amount={
                        typeof weapon.price_golda === 'number'
                          ? weapon.price_golda
                          : 0
                      }
                    />
                    {onUnequip && (
                      <button
                        type="button"
                        onClick={() => void onUnequip({ kind: 'weapon', index: i })}
                        title="Unequip"
                        className="rounded-sm p-0.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {slots.conflicts.map((msg, i) => (
        <div
          key={i}
          className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/10 px-3 py-2 text-xs text-[var(--color-rust)]"
        >
          {msg}
        </div>
      ))}
    </ParchmentCard>
  );
}

function ArmorRows({
  slots,
  onUnequip,
}: {
  slots: EquipmentSlots;
  onUnequip?: (target: UnequipTarget) => void | Promise<void>;
}): React.JSX.Element {
  const rows: Array<{
    label: 'Body' | 'Head' | 'Shield';
    armor: EquipmentSlots['body']['armor'];
    target: UnequipTarget;
  }> = [
    { label: 'Body', armor: slots.body.armor, target: { kind: 'body' } },
    { label: 'Head', armor: slots.head.armor, target: { kind: 'head' } },
    { label: 'Shield', armor: slots.shield.armor, target: { kind: 'shield' } },
  ];
  return (
    <section>
      <h3 className="mb-1 font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
        Armor
      </h3>
      <ul className="space-y-1 text-sm">
        {rows.map(({ label, armor, target }) => (
          <li
            key={label}
            className="flex items-baseline justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5"
          >
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                {label}
              </span>
              {armor ? (
                <span className="ml-2 font-medium">{armor.name}</span>
              ) : (
                <span className="ml-2 italic text-[var(--color-ink-faint)]">
                  none
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-soft)]">
              {armor && (
                <>
                  <span>
                    abs {armor.absorption}, mod {signed(armor.armor_modifier)}
                  </span>
                  {armor.price_golda > 0 && (
                    <UnitTooltip unit="golda" amount={armor.price_golda} />
                  )}
                  {onUnequip && (
                    <button
                      type="button"
                      onClick={() => void onUnequip(target)}
                      title="Unequip"
                      className="rounded-sm p-0.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function signed(n: number): string {
  if (n >= 0) return `+${n}`;
  return String(n);
}
