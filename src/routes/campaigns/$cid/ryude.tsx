import { createFileRoute } from '@tanstack/react-router';
import { Cog } from 'lucide-react';
import { CategoryPlaceholder } from '@/components/sheet/CategoryPlaceholder';

export const Route = createFileRoute('/campaigns/$cid/ryude')({
  component: RyudeTab,
});

function RyudeTab(): React.JSX.Element {
  return (
    <CategoryPlaceholder
      title="Ryudes"
      icon={Cog}
      description="Wares-powered Ryude — Footmen, Coursers, and Maledictors operated by a character or NPC."
      phase="Phase 4"
      whatItWillDo={[
        'Spawn Ryude from templates — Footman / Courser / Maledictor',
        'Track per-unit Durability, attribute damage, and attunement state',
        'Assign and unassign operators (PC or NPC instance)',
        'Repair queue with day-counted ETAs (Courser self-repair 1/day)',
      ]}
    />
  );
}
