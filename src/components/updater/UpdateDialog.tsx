import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { UpdaterState } from '@/hooks/useUpdater';
import { ChangelogMarkdown } from './ChangelogMarkdown';

interface UpdateDialogProps {
  state: UpdaterState;
}

export function UpdateDialog({ state }: UpdateDialogProps): React.JSX.Element | null {
  const { status, update, progress, error, install, dismiss } = state;

  const isOpen =
    status === 'available' ||
    status === 'downloading' ||
    status === 'installing' ||
    (status === 'error' && update !== null);

  if (!update) return null;

  const pct =
    progress.total && progress.total > 0
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : null;

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && status === 'available') dismiss();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-[var(--color-ink)]/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(32rem,90vw)] -translate-x-1/2 -translate-y-1/2',
            'rounded-sm border-2 border-double border-[var(--color-parchment-400)]',
            'bg-[var(--color-parchment-50)] p-6 shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        >
          <div className="flex items-start gap-3">
            <Sparkles
              className="mt-1 h-5 w-5 shrink-0 text-[var(--color-gilt)]"
              aria-hidden
            />
            <div className="flex-1">
              <DialogPrimitive.Title className="font-display text-xl text-[var(--color-ink)]">
                A new edition has arrived
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-[var(--color-ink-soft)]">
                Version {update.version} is available
                {update.currentVersion ? ` (you have ${update.currentVersion})` : null}.
              </DialogPrimitive.Description>
            </div>
          </div>

          {update.body ? (
            <div
              className={cn(
                'mt-4 max-h-64 overflow-y-auto rounded-sm border border-[var(--color-parchment-300)]',
                'bg-[var(--color-parchment-100)]/40 p-3 text-xs text-[var(--color-ink-soft)]',
                'font-body',
              )}
            >
              <ChangelogMarkdown source={update.body} />
            </div>
          ) : null}

          {(status === 'downloading' || status === 'installing') && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
                <span className="flex items-center gap-1.5">
                  <Download className="h-3 w-3" aria-hidden />
                  {status === 'installing' ? 'Installing…' : 'Downloading…'}
                </span>
                {pct !== null ? <span>{pct}%</span> : null}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-[var(--color-parchment-200)]">
                <div
                  className="h-full bg-[var(--color-verdigris)] transition-all"
                  style={{ width: pct !== null ? `${pct}%` : '30%' }}
                />
              </div>
            </div>
          )}

          {status === 'error' && error ? (
            <div className="mt-4 rounded-sm border border-[var(--color-rust)] bg-[var(--color-rust)]/10 p-3 text-xs text-[var(--color-rust)]">
              Update failed: {error}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={dismiss}
              disabled={status === 'downloading' || status === 'installing'}
              className={cn(
                'rounded-sm border border-[var(--color-parchment-400)] bg-transparent px-4 py-1.5 text-sm',
                'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'transition-colors',
              )}
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => {
                void install();
              }}
              disabled={status === 'downloading' || status === 'installing'}
              className={cn(
                'rounded-sm border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-1.5 text-sm',
                'text-[var(--color-parchment-50)] hover:bg-[var(--color-ink-soft)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'transition-colors',
              )}
            >
              {status === 'error' ? 'Retry' : 'Install Now'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
