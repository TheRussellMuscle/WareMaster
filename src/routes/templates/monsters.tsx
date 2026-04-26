import { createFileRoute } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';

export const Route = createFileRoute('/templates/monsters')({
  component: MonsterTemplates,
});

function MonsterTemplates(): React.JSX.Element {
  return (
    <ParchmentCard>
      <IlluminatedHeading level={2}>Monster Templates</IlluminatedHeading>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        User-authored monster templates appear here in Phase 4.
      </p>
    </ParchmentCard>
  );
}
