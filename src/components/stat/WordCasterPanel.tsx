import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { TechniqueList } from './TechniqueList';
import type { Character } from '@/domain/character';
import type { Gate, TechniqueFile } from '@/domain/technique';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

interface WordCasterPanelProps {
  character: Character;
  derived: DerivedCombatValues;
  catalog?: ReferenceCatalog | null;
}

/** Pairing from rule §11 / docs/rules/03-character-creation.md p.83. */
const OPPOSING_GATE: Record<Gate, Gate | null> = {
  gateless: null,
  sun: 'moon',
  moon: 'sun',
  metal: 'wind',
  wind: 'metal',
  fire: 'water',
  water: 'fire',
  wood: 'earth',
  earth: 'wood',
};

/**
 * Mirrors the Word-Caster section of the technique sheet (Playkit p. 81):
 * chosen gate, opposing gate, memory points, and Base Binding Value.
 * Only renders if the character is a Word-Caster.
 */
export function WordCasterPanel({
  character,
  derived,
  catalog,
}: WordCasterPanelProps): React.JSX.Element | null {
  if (character.class_id !== 'word-caster') return null;
  const gate = character.word_caster_gate ?? null;
  const opposing = gate ? OPPOSING_GATE[gate] : null;

  // Derive the technique files to display: chosen Gate + Gateless (always
  // available per Rule §11). Phase 3 shows the entire gate catalog as the
  // character's grimoire — `character.techniques[]` selection comes later.
  const techniqueFiles: TechniqueFile[] = [];
  if (catalog && gate) {
    const gateFile = catalog.techniques.wordCasting[gate];
    if (gateFile) techniqueFiles.push(gateFile);
    if (gate !== 'gateless') {
      const gateless = catalog.techniques.wordCasting.gateless;
      if (gateless) techniqueFiles.push(gateless);
    }
  }

  return (
    <ParchmentCard className="flex flex-col gap-3">
      <IlluminatedHeading level={2}>Word-Caster</IlluminatedHeading>
      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
        <Field
          label="Chosen Gate"
          value={gate ? cap(gate) : '—'}
        />
        <Field
          label="Opposing Gate"
          value={opposing ? cap(opposing) : '—'}
        />
        <Field
          label="Memory Points spent"
          value={String(character.memory_points_spent)}
        />
      </div>

      <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2 font-mono text-xs">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          Base Binding Value
        </div>
        <div className="mt-0.5">
          AGI {derived.baseAGI} + arm {signed(derived.totalArmorModifier)} +
          {' '}
          Word-Casting {derived.wordCastingLevel} ={' '}
          <span className="text-base text-[var(--color-ink)]">
            {derived.baseBindingValue}
          </span>
        </div>
      </div>

      {techniqueFiles.length > 0 && (
        <section>
          <h3 className="mb-1 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
            Spell Grimoire
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
      <div className="font-display text-base capitalize text-[var(--color-ink)]">
        {value}
      </div>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}
