import { createFileRoute } from '@tanstack/react-router';
import { TemplateListRoute } from '@/components/template/TemplateListRoute';

export const Route = createFileRoute('/templates/npcs')({
  component: NpcTemplatesRoute,
});

function NpcTemplatesRoute(): React.JSX.Element {
  return (
    <TemplateListRoute
      kind="npc"
      title="NPC Templates"
      description="User-authored NPC templates — three archetypes via discriminated union: beast (full monster stat block), simple (CHA-modifier + role), and full-character (complete sheet)."
    />
  );
}
