import * as React from 'react';
import { cn } from '@/lib/cn';

type ParchmentCardProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Aged-paper container with double-rule border and subtle vignette.
 * Used as the visual unit for stat blocks, dialogues, and route content.
 */
export const ParchmentCard = React.forwardRef<
  HTMLDivElement,
  ParchmentCardProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'parchment-surface rounded-sm p-6',
      'border-2 border-double border-[var(--color-parchment-400)]',
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
ParchmentCard.displayName = 'ParchmentCard';

interface IlluminatedHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3;
}

export function IlluminatedHeading({
  level = 1,
  className,
  children,
  ...props
}: IlluminatedHeadingProps): React.JSX.Element {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
  const sizeClass =
    level === 1
      ? 'text-3xl tracking-wide'
      : level === 2
        ? 'text-2xl tracking-wide'
        : 'text-xl';
  return (
    <Tag
      className={cn(
        'font-display text-[var(--color-ink)]',
        sizeClass,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function SealedDivider({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-3 text-[var(--color-parchment-400)]',
        className,
      )}
      {...props}
    >
      <div className="ink-rule flex-1" />
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        aria-hidden
      >
        <circle cx="12" cy="12" r="6.5" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
      </svg>
      <div className="ink-rule flex-1" />
    </div>
  );
}
