import * as React from 'react';
import { cn } from '@/lib/cn';
import type { ClassId } from '@/domain/class';
import { usePortrait, type PortraitFallback } from '@/hooks/usePortrait';

interface PortraitProps {
  /** Vault-relative path to a custom portrait (e.g. `portraits/characters/<id>.png`). */
  vaultPath?: string | null;
  /** Fallback discriminator — drives both bundled lookup and CSS placeholder. */
  fallback?: PortraitFallback;
  /**
   * Legacy shorthand — equivalent to `fallback={{ kind: 'class', classId }}`.
   * Use the explicit `fallback` prop in new code.
   */
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

const NEUTRAL_TINT =
  'bg-[var(--color-parchment-200)] text-[var(--color-ink-soft)] border-[var(--color-parchment-400)]';
const MONSTER_TINT =
  'bg-[var(--color-rust)]/5 text-[var(--color-ink-soft)] border-[var(--color-parchment-400)]';
const RYUDE_TINT =
  'bg-[var(--color-verdigris)]/5 text-[var(--color-ink-soft)] border-[var(--color-parchment-400)]';

function fallbackLabel(fallback: PortraitFallback, name: string): string {
  switch (fallback.kind) {
    case 'class':
      return CLASS_LABEL[fallback.classId];
    case 'monster':
      return fallback.rank ? `R${fallback.rank}` : initials(name);
    case 'ryude':
      return fallback.rType.charAt(0); // F / C / M
    case 'npc':
      return initials(name);
  }
}

function fallbackTint(fallback: PortraitFallback): string {
  switch (fallback.kind) {
    case 'class':
      return CLASS_TINT[fallback.classId];
    case 'monster':
      return MONSTER_TINT;
    case 'ryude':
      return RYUDE_TINT;
    case 'npc':
      return NEUTRAL_TINT;
  }
}

/**
 * Square portrait. Renders a custom uploaded image when `vaultPath` is set,
 * otherwise loads a bundled default for the entity kind, otherwise a CSS
 * placeholder. See `usePortrait` for the full resolution chain.
 */
export function Portrait({
  vaultPath,
  fallback: fallbackProp,
  classId,
  name,
  size = 'md',
  className,
}: PortraitProps): React.JSX.Element {
  const fallback: PortraitFallback =
    fallbackProp ??
    (classId
      ? { kind: 'class', classId }
      : { kind: 'class', classId: 'tradesfolk' });
  const [errored, setErrored] = React.useState(false);
  const { url, tier } = usePortrait({ vaultPath, fallback });

  React.useEffect(() => {
    setErrored(false);
  }, [url]);

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

  // CSS placeholder (custom image failed OR bundled image missing).
  const tint = fallbackTint(fallback);
  const label = tier === 'placeholder' ? initials(name) : fallbackLabel(fallback, name);

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
