import { createFileRoute } from '@tanstack/react-router';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import { MonsterStatBlock } from '@/components/stat/MonsterStatBlock';

export const Route = createFileRoute('/reference/beastiary')({
  component: BeastiaryReference,
});

function BeastiaryReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Bestiary"
      subtitle="Starter monsters from the Playkit. Bracketed [vs Ryude] stats appear separately when present."
    >
      {(catalog) => (
        <div className="flex flex-col gap-4">
          {catalog.beastiary.monsters.map((m) => (
            <MonsterStatBlock key={m.id} monster={m} />
          ))}
        </div>
      )}
    </ReferenceShell>
  );
}
