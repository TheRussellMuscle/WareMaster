import { createFileRoute, useParams } from '@tanstack/react-router';
import { TemplateDetailRoute } from '@/components/template/TemplateDetailRoute';

export const Route = createFileRoute('/templates/monsters/$tid')({
  component: MonsterTemplateDetail,
});

function MonsterTemplateDetail(): React.JSX.Element {
  const { tid } = useParams({ from: '/templates/monsters/$tid' });
  return (
    <TemplateDetailRoute
      kind="monster"
      templateId={tid}
      backTo="/templates/monsters"
    />
  );
}
