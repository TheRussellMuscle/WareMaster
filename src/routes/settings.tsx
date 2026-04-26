import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Folder } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
  SealedDivider,
} from '@/components/parchment/ParchmentCard';
import { useVaultStore } from '@/stores/vault-store';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage(): React.JSX.Element {
  const root = useVaultStore((s) => s.root);
  const status = useVaultStore((s) => s.status);
  const error = useVaultStore((s) => s.error);
  const pickAndSet = useVaultStore((s) => s.pickAndSet);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <IlluminatedHeading level={1}>Settings</IlluminatedHeading>

      <ParchmentCard className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg text-[var(--color-ink)]">Vault</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Where WareMaster stores your campaigns, characters, and (later)
            templates and portraits.
          </p>
        </div>

        <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Current location
          </div>
          {root ? (
            <code className="break-all font-mono text-xs text-[var(--color-rust)]">
              {root}
            </code>
          ) : (
            <span className="text-sm italic text-[var(--color-ink-faint)]">
              No vault configured.
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void pickAndSet()}
            disabled={status === 'checking'}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-50"
          >
            <Folder className="h-4 w-4" aria-hidden /> Choose new folder…
          </button>
        </div>

        {error && (
          <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-2 text-sm text-[var(--color-rust)]">
            {error}
          </div>
        )}

        <SealedDivider />

        <div className="rounded-sm border border-[var(--color-rust)]/30 bg-[var(--color-rust)]/5 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
          <strong className="text-[var(--color-rust)]">Heads up.</strong>{' '}
          Pointing WareMaster at a different folder does <em>not</em> move
          your existing campaigns. If you want to relocate the vault, copy
          the files yourself first using your OS file manager (or git), then
          point WareMaster at the new location here. Built-in import / export
          arrives in Phase 8.
        </div>
      </ParchmentCard>

      <ParchmentCard>
        <h2 className="font-display text-lg text-[var(--color-ink)]">
          More settings
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Theme, dice modes, and snapshot compaction will live here in later
          phases.
        </p>
      </ParchmentCard>
    </div>
  );
}
