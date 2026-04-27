import * as React from 'react';
import { Dices } from 'lucide-react';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { useSheetActions } from '@/components/sheet/SheetActionsContext';
import type { Character } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

interface SkillRowProps {
  skillId: string;
  skillName: string;
  level: number;
  pp: number;
  untrained?: boolean;
}

function SkillRow({
  skillId,
  skillName,
  level,
  pp,
  untrained,
}: SkillRowProps): React.JSX.Element {
  const actions = useSheetActions();
  return (
    <li
      className={`flex items-baseline justify-between rounded-sm border px-3 py-1.5 ${
        untrained
          ? 'border-[var(--color-parchment-300)]/60 bg-[var(--color-parchment-50)]/30'
          : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60'
      }`}
    >
      <span>
        <span
          className={
            untrained ? 'text-[var(--color-ink-soft)]' : 'font-medium'
          }
        >
          {skillName}
        </span>
        <span className="ml-2 font-mono text-xs text-[var(--color-ink-soft)]">
          Lv {level}
        </span>
      </span>
      <span className="flex items-center gap-2">
        {pp > 0 && (
          <span className="font-mono text-xs text-[var(--color-ink-faint)]">
            <AcronymTooltip code="PP" /> {pp}
          </span>
        )}
        <button
          type="button"
          onClick={() => actions.openSkill(skillId)}
          title={`Roll ${skillName}${untrained ? ' (untrained — half PP on Perfect/Total Failure)' : ''}`}
          className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink)] hover:bg-[var(--color-gilt)]/25"
        >
          <Dices className="h-3 w-3" aria-hidden /> Roll
        </button>
      </span>
    </li>
  );
}

const SKILL_CATEGORY_ORDER: Array<{
  id: 'combat' | 'adventure-physical' | 'adventure-mental' | 'specialized';
  label: string;
}> = [
  { id: 'combat', label: 'Combat' },
  { id: 'adventure-physical', label: 'Adventure — Physical' },
  { id: 'adventure-mental', label: 'Adventure — Mental' },
  { id: 'specialized', label: 'Specialized' },
];

interface SkillsListProps {
  character: Character;
  catalog: ReferenceCatalog | null;
}

/**
 * Show every skill from the bundled catalog grouped by category. Skills the
 * character has trained appear with their Level + PP; the rest render at Lv 0
 * with a subtle muted background. Each row gets a Roll button — untrained
 * skills resolve via Skill Check's "untrained ⇒ Level 0, half PP on
 * Perfect/Total Failure" path (Rule §07).
 */
export function SkillsList({
  character,
  catalog,
}: SkillsListProps): React.JSX.Element {
  if (!catalog) {
    return (
      <p className="text-sm italic text-[var(--color-ink-soft)]">
        Loading skill catalog…
      </p>
    );
  }
  const learned = new Map(character.skills.map((e) => [e.skill_id, e]));
  const byCategory = SKILL_CATEGORY_ORDER.map((cat) => ({
    ...cat,
    skills: catalog.skills.skills
      .filter((s) => s.category === cat.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div className="flex flex-col gap-3">
      {byCategory.map((cat) => (
        <section key={cat.id}>
          <h3 className="mb-1 font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
            {cat.label}
          </h3>
          <ul className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
            {cat.skills.map((s) => {
              const entry = learned.get(s.id);
              return (
                <SkillRow
                  key={s.id}
                  skillId={s.id}
                  skillName={s.name}
                  level={entry?.level ?? 0}
                  pp={entry?.pp ?? 0}
                  untrained={!entry}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
