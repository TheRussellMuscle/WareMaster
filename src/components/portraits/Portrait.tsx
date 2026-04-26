import * as React from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { cn } from '@/lib/cn';
import type { ClassId } from '@/domain/class';
import { useVaultStore } from '@/stores/vault-store';

interface PortraitProps {
  /** Vault-relative path to a custom portrait (e.g. `portraits/characters/<id>.png`). */
  vaultPath?: string | null;
  /** Class fallback used when no custom portrait is set or it fails to load. */
  classId?: ClassId | null;
  /** Display label (e.g. character name) used as alt text and badge. */
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<PortraitProps['size']>, string> = {
  sm: 'h-12 w-12 text-base',
  md: 'h-20 w-20 text-2xl',
  lg: 'h-32 w-32 text-4xl',
};

const CLASS_LABEL: Record<ClassId, string> = {
  warrior: 'WR',
  'word-caster': 'WC',
  spiritualist: 'SP',
  tradesfolk: 'TF',
};

const CLASS_TINT: Record<ClassId, string> = {
  warrior:
    'bg-[var(--color-rust)]/10 text-[var(--color-rust)] border-[var(--color-rust)]/40',
  'word-caster':
    'bg-[var(--color-gilt)]/10 text-[var(--color-gilt)] border-[var(--color-gilt)]/40',
  spiritualist:
    'bg-[var(--color-verdigris)]/10 text-[var(--color-verdigris)] border-[var(--color-verdigris)]/40',
  tradesfolk:
    'bg-[var(--color-parchment-300)]/30 text-[var(--color-ink-soft)] border-[var(--color-parchment-400)]',
};

/**
 * Square portrait. Renders a custom uploaded image when `vaultPath` is set,
 * otherwise a class-fallback placeholder. Custom images live under the
 * vault at `portraits/characters/<id>.<ext>` per PLAN.md §B; we resolve them
 * to a webview-accessible URL via Tauri's `convertFileSrc`.
 */
export function Portrait({
  vaultPath,
  classId,
  name,
  size = 'md',
  className,
}: PortraitProps): React.JSX.Element {
  const root = useVaultStore((s) => s.root);
  const [errored, setErrored] = React.useState(false);

  // Reset error state if the source path changes (e.g. portrait re-uploaded).
  React.useEffect(() => {
    setErrored(false);
  }, [vaultPath, root]);

  const url = React.useMemo(() => {
    if (!vaultPath || !root) return null;
    // Build absolute host path. Both POSIX and Windows are valid for join.
    const sep = root.includes('\\') ? '\\' : '/';
    const trimmedRoot = root.replace(/[\\/]$/, '');
    const trimmedRel = vaultPath.replace(/^[\\/]/, '').replace(/\\/g, '/');
    return convertFileSrc(`${trimmedRoot}${sep}${trimmedRel}`);
  }, [vaultPath, root]);

  if (url && !errored) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-sm border-2 border-[var(--color-parchment-400)]',
          SIZE_CLASS[size],
          className,
        )}
      >
        <img
          src={url}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  const tint = classId
    ? CLASS_TINT[classId]
    : 'bg-[var(--color-parchment-200)] text-[var(--color-ink-soft)] border-[var(--color-parchment-400)]';
  const label = classId
    ? CLASS_LABEL[classId]
    : initials(name);

  return (
    <div
      role="img"
      aria-label={`${name} portrait placeholder`}
      className={cn(
        'flex items-center justify-center rounded-sm border-2 font-display font-semibold tracking-wide',
        SIZE_CLASS[size],
        tint,
        className,
      )}
    >
      {label}
    </div>
  );
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '·';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
