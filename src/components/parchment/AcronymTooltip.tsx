import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WARES_ACRONYMS, type WaresAcronymKey } from '@/lib/wares-units';
import { cn } from '@/lib/cn';

interface AcronymTooltipProps {
  code: WaresAcronymKey;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Displays a Wares Blade acronym (IN, BN, PP, etc.) with its meaning on hover.
 */
export function AcronymTooltip({
  code,
  className,
  children,
}: AcronymTooltipProps): React.JSX.Element {
  const meaning = WARES_ACRONYMS[code];

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'cursor-help font-mono uppercase tracking-wide',
            'underline decoration-dotted decoration-[var(--color-parchment-400)] underline-offset-4',
            className,
          )}
        >
          {children ?? code}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="block font-display text-[var(--color-ink)]">
          {code}
        </span>
        <span className="block text-[var(--color-ink-soft)]">{meaning}</span>
      </TooltipContent>
    </Tooltip>
  );
}
