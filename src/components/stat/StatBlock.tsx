import { cn } from '@/lib/cn';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import {
  ABILITY_CODES,
  baseValue,
  type AbilityCode,
} from '@/domain/attributes';

type AbilityScores = Partial<Record<AbilityCode, number | null | undefined>>;

interface StatBlockProps {
  scores: AbilityScores;
  showBase?: boolean;
  className?: string;
}

/**
 * Six-cell ability score grid used for characters, NPCs, and monsters.
 * Shows the score and (optionally) its Base value (floor / 3).
 */
export function StatBlock({
  scores,
  showBase = true,
  className,
}: StatBlockProps): React.JSX.Element {
  return (
    <dl
      className={cn(
        'grid grid-cols-3 gap-2 text-sm md:grid-cols-6',
        className,
      )}
    >
      {ABILITY_CODES.map((code) => {
        const score = scores[code];
        const hasScore = typeof score === 'number';
        return (
          <div
            key={code}
            className="flex flex-col items-center rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/70 px-2 py-1.5"
          >
            <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              <AcronymTooltip code={code} />
            </dt>
            <dd className="font-mono text-lg leading-tight text-[var(--color-ink)]">
              {hasScore ? score : '—'}
            </dd>
            {showBase && code !== 'LUC' && (
              <dd className="text-[10px] text-[var(--color-ink-faint)]">
                Base {hasScore && score !== null ? baseValue(score) : '—'}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
