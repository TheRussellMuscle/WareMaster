import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import type { Character } from '@/domain/character';
import type { CustomItem } from '@/domain/custom-item';
import { isCustomArmor, customArmorToArmor } from '@/domain/custom-item';
import type { Armor } from '@/domain/item';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';

interface AbsorptionPanelProps {
  character: Character;
  catalog: ReferenceCatalog | null;
  derived: DerivedCombatValues;
  customItems?: CustomItem[];
}

/**
 * Mirrors the Armor / Absorption block on Playkit p. 80: per-slot armor
 * names and absorption values, the total, and the Perfect-Success (×2) /
 * Total-Failure (÷2) variants used during IN/DN rolls.
 */
export function AbsorptionPanel({
  character,
  catalog,
  derived,
  customItems,
}: AbsorptionPanelProps): React.JSX.Element {
  const body = lookup(catalog, character.equipment.body_armor, customItems);
  const head = lookup(catalog, character.equipment.head_armor, customItems);
  const shield = lookup(catalog, character.equipment.shield, customItems);

  return (
    <ParchmentCard>
      <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
        Armor &amp; Absorption
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Slot label="Body" piece={body} />
        <Slot label="Head" piece={head} />
        <Slot label="Shield" piece={shield} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2 font-mono text-xs">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Total Absorption
          </div>
          <div className="mt-0.5">
            {body?.absorption ?? 0} + {head?.absorption ?? 0} +{' '}
            {shield?.absorption ?? 0}
            {derived.warriorAbsorptionBonus
              ? ` + warrior ${derived.warriorAbsorptionBonus}`
              : ''}{' '}
            ={' '}
            <span className="text-base text-[var(--color-ink)]">
              {derived.totalAbsorption}
            </span>
          </div>
          <div className="mt-1 text-[var(--color-ink-faint)]">
            Perfect Success ×2:{' '}
            <span className="text-[var(--color-verdigris)]">
              {derived.absorptionPerfectSuccess}
            </span>
            {'  ·  '}Total Failure ÷2:{' '}
            <span className="text-[var(--color-rust)]">
              {derived.absorptionTotalFailure}
            </span>
          </div>
        </div>
        <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2 font-mono text-xs">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Total Armor Modifier
          </div>
          <div className="mt-0.5">
            {signed(body?.armor_modifier ?? 0)} + {signed(head?.armor_modifier ?? 0)}{' '}
            + {signed(shield?.armor_modifier ?? 0)} ={' '}
            <span className="text-base text-[var(--color-ink)]">
              {signed(derived.totalArmorModifier)}
            </span>
          </div>
        </div>
      </div>
    </ParchmentCard>
  );
}

function Slot({
  label,
  piece,
}: {
  label: string;
  piece: Armor | null;
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="font-display text-sm text-[var(--color-ink)]">
        {piece?.name ?? '—'}
      </div>
      {piece && (
        <div className="font-mono text-[10px] text-[var(--color-ink-soft)]">
          abs {piece.absorption} · mod {signed(piece.armor_modifier)}
        </div>
      )}
    </div>
  );
}

function lookup(
  catalog: ReferenceCatalog | null,
  id: string | null,
  customItems?: CustomItem[],
): Armor | null {
  if (!catalog || !id) return null;
  const ca = catalog.armor.find((a) => a.id === id);
  if (ca) return ca;
  const ci = customItems?.find((c) => c.id === id);
  if (ci && isCustomArmor(ci)) return customArmorToArmor(ci);
  return null;
}

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}
