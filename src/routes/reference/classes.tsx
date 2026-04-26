import { createFileRoute } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';

export const Route = createFileRoute('/reference/classes')({
  component: ClassesReference,
});

function ClassesReference(): React.JSX.Element {
  return (
    <ParchmentCard>
      <IlluminatedHeading level={2}>Classes</IlluminatedHeading>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        The class browser arrives in Phase 2 once the reference loader is wired
        to <code className="font-mono">docs/data/classes.yaml</code>.
      </p>
    </ParchmentCard>
  );
}
