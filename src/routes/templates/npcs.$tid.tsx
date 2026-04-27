import { createFileRoute, useParams } from '@tanstack/react-router';
import { TemplateDetailRoute } from '@/components/template/TemplateDetailRoute';

export const Route = createFileRoute('/templates/npcs/$tid')({
  component: NpcTemplateDetail,
});

function NpcTemplateDetail(): React.JSX.Element {
  const { tid } = useParams({ from: '/templates/npcs/$tid' });
  return (
    <TemplateDetailRoute
      kind="npc"
      templateId={tid}
      backTo="/templates/npcs"
    />
  );
}
