import { createFileRoute } from '@tanstack/react-router';
import { TemplateListRoute } from '@/components/template/TemplateListRoute';

export const Route = createFileRoute('/templates/npcs')({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === 'string' ? search.open : undefined,
  }),
  component: NpcTemplatesRoute,
});

function NpcTemplatesRoute(): React.JSX.Element {
  const { open } = Route.useSearch();
  return (
    <TemplateListRoute
      kind="npc"
      title="NPC Templates"
      description="User-authored NPC templates — three archetypes via discriminated union: beast (full monster stat block), simple (CHA-modifier + role), and full-character (complete sheet)."
      openId={open}
    />
  );
}
