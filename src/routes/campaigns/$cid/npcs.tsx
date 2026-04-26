import { createFileRoute } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { CategoryPlaceholder } from '@/components/sheet/CategoryPlaceholder';

export const Route = createFileRoute('/campaigns/$cid/npcs')({
  component: NpcsTab,
});

function NpcsTab(): React.JSX.Element {
  return (
    <CategoryPlaceholder
      title="NPCs"
      icon={UserPlus}
      description="Named NPCs spawned from templates — merchants, soldiers, allies, and adversaries."
      phase="Phase 4"
      whatItWillDo={[
        'Spawn instances from global or campaign-scoped NPC templates',
        'Three archetypes — beast, simple-stat, and full-character schemas',
        'Override individual stats per instance (name, portrait, equipment)',
        'Track current state (damage, status effects, location) across sessions',
      ]}
    />
  );
}
