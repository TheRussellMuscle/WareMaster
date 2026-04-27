import { createFileRoute } from '@tanstack/react-router';
import { TemplateListRoute } from '@/components/template/TemplateListRoute';

export const Route = createFileRoute('/templates/ryude')({
  component: RyudeTemplatesRoute,
});

function RyudeTemplatesRoute(): React.JSX.Element {
  return (
    <TemplateListRoute
      kind="ryude"
      title="Ryude Templates"
      description="Bundled Ryude (Footman / Courser / Maledictor) and your vault-authored overrides."
    />
  );
}
