import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Parchment-styled confirm prompt for destructive or hard-to-reverse
 * operations (character delete, vault reset, etc.). Uses Radix Dialog for
 * focus management + ESC handling.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
}: ConfirmDialogProps): React.JSX.Element {
  const [busy, setBusy] = React.useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-ink)]/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] p-5 shadow-xl"
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <Dialog.Title className="font-display text-lg text-[var(--color-ink)]">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description asChild>
              <div className="mt-2 text-sm text-[var(--color-ink-soft)]">
                {description}
              </div>
            </Dialog.Description>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpenChange(false)}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConfirm()}
              className={
                destructive
                  ? 'rounded-sm border border-[var(--color-rust)]/60 bg-[var(--color-rust)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-rust)] hover:bg-[var(--color-rust)]/20 disabled:opacity-50'
                  : 'rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:opacity-50'
              }
            >
              {busy ? `${confirmLabel}…` : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
