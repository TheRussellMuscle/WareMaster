import * as React from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { RequireVault } from '@/components/shell/RequireVault';
import { InstanceDetail } from '@/components/instance/InstanceDetail';
import { useCampaignStore } from '@/stores/campaign-store';

export const Route = createFileRoute('/campaigns/$cid/monsters/$mid')({
  component: MonsterDetailRoute,
});

function MonsterDetailRoute(): React.JSX.Element {
  return (
    <RequireVault>
      <Inner />
    </RequireVault>
  );
}

function Inner(): React.JSX.Element {
  const { cid, mid } = useParams({ from: '/campaigns/$cid/monsters/$mid' });
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
    <InstanceDetail
      campaign={current}
      kind="monster"
      instanceId={mid}
      backTo="/campaigns/$cid/monsters"
    />
  );
}
