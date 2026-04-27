import { createFileRoute } from '@tanstack/react-router';
import { TemplateListRoute } from '@/components/template/TemplateListRoute';

export const Route = createFileRoute('/templates/monsters')({
  component: MonsterTemplatesRoute,
});

function MonsterTemplatesRoute(): React.JSX.Element {
  return (
    <TemplateListRoute
      kind="monster"
      title="Monster Templates"
      description="Bundled bestiary monsters and your vault-authored overrides. Vault templates override bundled ones with the same id; campaign templates override both (manage those from the campaign templates folder)."
    />
  );
}
