import { createFileRoute } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage(): React.JSX.Element {
  return (
    <ParchmentCard>
      <IlluminatedHeading level={2}>Settings</IlluminatedHeading>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        Vault path, theme, and dice-mode defaults will live here in later phases.
      </p>
    </ParchmentCard>
  );
}
