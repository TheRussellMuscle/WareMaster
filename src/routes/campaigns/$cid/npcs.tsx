import * as React from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { RequireVault } from '@/components/shell/RequireVault';
import { InstanceList } from '@/components/instance/InstanceList';
import { useCampaignStore } from '@/stores/campaign-store';

export const Route = createFileRoute('/campaigns/$cid/npcs')({
  validateSearch: (search: Record<string, unknown>) => ({
    open: typeof search.open === 'string' ? search.open : undefined,
  }),
  component: NpcsTab,
});

function NpcsTab(): React.JSX.Element {
  return (
    <RequireVault>
      <NpcsTabInner />
    </RequireVault>
  );
}

function NpcsTabInner(): React.JSX.Element {
  const { cid } = useParams({ from: '/campaigns/$cid/npcs' });
  const { open } = Route.useSearch();
  const navigate = useNavigate();
  const current = useCampaignStore((s) => s.current);
  const loadByDir = useCampaignStore((s) => s.loadByDir);

  React.useEffect(() => {
    if (!current || current.dir_name !== cid) {
      void loadByDir(cid).then((c) => {
        if (!c) void navigate({ to: '/campaigns' });
      });
    }
  }, [cid, current, loadByDir, navigate]);

  if (!current || current.dir_name !== cid) {
    return <div className="text-sm italic text-[var(--color-ink-faint)]">Loading…</div>;
  }
  return (
    <InstanceList
      campaign={current}
      kind="npc"
      title="NPCs"
      description="Named NPCs from templates — beasts, simple stat blocks, or full character sheets."
      openId={open}
    />
  );
}
