import { createFileRoute, useParams } from '@tanstack/react-router';
import { TemplateDetailRoute } from '@/components/template/TemplateDetailRoute';

export const Route = createFileRoute('/templates/ryude/$tid')({
  component: RyudeTemplateDetail,
});

function RyudeTemplateDetail(): React.JSX.Element {
  const { tid } = useParams({ from: '/templates/ryude/$tid' });
  return (
    <TemplateDetailRoute
      kind="ryude"
      templateId={tid}
      backTo="/templates/ryude"
    />
  );
}
