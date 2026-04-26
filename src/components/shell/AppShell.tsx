import { Outlet } from '@tanstack/react-router';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';

/**
 * Top-level layout: sidebar on the left, top bar with clock + command palette,
 * main outlet wrapped in a parchment surface.
 */
export function AppShell(): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function TopBar(): React.JSX.Element {
  return (
    <header
      className="flex h-12 items-center justify-between border-b border-[var(--color-parchment-400)] bg-[var(--color-parchment-100)]/40 px-4"
    >
      <div className="font-display text-sm tracking-wide text-[var(--color-ink-soft)]">
        No campaign open
      </div>
      <div className="flex items-center gap-3">
        <CommandPalette />
      </div>
    </header>
  );
}
