import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { TechniqueList } from './TechniqueList';
import type { Character } from '@/domain/character';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import type { TechniqueFile } from '@/domain/technique';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

interface SpiritualistPanelProps {
  character: Character;
  derived: DerivedCombatValues;
  catalog?: ReferenceCatalog | null;
}

/**
 * Mirrors the Spiritualist section of the technique sheet (Playkit p. 81):
 * doctrine, restrictions, special implements, Base Prayer / Accumulation
 * Value. Only renders for Spiritualist characters.
 */
export function SpiritualistPanel({
  character,
  derived,
  catalog,
}: SpiritualistPanelProps): React.JSX.Element | null {
  if (character.class_id !== 'spiritualist') return null;

  // Render Numetic Arts for Monks, Invocations for Invokers (Rule §12 §13).
  const order = character.spiritualist_order ?? '';
  const techniqueFiles: TechniqueFile[] = [];
  let disciplineHeading = 'Techniques';
  if (catalog && order.startsWith('monk-')) {
    techniqueFiles.push(catalog.techniques.numeticArts);
    disciplineHeading = 'Numetic Arts';
  } else if (catalog && order.startsWith('invoker-')) {
    techniqueFiles.push(catalog.techniques.invocations);
    disciplineHeading = 'Invocations';
  }

  return (
    <ParchmentCard className="flex flex-col gap-3">
      <IlluminatedHeading level={2}>Spiritualist</IlluminatedHeading>
      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <Field
          label="Order"
          value={
            character.spiritualist_order
              ? prettify(character.spiritualist_order)
              : '—'
          }
        />
        <Field
          label="Doctrine"
          value={character.spiritualist_doctrine || '—'}
        />
      </div>

      {(character.spiritualist_restrictions ||
        character.spiritualist_special_implements) && (
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          {character.spiritualist_restrictions && (
            <Field
              label="Restrictions"
              value={character.spiritualist_restrictions}
            />
          )}
          {character.spiritualist_special_implements && (
            <Field
              label="Special Implements"
              value={character.spiritualist_special_implements}
            />
          )}
        </div>
      )}

      <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2 font-mono text-xs">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          Base Prayer / Accumulation Value
        </div>
        <div className="mt-0.5">
          WIL {derived.baseWIL} + Mental Resistance{' '}
          {derived.mentalResistanceLevel} ={' '}
          <span className="text-base text-[var(--color-ink)]">
            {derived.basePrayerValue}
          </span>
        </div>
      </div>

      {techniqueFiles.length > 0 && (
        <section>
          <h3 className="mb-1 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
            {disciplineHeading}
          </h3>
          <TechniqueList files={techniqueFiles} />
        </section>
      )}
    </ParchmentCard>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="text-sm text-[var(--color-ink)]">{value}</div>
    </div>
  );
}

function prettify(s: string): string {
  return s
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' · ');
}
