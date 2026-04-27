import * as React from 'react';
import { Dices } from 'lucide-react';
import type { Character } from '@/domain/character';
import type { Class } from '@/domain/class';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import type { SheetDialogs } from '@/components/sheet/useSheetDialogs';
import type { AbilityCode } from '@/domain/attributes';

interface ClassBenefitsSectionProps {
  character: Character;
  derived: DerivedCombatValues;
  classEntry: Class | null;
  actions: SheetDialogs | null;
}

interface PerkRollConfig {
  kind: 'ability' | 'save-luc';
  ability?: AbilityCode;
  difficultyFn: (char: Character) => number;
  skillBonusFn?: (char: Character) => number;
  label: string;
}

const PERK_ROLLS: Record<string, PerkRollConfig> = {
  sermon: {
    kind: 'save-luc',
    difficultyFn: (c) => 16 - c.abilities.CHA,
    label: 'LUC Roll (Sermon)',
  },
  'public-performance': {
    kind: 'ability',
    ability: 'CHA',
    difficultyFn: () => 3,
    label: 'CHA Roll (Public Performance)',
  },
  'component-analysis': {
    kind: 'ability',
    ability: 'SEN',
    difficultyFn: () => 8,
    label: 'SEN Roll (Component Analysis)',
  },
  'price-loot': {
    kind: 'ability',
    ability: 'SEN',
    difficultyFn: () => 8,
    skillBonusFn: () => 1,
    label: 'SEN Roll (Price Loot)',
  },
};

/** Replaces `[expr]` placeholders that depend only on character stats with `[expr = N]`. */
function resolveFormulas(description: string, character: Character): string {
  return description.replace(/\[16\s*-\s*CHA\]/g, () => {
    const val = 16 - character.abilities.CHA;
    return `[16 - CHA = ${val}]`;
  });
}

function PerkRollButton({
  config,
  character,
  actions,
}: {
  config: PerkRollConfig;
  character: Character;
  actions: SheetDialogs;
}): React.JSX.Element {
  const difficulty = config.difficultyFn(character);
  const skillBonus = config.skillBonusFn ? config.skillBonusFn(character) : 0;

  const handleClick = () => {
    if (config.kind === 'save-luc') {
      actions.openSave('luc-roll', difficulty);
    } else {
      actions.openAbility(config.ability, difficulty, skillBonus || undefined);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${config.label} — DC ${difficulty}`}
      className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0.5 text-[10px] hover:bg-[var(--color-gilt)]/15"
    >
      <Dices className="h-3 w-3" aria-hidden />
      Roll DC {difficulty}
    </button>
  );
}

/**
 * Renders class benefits (perks) with:
 * - Tradesfolk profession perk support
 * - Inline formula computation (e.g. [16 - CHA = N])
 * - Roll buttons for actionable perks (Sermon, Public Performance, etc.)
 */
export function ClassBenefitsSection({
  character,
  derived: _derived,
  classEntry,
  actions,
}: ClassBenefitsSectionProps): React.JSX.Element | null {
  if (!classEntry) return null;

  // Resolve perks: top-level for most classes; profession perks for Tradesfolk
  let perks = classEntry.perks;
  if (character.class_id === 'tradesfolk' && character.tradesfolk_profession) {
    const profession = classEntry.professions?.find(
      (p) => p.id === character.tradesfolk_profession,
    );
    if (profession) perks = profession.perks;
  }

  if (perks.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
        Class Benefits
      </h2>
      <ul className="space-y-2 text-sm">
        {perks.map((p) => {
          const rollConfig = PERK_ROLLS[p.id];
          const resolvedDesc = resolveFormulas(p.description, character);
          return (
            <li key={p.id} className="flex flex-col gap-1">
              <div>
                <span className="font-medium">{p.name}.</span>{' '}
                <span className="text-[var(--color-ink-soft)]">{resolvedDesc}</span>
              </div>
              {actions && rollConfig && (
                <PerkRollButton
                  config={rollConfig}
                  character={character}
                  actions={actions}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
