import * as React from 'react';
import { Command } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Stub command palette trigger. Wired to Ctrl/Cmd+K.
 * Full palette UI lands in a later phase; this is the entry point.
 */
export function CommandPalette(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open command palette"
      className={cn(
        'flex items-center gap-2 rounded-sm border px-2.5 py-1 text-xs',
        'border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)]/70',
        'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
      )}
    >
      <Command className="h-3.5 w-3.5" aria-hidden />
      <span>Command</span>
      <kbd className="ml-1 rounded border border-[var(--color-parchment-400)] bg-[var(--color-parchment-100)] px-1 font-mono text-[10px]">
        Ctrl K
      </kbd>
      {open && (
        <span className="sr-only">Command palette open (stub)</span>
      )}
    </button>
  );
}
