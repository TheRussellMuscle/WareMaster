import { createFileRoute } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';

export const Route = createFileRoute('/campaigns/')({
  component: CampaignsIndex,
});

function CampaignsIndex(): React.JSX.Element {
  return (
    <ParchmentCard>
      <IlluminatedHeading level={2}>Campaigns</IlluminatedHeading>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        Campaign management arrives in Phase 3.
      </p>
    </ParchmentCard>
  );
}
