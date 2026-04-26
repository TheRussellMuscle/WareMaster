import { cn } from '@/lib/cn';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { StatBlock } from './StatBlock';
import type { MonsterTemplate } from '@/domain/monster';

interface MonsterStatBlockProps {
  monster: MonsterTemplate;
  className?: string;
}

const RANK_COLORS: Record<MonsterTemplate['rank'], string> = {
  A: 'text-[var(--color-rust)]',
  B: 'text-[var(--color-rust)]',
  C: 'text-[var(--color-gilt)]',
  D: 'text-[var(--color-verdigris)]',
  E: 'text-[var(--color-ink-soft)]',
};

export function MonsterStatBlock({
  monster,
  className,
}: MonsterStatBlockProps): React.JSX.Element {
  const scoresVsCharacter = {
    SEN: monster.base_sen ?? null,
    AGI: monster.base_agi ?? null,
    WIL: monster.base_wil ?? null,
    CON: monster.base_con ?? null,
    CHA: monster.base_cha ?? null,
  };

  return (
    <ParchmentCard className={cn('flex flex-col gap-3', className)}>
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <IlluminatedHeading level={2}>{monster.name}</IlluminatedHeading>
          {monster.type && (
            <div className="mt-0.5 text-sm italic text-[var(--color-ink-soft)]">
              {monster.type}
            </div>
          )}
        </div>
        <div className={cn('font-display text-2xl', RANK_COLORS[monster.rank])}>
          Rank {monster.rank}
        </div>
      </header>

      <StatBlock scores={scoresVsCharacter} showBase={false} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
        <Row label="Reaction" value={monster.reaction} />
        <Row label="Damage" value={String(monster.damage_value)} />
        <Row
          label="Absorption"
          value={
            monster.total_absorption == null
              ? '—'
              : String(monster.total_absorption)
          }
        />
        <Row
          label="Movement"
          value={
            <>
              <UnitTooltip unit="liet" amount={monster.movement_speed} />
              {monster.sprint_speed !== undefined && (
                <>
                  {' / sprint '}
                  <UnitTooltip unit="liet" amount={monster.sprint_speed} />
                </>
              )}{' '}
              <span className="text-[var(--color-ink-faint)]">per</span>{' '}
              <UnitTooltip unit="segment" />
            </>
          }
        />
        <Row label="Intelligence" value={monster.intelligence} />
        <Row label="Habitat" value={monster.primary_habitat} />
        <Row label="Encounter Rate" value={`${monster.encounter_rate}%`} />
        <Row label="Number Encountered" value={String(monster.number_encountered)} />
      </dl>

      {(monster.physical_durability_notes || monster.mental_durability_notes) && (
        <div className="text-xs text-[var(--color-ink-faint)]">
          {monster.physical_durability_notes && (
            <div>Physical: {monster.physical_durability_notes}</div>
          )}
          {monster.mental_durability_notes && (
            <div>Mental: {monster.mental_durability_notes}</div>
          )}
        </div>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
        {monster.description}
      </p>

      <footer className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {monster.source}
      </footer>
    </ParchmentCard>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </dt>
      <dd className="font-mono text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
