import { AlertTriangle } from 'lucide-react';

interface VaultParseErrorsProps {
  failures: Array<{ path: string; message: string }>;
  scope?: string;
}

/**
 * Surfaces YAML parse / schema failures from the persistence layer instead
 * of silently dropping the file. Useful when the user hand-edits a vault
 * file and breaks it: the broken record stays visible alongside the
 * loaders' successes.
 */
export function VaultParseErrors({
  failures,
  scope,
}: VaultParseErrorsProps): React.JSX.Element | null {
  if (failures.length === 0) return null;
  return (
    <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-display text-[var(--color-rust)]">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        <span className="text-base">
          {failures.length} {scope ?? 'file'}
          {failures.length === 1 ? '' : 's'} could not be loaded
        </span>
      </div>
      <p className="text-xs text-[var(--color-ink-soft)]">
        These files are still on disk but failed to parse. Open the file in
        your editor, fix the highlighted issue, and re-open this page.
      </p>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {failures.map((f, i) => (
          <li key={i} className="rounded-sm bg-[var(--color-parchment-50)]/70 px-2 py-1">
            <div className="text-[var(--color-rust)]">{f.path}</div>
            <div className="text-[var(--color-ink-soft)]">{f.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
