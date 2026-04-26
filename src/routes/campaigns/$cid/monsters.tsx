import { createFileRoute } from '@tanstack/react-router';
import { PawPrint } from 'lucide-react';
import { CategoryPlaceholder } from '@/components/sheet/CategoryPlaceholder';

export const Route = createFileRoute('/campaigns/$cid/monsters')({
  component: MonstersTab,
});

function MonstersTab(): React.JSX.Element {
  return (
    <CategoryPlaceholder
      title="Monsters"
      icon={PawPrint}
      description="Named monster instances — bestiary creatures with this campaign's history and damage state."
      phase="Phase 4"
      whatItWillDo={[
        'Spawn instances from the bundled bestiary or your own templates',
        'Track per-instance state — current damage, status, location',
        'Use bestiary base stats with optional overrides (hardier loot drop, named villain)',
        'Vs-Ryude stat brackets when fighting mecha',
      ]}
    />
  );
}
