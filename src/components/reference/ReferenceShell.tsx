import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

interface ReferenceShellProps {
  title: string;
  subtitle?: React.ReactNode;
  children: (catalog: ReferenceCatalog) => React.ReactNode;
}

/**
 * Wraps a reference page with consistent loading and error UX so that each
 * route only has to render data once the catalog is ready.
 */
export function ReferenceShell({
  title,
  subtitle,
  children,
}: ReferenceShellProps): React.JSX.Element {
  const { status, catalog, failures } = useReferenceData();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header>
        <IlluminatedHeading level={1}>{title}</IlluminatedHeading>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{subtitle}</p>
        )}
      </header>

      {status === 'loading' && (
        <ParchmentCard>Loading reference data…</ParchmentCard>
      )}

      {status === 'error' && (
        <ParchmentCard>
          <h2 className="mb-2 font-display text-lg text-[var(--color-rust)]">
            Reference data failed to load
          </h2>
          <ul className="space-y-2 text-sm">
            {failures.map((f, i) => (
              <li
                key={i}
                className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-2"
              >
                <div className="font-mono text-xs text-[var(--color-rust)]">
                  {f.file}
                </div>
                <div>{f.message}</div>
                {f.detail !== undefined && (
                  <pre className="mt-1 overflow-x-auto text-[10px] text-[var(--color-ink-faint)]">
                    {JSON.stringify(f.detail, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </ParchmentCard>
      )}

      {status === 'ready' && catalog && children(catalog)}
    </div>
  );
}
