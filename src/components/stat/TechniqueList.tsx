import { cn } from '@/lib/cn';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import type { Technique, TechniqueFile } from '@/domain/technique';

interface TechniqueListProps {
  files: TechniqueFile[];
  className?: string;
}

export function TechniqueList({
  files,
  className,
}: TechniqueListProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {files.map((file) => (
        <TechniqueGroup key={`${file.discipline}:${file.gate ?? ''}`} file={file} />
      ))}
    </div>
  );
}

function TechniqueGroup({ file }: { file: TechniqueFile }): React.JSX.Element {
  const heading = file.gate ? `Gate of ${capitalize(file.gate)}` : disciplineLabel(file);
  return (
    <section>
      <header className="mb-2">
        <h3 className="font-display text-lg text-[var(--color-ink)]">{heading}</h3>
        {file.gate_description && (
          <p className="text-xs italic text-[var(--color-ink-soft)]">
            {file.gate_description}
          </p>
        )}
      </header>
      <ul className="flex flex-col gap-2">
        {file.techniques.map((tech) => (
          <TechniqueItem key={tech.id} tech={tech} />
        ))}
      </ul>
    </section>
  );
}

function TechniqueItem({ tech }: { tech: Technique }): React.JSX.Element {
  return (
    <li className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2 text-sm">
      <header className="flex items-baseline justify-between gap-2">
        <div className="font-display text-base text-[var(--color-ink)]">
          {tech.name}
          {tech.romanization && (
            <span className="ml-2 font-mono text-xs uppercase text-[var(--color-rust)]">
              {tech.romanization}
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-[var(--color-ink-faint)]">
          Lv {tech.level}
        </span>
      </header>

      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs md:grid-cols-4">
        <Field label="Cast">
          <UnitTooltip unit="segment" amount={tech.segments_required} />
        </Field>
        <Field label="Range">{tech.range}</Field>
        <Field label="Target">{tech.target}</Field>
        <Field label="Duration">{tech.duration}</Field>
        {tech.save && <Field label="Save">{tech.save}</Field>}
        {tech.requisites && <Field label="Requires">{tech.requisites}</Field>}
      </dl>

      <p className="mt-1.5 italic text-[var(--color-ink-soft)]">
        {tech.effect}
      </p>
      <p className="mt-1 whitespace-pre-line text-[var(--color-ink)]">
        {tech.description}
      </p>
      {tech.notes && (
        <p className="mt-1 text-xs italic text-[var(--color-ink-faint)]">
          {tech.notes}
        </p>
      )}
    </li>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </dt>
      <dd className="font-mono text-[var(--color-ink)]">{children}</dd>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function disciplineLabel(file: TechniqueFile): string {
  if (file.discipline === 'numetic-arts') return 'Numetic Arts (Monk Deeds)';
  if (file.discipline === 'invocation') return 'Invocations';
  if (file.gate === 'gateless') return 'Gateless Word-Casting';
  return 'Word-Casting';
}
