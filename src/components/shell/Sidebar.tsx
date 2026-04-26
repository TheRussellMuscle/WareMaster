import { Link } from '@tanstack/react-router';
import {
  BookOpen,
  Coffee,
  Home,
  Library,
  Scroll,
  Settings,
  Swords,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/campaigns', label: 'Campaigns', icon: Scroll },
  { to: '/templates/monsters', label: 'Templates', icon: Library },
  { to: '/reference', label: 'Reference', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar(): React.JSX.Element {
  return (
    <aside
      className={cn(
        'flex h-full w-60 shrink-0 flex-col gap-1 px-3 py-4',
        'border-r border-[var(--color-parchment-400)]',
        'bg-[var(--color-parchment-100)]/60',
      )}
    >
      <div className="px-2 pb-3">
        <div className="flex items-center gap-2 font-display text-xl text-[var(--color-ink)]">
          <Swords className="h-5 w-5 text-[var(--color-rust)]" aria-hidden />
          WareMaster
        </div>
        <div className="mt-1 text-xs text-[var(--color-ink-faint)]">
          Wares Blade companion
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1.5 px-2 text-[10px] text-[var(--color-ink-faint)]">
        <a
          href="https://ko-fi.com/brendanrussell"
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'flex items-center gap-1.5 rounded-sm px-1 py-0.5',
            'text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]',
            'transition-colors',
          )}
        >
          <Coffee className="h-3 w-3" aria-hidden />
          Support on Ko-fi
        </a>
        <div className="px-1">v0.3.0-alpha.1 · phase 3</div>
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }): React.JSX.Element {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        'group flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm',
        'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]',
        'transition-colors',
      )}
      activeProps={{
        className:
          'bg-[var(--color-parchment-200)] text-[var(--color-ink)] font-medium',
      }}
    >
      <Icon className="h-4 w-4 opacity-80 group-hover:opacity-100" aria-hidden />
      {item.label}
    </Link>
  );
}
