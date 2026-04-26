import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import {
  BookOpen,
  ChevronRight,
  Coffee,
  Cog,
  Home,
  Library,
  PawPrint,
  Scroll,
  Search,
  Settings,
  Swords,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCampaignStore } from '@/stores/campaign-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import type { Campaign } from '@/domain/campaign';
import type { Character } from '@/domain/character';

/**
 * Top-level navigation. Project-explorer style hierarchy:
 *   Home
 *   Campaigns ▸
 *     {each campaign} ▸
 *       [search]
 *       Characters ▸
 *         {character names}
 *       NPCs / Monsters / Ryudes (Phase 4 placeholders)
 *   Templates / Reference / Settings
 *
 * Expansion state + per-campaign search persist in localStorage via
 * `useSidebarStore`; characters are loaded lazily per campaign on first
 * expand via `useCampaignStore.loadCharactersFor`.
 */
export function Sidebar(): React.JSX.Element {
  const refreshList = useCampaignStore((s) => s.refreshList);
  const list = useCampaignStore((s) => s.list);
  const campaignsExpanded = useSidebarStore((s) => s.expanded.campaigns);

  // Load campaign list once on mount so the tree has data to expand.
  React.useEffect(() => {
    if (list.length === 0) void refreshList();
  }, [list.length, refreshList]);

  return (
    <aside
      className={cn(
        'flex h-full w-72 shrink-0 flex-col gap-1 px-3 py-4',
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

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        <SidebarLink to="/" icon={Home} label="Home" exact />
        <ExpandableNode
          id="campaigns"
          icon={Scroll}
          label="Campaigns"
          to="/campaigns"
        >
          {campaignsExpanded &&
            list.map((c) => <CampaignNode key={c.id} campaign={c} />)}
          {campaignsExpanded && list.length === 0 && (
            <div className="pl-7 text-xs italic text-[var(--color-ink-faint)]">
              No campaigns yet.
            </div>
          )}
        </ExpandableNode>
        <SidebarLink
          to="/templates/monsters"
          icon={Library}
          label="Templates"
        />
        <SidebarLink to="/reference" icon={BookOpen} label="Reference" />
        <SidebarLink to="/settings" icon={Settings} label="Settings" />
      </nav>

      <div className="mt-auto flex flex-col gap-1.5 px-2 text-[10px] text-[var(--color-ink-faint)]">
        <button
          type="button"
          onClick={() => {
            void openUrl('https://ko-fi.com/brendanrussell');
          }}
          className={cn(
            'flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-left',
            'text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]',
            'transition-colors',
          )}
        >
          <Coffee className="h-3 w-3" aria-hidden />
          Support on Ko-fi
        </button>
        <div className="px-1">v0.4.0-alpha.1 · phase 5</div>
      </div>
    </aside>
  );
}

/* ---------------- Sidebar primitives ---------------- */

interface SidebarLinkProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  /** Indentation level (0 = root nav, 1+ = nested). */
  depth?: number;
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  exact,
  depth = 0,
}: SidebarLinkProps): React.JSX.Element {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm',
        'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]',
        'transition-colors',
      )}
      style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
      activeOptions={exact ? { exact: true } : undefined}
      activeProps={{
        className:
          'bg-[var(--color-parchment-200)] text-[var(--color-ink)] font-medium',
      }}
    >
      <Icon className="h-4 w-4 opacity-80 group-hover:opacity-100" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

interface ExpandableNodeProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Optional URL — clicking the label navigates here; chevron toggles expansion only. */
  to?: string;
  depth?: number;
  /** Right-aligned trailing content (count badge, "soon" tag). */
  trailing?: React.ReactNode;
  /** Children appear when this node is expanded. */
  children?: React.ReactNode;
}

function ExpandableNode({
  id,
  icon: Icon,
  label,
  to,
  depth = 0,
  trailing,
  children,
}: ExpandableNodeProps): React.JSX.Element {
  const expanded = useSidebarStore((s) => !!s.expanded[id]);
  const toggle = useSidebarStore((s) => s.toggle);
  const navigate = useNavigate();
  const onChevron = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(id);
  };
  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'group flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm',
          'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]',
          'transition-colors',
        )}
        style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
      >
        <button
          type="button"
          onClick={onChevron}
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          className="rounded-sm p-0.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 transition-transform',
              expanded && 'rotate-90',
            )}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={() => {
            if (to) void navigate({ to });
            else toggle(id);
          }}
          className="flex flex-1 items-center gap-2 truncate text-left"
        >
          <Icon className="h-4 w-4 opacity-80" aria-hidden />
          <span className="flex-1 truncate">{label}</span>
          {trailing}
        </button>
      </div>
      {expanded && children && <div>{children}</div>}
    </div>
  );
}

/* ---------------- Campaign sub-tree ---------------- */

function CampaignNode({ campaign }: { campaign: Campaign }): React.JSX.Element {
  const dir = campaign.dir_name;
  const id = `campaign:${dir}`;
  const expanded = useSidebarStore((s) => !!s.expanded[id]);
  return (
    <ExpandableNode
      id={id}
      icon={Scroll}
      label={campaign.name}
      to={`/campaigns/${dir}`}
      depth={1}
    >
      {expanded && <CampaignContents campaignId={dir} />}
    </ExpandableNode>
  );
}

function CampaignContents({
  campaignId,
}: {
  campaignId: string;
}): React.JSX.Element {
  const search = useSidebarStore((s) => s.getSearch(campaignId));
  const setSearch = useSidebarStore((s) => s.setSearch);
  return (
    <div className="flex flex-col">
      <div className="px-2 py-1" style={{ paddingLeft: `${0.5 + 2 * 0.85}rem` }}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-ink-faint)]"
            aria-hidden
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(campaignId, e.target.value)}
            placeholder="Search…"
            className="h-7 w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] pl-6 pr-6 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-gilt)]/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch(campaignId, '')}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
              aria-label="Clear search"
            >
              <X className="h-2.5 w-2.5" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <CharactersBranch campaignId={campaignId} search={search} />
      <SidebarLink
        to={`/campaigns/${campaignId}/npcs`}
        icon={UserPlus}
        label="NPCs · soon"
        depth={2}
      />
      <SidebarLink
        to={`/campaigns/${campaignId}/monsters`}
        icon={PawPrint}
        label="Monsters · soon"
        depth={2}
      />
      <SidebarLink
        to={`/campaigns/${campaignId}/ryude`}
        icon={Cog}
        label="Ryudes · soon"
        depth={2}
      />
    </div>
  );
}

function CharactersBranch({
  campaignId,
  search,
}: {
  campaignId: string;
  search: string;
}): React.JSX.Element {
  const id = `campaign:${campaignId}:characters`;
  const expanded = useSidebarStore((s) => !!s.expanded[id]);
  const characters = useCampaignStore(
    (s) => s.charactersByCampaign[campaignId],
  );
  const loadCharactersFor = useCampaignStore((s) => s.loadCharactersFor);

  React.useEffect(() => {
    // Lazy-load when the branch is first expanded (or campaign list mutates)
    if (expanded && !characters) {
      void loadCharactersFor(campaignId);
    }
  }, [expanded, characters, campaignId, loadCharactersFor]);

  const filtered = React.useMemo(() => {
    if (!characters) return [];
    const q = search.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter((c) => c.name.toLowerCase().includes(q));
  }, [characters, search]);

  const trailing =
    characters != null ? (
      <span className="text-[10px] text-[var(--color-ink-faint)]">
        {filtered.length}
        {filtered.length !== characters.length && ` / ${characters.length}`}
      </span>
    ) : null;

  return (
    <ExpandableNode
      id={id}
      icon={Users}
      label="Characters"
      depth={2}
      trailing={trailing}
    >
      {!characters && expanded && (
        <div
          className="text-xs italic text-[var(--color-ink-faint)]"
          style={{ paddingLeft: `${0.5 + 4 * 0.85}rem` }}
        >
          Loading…
        </div>
      )}
      {characters && filtered.length === 0 && (
        <div
          className="text-xs italic text-[var(--color-ink-faint)]"
          style={{ paddingLeft: `${0.5 + 4 * 0.85}rem` }}
        >
          {search ? 'No matches.' : 'No characters yet.'}
        </div>
      )}
      {filtered.map((c) => (
        <CharacterLink key={c.id} campaignId={campaignId} character={c} />
      ))}
    </ExpandableNode>
  );
}

function CharacterLink({
  campaignId,
  character,
}: {
  campaignId: string;
  character: Character;
}): React.JSX.Element {
  return (
    <Link
      to="/campaigns/$cid/characters/$pcid"
      params={{ cid: campaignId, pcid: character.id }}
      className={cn(
        'group flex items-center gap-2 rounded-sm px-2 py-1 text-xs',
        'text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]',
        'transition-colors',
      )}
      style={{ paddingLeft: `${0.5 + 4 * 0.85}rem` }}
      activeProps={{
        className:
          'bg-[var(--color-parchment-200)] text-[var(--color-ink)] font-medium',
      }}
    >
      <span className="truncate">{character.name}</span>
    </Link>
  );
}
