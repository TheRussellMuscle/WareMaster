import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { RequireVault } from '@/components/shell/RequireVault';
import { VaultParseErrors } from '@/components/shell/VaultParseErrors';
import { useVaultStore } from '@/stores/vault-store';
import { useCampaignStore } from '@/stores/campaign-store';

export const Route = createFileRoute('/campaigns/')({
  component: CampaignsIndex,
});

function CampaignsIndex(): React.JSX.Element {
  return (
    <RequireVault>
      <CampaignsListInner />
    </RequireVault>
  );
}

function CampaignsListInner(): React.JSX.Element {
  const vaultRoot = useVaultStore((s) => s.root);
  const list = useCampaignStore((s) => s.list);
  const failures = useCampaignStore((s) => s.listFailures);
  const loading = useCampaignStore((s) => s.loadingList);
  const refresh = useCampaignStore((s) => s.refreshList);

  React.useEffect(() => {
    if (vaultRoot) void refresh();
  }, [vaultRoot, refresh]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <IlluminatedHeading level={1}>Campaigns</IlluminatedHeading>
        <Link
          to="/campaigns/new"
          className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
        >
          <Plus className="h-4 w-4" aria-hidden /> New campaign
        </Link>
      </header>

      <p className="text-sm text-[var(--color-ink-soft)]">
        Vault:{' '}
        <code className="font-mono text-xs text-[var(--color-ink-faint)]">
          {vaultRoot ?? '—'}
        </code>
      </p>

      <VaultParseErrors failures={failures} scope="campaign" />

      {loading && (
        <ParchmentCard>Loading campaigns…</ParchmentCard>
      )}

      {!loading && list.length === 0 && (
        <ParchmentCard>
          <p className="text-[var(--color-ink-soft)]">
            No campaigns yet. Create your first one to start tracking
            characters and combat.
          </p>
        </ParchmentCard>
      )}

      <div className="flex flex-col gap-2">
        {list.map((c) => (
          <Link
            key={c.id}
            to="/campaigns/$cid"
            params={{ cid: c.dir_name }}
            className="block transition-colors hover:bg-[var(--color-parchment-200)]/40"
          >
            <ParchmentCard className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg text-[var(--color-ink)]">
                    {c.name}
                  </h2>
                  {c.wm && (
                    <div className="text-xs text-[var(--color-ink-faint)]">
                      WM: {c.wm}
                    </div>
                  )}
                </div>
                <div className="text-right text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  <div>Updated {formatDate(c.updated_at)}</div>
                  <div className="font-mono">{c.id}</div>
                </div>
              </div>
              {c.description && (
                <p className="mt-1 text-sm italic text-[var(--color-ink-soft)]">
                  {c.description}
                </p>
              )}
            </ParchmentCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
