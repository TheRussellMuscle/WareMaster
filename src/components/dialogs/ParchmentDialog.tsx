import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ParchmentDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Tailwind width class (e.g. "w-[min(92vw,42rem)]"). Defaults to medium. */
  widthClass?: string;
  /** When false, the close button is hidden (required by some flows). */
  showCloseButton?: boolean;
  children: React.ReactNode;
  /** Optional sticky footer (e.g. confirm/cancel buttons). */
  footer?: React.ReactNode;
}

/**
 * Generic parchment-themed Radix Dialog shell. Use for spawn/edit dialogs
 * and template editors. Roll dialogs continue to use `RollDialogShell` and
 * destructive confirms continue to use `ConfirmDialog` — this exists for
 * the cases neither of those fit (Phase 4).
 */
export function ParchmentDialog({
  open,
  onClose,
  title,
  description,
  widthClass = 'w-[min(92vw,42rem)]',
  showCloseButton = true,
  children,
  footer,
}: ParchmentDialogProps): React.JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-ink)]/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'flex max-h-[88vh] flex-col rounded-sm border-2 border-[var(--color-parchment-400)]',
            'bg-[var(--color-parchment-50)] shadow-xl',
            widthClass,
          )}
          onEscapeKeyDown={onClose}
        >
          <header className="flex items-start justify-between gap-3 border-b border-[var(--color-parchment-300)] px-5 py-3">
            <div className="flex-1">
              <Dialog.Title className="font-display text-lg text-[var(--color-ink)]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description asChild>
                  <div className="mt-0.5 text-xs italic text-[var(--color-ink-soft)]">
                    {description}
                  </div>
                </Dialog.Description>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex items-center justify-end gap-2 border-t border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-5 py-3">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
