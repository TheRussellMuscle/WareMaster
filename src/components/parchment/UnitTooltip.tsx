import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  WARES_UNITS,
  formatUnit,
  type WaresUnitKey,
} from '@/lib/wares-units';
import { cn } from '@/lib/cn';

interface UnitTooltipProps {
  unit: WaresUnitKey;
  amount?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Displays a Wares Blade unit with its real-world equivalent on hover.
 * Wraps the shadcn tooltip with parchment styling and the unit table lookup.
 */
export function UnitTooltip({
  unit,
  amount,
  className,
  children,
}: UnitTooltipProps): React.JSX.Element {
  const meta = WARES_UNITS[unit];
  const display = children ?? formatUnit(unit, amount);

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'cursor-help underline decoration-dotted decoration-[var(--color-parchment-400)] underline-offset-4',
            className,
          )}
        >
          {display}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="block font-display text-[var(--color-ink)]">
          {meta.label}
          {meta.abbr ? ` (${meta.abbr})` : ''}
        </span>
        <span className="block text-[var(--color-ink-soft)]">
          {meta.realWorld}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
