import * as React from 'react';
import {
  IlluminatedHeading,
  ParchmentCard,
  SealedDivider,
} from '@/components/parchment/ParchmentCard';

interface CategoryPlaceholderProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  phase: string;
  whatItWillDo: string[];
}

/**
 * Placeholder shown for the NPCs / Monsters / Wares sub-nav tabs until the
 * Phase 4 template + instance work lands. Mirrors the campaign sub-nav
 * scaffolding so the sub-nav doesn't feel half-built; the content is honest
 * about what's coming.
 */
export function CategoryPlaceholder({
  title,
  icon: Icon,
  description,
  phase,
  whatItWillDo,
}: CategoryPlaceholderProps): React.JSX.Element {
  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-[var(--color-rust)]" aria-hidden />
        <IlluminatedHeading level={1}>{title}</IlluminatedHeading>
        <span className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {phase}
        </span>
      </header>
      <p className="text-sm italic text-[var(--color-ink-soft)]">{description}</p>

      <ParchmentCard className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-[var(--color-ink)]">
          Coming up
        </h2>
        <ul className="ml-5 list-disc space-y-1 text-sm text-[var(--color-ink-soft)]">
          {whatItWillDo.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <SealedDivider />
        <p className="text-xs italic text-[var(--color-ink-faint)]">
          Tracked in the project plan as {phase}. The character sheet, dice
          engine, and per-character action log are live now — try them on a
          character to drive a Segment-by-Segment fight today.
        </p>
      </ParchmentCard>
    </div>
  );
}
