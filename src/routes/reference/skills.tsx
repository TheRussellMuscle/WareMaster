import { createFileRoute } from '@tanstack/react-router';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import { SkillList } from '@/components/stat/SkillList';

export const Route = createFileRoute('/reference/skills')({
  component: SkillsReference,
});

function SkillsReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Skills"
      subtitle="Combat, Adventure (Physical and Mental), and Specialized skills with their governing Ability."
    >
      {(catalog) => (
        <ParchmentCard>
          <SkillList skills={catalog.skills.skills} />
        </ParchmentCard>
      )}
    </ReferenceShell>
  );
}
