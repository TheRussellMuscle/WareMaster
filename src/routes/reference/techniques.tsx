import { createFileRoute } from '@tanstack/react-router';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import { TechniqueList } from '@/components/stat/TechniqueList';
import type { Gate, TechniqueFile } from '@/domain/technique';

export const Route = createFileRoute('/reference/techniques')({
  component: TechniquesReference,
});

const GATE_ORDER: Gate[] = [
  'gateless',
  'sun',
  'metal',
  'fire',
  'wood',
  'moon',
  'wind',
  'water',
  'earth',
];

function TechniquesReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Techniques"
      subtitle="Word-Casting (8 Gates + Gateless), Numetic Arts, and Invocations. Source: Playkit chapters 5–7."
    >
      {(catalog) => {
        const gates: TechniqueFile[] = [];
        for (const gate of GATE_ORDER) {
          const file = catalog.techniques.wordCasting[gate];
          if (file) gates.push(file);
        }

        return (
          <div className="flex flex-col gap-4">
            <ParchmentCard>
              <h2 className="mb-2 font-display text-xl text-[var(--color-ink)]">
                Word-Casting
              </h2>
              <TechniqueList files={gates} />
            </ParchmentCard>

            <ParchmentCard>
              <h2 className="mb-2 font-display text-xl text-[var(--color-ink)]">
                Numetic Arts
              </h2>
              <TechniqueList files={[catalog.techniques.numeticArts]} />
            </ParchmentCard>

            <ParchmentCard>
              <h2 className="mb-2 font-display text-xl text-[var(--color-ink)]">
                Invocations
              </h2>
              <TechniqueList files={[catalog.techniques.invocations]} />
            </ParchmentCard>
          </div>
        );
      }}
    </ReferenceShell>
  );
}
