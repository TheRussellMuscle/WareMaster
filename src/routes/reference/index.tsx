import { createFileRoute, Link } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';

export const Route = createFileRoute('/reference/')({
  component: ReferenceIndex,
});

const SECTIONS = [
  { to: '/reference/classes', label: 'Classes', summary: 'The four classes, perks, packages.' },
  { to: '/reference/skills', label: 'Skills', summary: 'Combat, Adventure, and Specialized skills.' },
  { to: '/reference/weapons', label: 'Weapons', summary: 'Weapons, ammunition, BN modifiers, damage.' },
  { to: '/reference/armor', label: 'Armor', summary: 'Body, head, and shield slots.' },
  { to: '/reference/beastiary', label: 'Bestiary', summary: 'Starter monsters with stats vs characters and Ryude.' },
  { to: '/reference/ryude', label: 'Ryude', summary: 'Sample mecha units with attributes and equipment.' },
  { to: '/reference/techniques', label: 'Techniques', summary: 'Word-Casting, Numetic Arts, and Invocations.' },
  { to: '/reference/tables', label: 'Tables', summary: 'Difficulty, recovery, repair, damage tables.' },
] as const;

function ReferenceIndex(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <IlluminatedHeading level={1}>Reference</IlluminatedHeading>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          The bundled Wares Blade Playkit reference, browsable. Editing the
          source YAML in <code className="font-mono">docs/data/</code> updates
          the live view in dev mode after restart.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="block rounded-sm transition-colors hover:bg-[var(--color-parchment-200)]/50"
          >
            <ParchmentCard className="p-4">
              <h2 className="font-display text-lg text-[var(--color-ink)]">
                {section.label}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
                {section.summary}
              </p>
            </ParchmentCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
