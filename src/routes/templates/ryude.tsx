import { createFileRoute } from '@tanstack/react-router';
import { TemplateListRoute } from '@/components/template/TemplateListRoute';

export const Route = createFileRoute('/templates/ryude')({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === 'string' ? search.open : undefined,
  }),
  component: RyudeTemplatesRoute,
});

function RyudeTemplatesRoute(): React.JSX.Element {
  const { open } = Route.useSearch();
  return (
    <TemplateListRoute
      kind="ryude"
      title="Ryude Templates"
      description="Bundled Ryude (Footman / Courser / Maledictor) and your vault-authored overrides."
      openId={open}
    />
  );
}
