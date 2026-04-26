import { cn } from '@/lib/cn';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import type { RyudeTemplate } from '@/domain/ryude';

interface RyudeStatBlockProps {
  ryude: RyudeTemplate;
  className?: string;
}

export function RyudeStatBlock({
  ryude,
  className,
}: RyudeStatBlockProps): React.JSX.Element {
  return (
    <ParchmentCard className={cn('flex flex-col gap-3', className)}>
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <IlluminatedHeading level={2}>{ryude.name}</IlluminatedHeading>
          <div className="mt-0.5 text-sm italic text-[var(--color-ink-soft)]">
            {ryude.type} &middot; Rank {ryude.ryude_rank}
          </div>
        </div>
        <div className="text-right text-xs text-[var(--color-ink-faint)]">
          <div>Persona Rank {ryude.persona_rank}</div>
          <div>Attune {ryude.attunement_value}</div>
        </div>
      </header>

      <dl className="grid grid-cols-4 gap-2">
        {(['spe', 'pow', 'arm', 'bal'] as const).map((key) => (
          <div
            key={key}
            className="flex flex-col items-center rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/70 px-2 py-1.5"
          >
            <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              {key.toUpperCase()}
            </dt>
            <dd className="font-mono text-lg leading-tight text-[var(--color-ink)]">
              {ryude.attributes[key]}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
        <Row label="Durability" value={String(ryude.durability)} />
        <Row label="Required Drive" value={String(ryude.required_drive)} />
        <Row label="Ego" value={ryude.ego == null ? '—' : String(ryude.ego)} />
        {ryude.numetic_modifier != null && (
          <Row
            label="Numetic Modifier"
            value={`+${ryude.numetic_modifier}`}
          />
        )}
        {ryude.binding_modifier != null && (
          <Row
            label="Binding Modifier"
            value={`+${ryude.binding_modifier}`}
          />
        )}
        {ryude.ryude_mind_durability != null && (
          <Row
            label="Mind Durability"
            value={String(ryude.ryude_mind_durability)}
          />
        )}
      </dl>

      {ryude.equipment.length > 0 && (
        <div className="text-sm">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Equipment
          </div>
          <div>{ryude.equipment.join(' · ')}</div>
        </div>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
        {ryude.description}
      </p>

      {ryude.courser_perks && ryude.courser_perks.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-ink-soft)]">
          {ryude.courser_perks.map((perk, i) => (
            <li key={i}>{perk}</li>
          ))}
        </ul>
      )}

      {ryude.notes && ryude.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-ink-faint)]">
          {ryude.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}

      <footer className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        <span>{ryude.source}</span>
        <span>
          Walking <UnitTooltip unit="li" amount={3} />/<UnitTooltip unit="hour" />
        </span>
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
