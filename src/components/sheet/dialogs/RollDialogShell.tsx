import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Info, X } from 'lucide-react';

interface RollDialogShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  ruleNote: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Parchment-styled modal shell shared by all sheet roll dialogs. Provides:
 *  - Radix Dialog overlay + ESC handling
 *  - Title + close button
 *  - Rule-note slot (italic explainer with chapter callout)
 *  - Vertical content stack
 */
export function RollDialogShell({
  open,
  onClose,
  title,
  ruleNote,
  children,
}: RollDialogShellProps): React.JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-ink)]/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sm border-2 border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] p-5 shadow-xl"
          onEscapeKeyDown={onClose}
        >
          <header className="flex items-start justify-between">
            <Dialog.Title className="font-display text-lg text-[var(--color-ink)]">
              {title}
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>
          <Dialog.Description asChild>
            <div className="mt-1 flex items-start gap-1.5 text-xs italic text-[var(--color-ink-soft)]">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <div>{ruleNote}</div>
            </div>
          </Dialog.Description>
          <div className="mt-4 flex flex-col gap-3">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
