import * as React from 'react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { useVaultStore } from '@/stores/vault-store';

interface RequireVaultProps {
  children: React.ReactNode;
}

/**
 * Gate route trees that need disk access. Triggers vault bootstrap on mount
 * and renders an inline onboarding card when no vault is configured.
 */
export function RequireVault({ children }: RequireVaultProps): React.JSX.Element {
  const status = useVaultStore((s) => s.status);
  const root = useVaultStore((s) => s.root);
  const error = useVaultStore((s) => s.error);
  const init = useVaultStore((s) => s.init);
  const useDefault = useVaultStore((s) => s.useDefault);
  const pickAndSet = useVaultStore((s) => s.pickAndSet);
  const [defaultPath, setDefaultPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === 'idle') void init();
  }, [status, init]);

  React.useEffect(() => {
    let cancelled = false;
    if (status === 'unconfigured' && defaultPath == null) {
      void (async () => {
        const { getDefaultVaultRoot } = await import('@/persistence/vault');
        const path = await getDefaultVaultRoot().catch(() => null);
        if (!cancelled) setDefaultPath(path);
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [status, defaultPath]);

  if (status === 'ready' && root) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <ParchmentCard>
        <IlluminatedHeading level={1}>Welcome to WareMaster</IlluminatedHeading>
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
          To begin, choose where to keep your vault — the folder that will
          hold every campaign, character, NPC, and Ryude as plain
          YAML and Markdown files. Easy to back up, version with git, or
          hand-edit in any text editor. Nothing is sent over the network.
        </p>

        {defaultPath && (
          <div className="mt-3 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-2 text-sm">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Default location
            </div>
            <code className="font-mono text-xs text-[var(--color-rust)]">
              {defaultPath}
            </code>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-2 text-sm text-[var(--color-rust)]">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void useDefault()}
            disabled={status === 'checking'}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:opacity-50"
          >
            Use default location
          </button>
          <button
            type="button"
            onClick={() => void pickAndSet()}
            disabled={status === 'checking'}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-50"
          >
            Choose folder…
          </button>
        </div>

        <details className="mt-3 text-xs text-[var(--color-ink-faint)]">
          <summary className="cursor-pointer hover:text-[var(--color-ink-soft)]">
            Why two options?
          </summary>
          <p className="mt-1.5 pl-3">
            <span className="font-medium">Use default location</span> creates
            a fresh vault in your Documents folder — pick this if you're new.
            <br />
            <span className="font-medium">Choose folder…</span> points at an
            existing vault you've copied or restored from backup.
          </p>
        </details>

        {status === 'checking' && (
          <p className="mt-2 text-xs text-[var(--color-ink-faint)]">Working…</p>
        )}
      </ParchmentCard>
    </div>
  );
}
