import { Dices } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { useOptionalSheetActions } from '@/components/sheet/SheetActionsContext';
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
 * Shows the score and (optionally) its Base value (floor / 3). When rendered
 * inside a SheetActionsProvider, each cell becomes a button that opens an
 * Ability Roll dialog (LUC opens a LUC Roll instead — Rule §07).
 */
export function StatBlock({
  scores,
  showBase = true,
  className,
}: StatBlockProps): React.JSX.Element {
  const actions = useOptionalSheetActions();
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
        const interactive = actions != null && hasScore;
        const onClick = !interactive
          ? undefined
          : code === 'LUC'
            ? () => actions!.openSave('luc-roll')
            : () => actions!.openAbility(code);

        const inner = (
          <>
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
            {interactive && (
              <Dices
                className="absolute right-1 top-1 h-3 w-3 text-[var(--color-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            )}
          </>
        );

        if (interactive) {
          return (
            <button
              key={code}
              type="button"
              onClick={onClick}
              title={
                code === 'LUC'
                  ? 'Roll a LUC Roll'
                  : `Roll ${code}`
              }
              className="group relative flex flex-col items-center rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/70 px-2 py-1.5 transition-colors hover:bg-[var(--color-gilt)]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gilt)]/40"
            >
              {inner}
            </button>
          );
        }

        return (
          <div
            key={code}
            className="relative flex flex-col items-center rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/70 px-2 py-1.5"
          >
            {inner}
          </div>
        );
      })}
    </dl>
  );
}
