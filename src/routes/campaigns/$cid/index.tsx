import * as React from 'react';
import {
  createFileRoute,
  Link,
  useParams,
  useNavigate,
} from '@tanstack/react-router';
import { Plus, Trash2, Search, X } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { Portrait } from '@/components/portraits/Portrait';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RequireVault } from '@/components/shell/RequireVault';
import { VaultParseErrors } from '@/components/shell/VaultParseErrors';
import { useCampaignStore } from '@/stores/campaign-store';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  deleteCharacter,
  listCharacters,
} from '@/persistence/character-repo';
import { removeCharacterPortrait } from '@/persistence/portrait-repo';
import { deriveCombatValues } from '@/engine/derive/combat-values';
import { effectiveStatus } from '@/engine/derive/status';
import type { Character, CharacterStatus } from '@/domain/character';
import type { ClassId } from '@/domain/class';

export const Route = createFileRoute('/campaigns/$cid/')({
  component: CampaignDetail,
});

type SortKey = 'name' | 'class' | 'recently-edited' | 'recently-created';

const STATUS_LABEL: Record<CharacterStatus, string> = {
  fine: 'Fine',
  'heavy-physical': 'Heavy Physical',
  'heavy-mental': 'Heavy Mental',
  'incap-physical': 'Incap (Physical)',
  'incap-mental': 'Incap (Mental)',
  dead: 'Dead',
  insane: 'Insane',
};

const CLASS_LABEL: Record<ClassId, string> = {
  warrior: 'Warrior',
  'word-caster': 'Word-Caster',
  spiritualist: 'Spiritualist',
  tradesfolk: 'Tradesfolk',
};

const ALL_CLASSES: ClassId[] = ['warrior', 'word-caster', 'spiritualist', 'tradesfolk'];

const STATUS_GROUPS: Array<{ id: string; label: string; statuses: CharacterStatus[] }> = [
  { id: 'fine', label: 'Fine', statuses: ['fine'] },
  {
    id: 'heavy',
    label: 'Heavy',
    statuses: ['heavy-physical', 'heavy-mental'],
  },
  {
    id: 'incap',
    label: 'Incap',
    statuses: ['incap-physical', 'incap-mental'],
  },
  { id: 'dead', label: 'Dead / Insane', statuses: ['dead', 'insane'] },
];

function CampaignDetail(): React.JSX.Element {
  return (
    <RequireVault>
      <CampaignDetailInner />
    </RequireVault>
  );
}

function CampaignDetailInner(): React.JSX.Element {
  const { cid } = useParams({ from: '/campaigns/$cid/' });
  const navigate = useNavigate();
  const current = useCampaignStore((s) => s.current);
  const loadByDir = useCampaignStore((s) => s.loadByDir);
  const setCurrent = useCampaignStore((s) => s.setCurrent);
  const { catalog } = useReferenceData();

  const [characters, setCharacters] = React.useState<Character[]>([]);
  const [characterFailures, setCharacterFailures] = React.useState<
    Array<{ path: string; message: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [pendingDelete, setPendingDelete] = React.useState<Character | null>(null);

  const [search, setSearch] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('name');
  const [classFilter, setClassFilter] = React.useState<Set<ClassId>>(new Set());
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const c = await loadByDir(cid);
      if (cancelled) return;
      if (!c) {
        void navigate({ to: '/campaigns' });
        return;
      }
      const result = await listCharacters(cid);
      if (!cancelled) {
        setCharacters(result.items);
        setCharacterFailures(result.failures);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setCurrent(null);
    };
  }, [cid, loadByDir, navigate, setCurrent]);

  const decorated = React.useMemo(() => {
    return characters.map((c) => {
      const derived = deriveCombatValues(c, catalog);
      const status = effectiveStatus(c, derived);
      return { character: c, status };
    });
  }, [characters, catalog]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return decorated
      .filter(({ character: c, status }) => {
        if (q) {
          const hay = (c.name + ' ' + classLabel(c)).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (classFilter.size > 0 && !classFilter.has(c.class_id)) return false;
        if (statusFilter.size > 0) {
          const matches = STATUS_GROUPS.some(
            (g) => statusFilter.has(g.id) && g.statuses.includes(status),
          );
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => sortCompare(a.character, b.character, sortKey));
  }, [decorated, search, classFilter, statusFilter, sortKey]);

  if (!current) {
    return (
      <ParchmentCard className="mx-auto max-w-2xl">
        Loading campaign…
      </ParchmentCard>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <header>
        <IlluminatedHeading level={1}>{current.name}</IlluminatedHeading>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-[var(--color-ink-soft)]">
          {current.wm && <span>WM: {current.wm}</span>}
          {current.setting_region && <span>Region: {current.setting_region}</span>}
          <span className="font-mono text-xs text-[var(--color-ink-faint)]">
            {current.id}
          </span>
        </div>
        {current.description && (
          <p className="mt-2 text-sm italic text-[var(--color-ink-soft)]">
            {current.description}
          </p>
        )}
      </header>

      <section>
        <header className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-xl text-[var(--color-ink)]">
            Characters
            <span className="ml-2 font-body text-sm text-[var(--color-ink-faint)]">
              ({filtered.length}
              {filtered.length !== characters.length && ` of ${characters.length}`})
            </span>
          </h2>
          <Link
            to="/campaigns/$cid/characters/new"
            params={{ cid }}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
          >
            <Plus className="h-4 w-4" aria-hidden /> New character
          </Link>
        </header>

        <VaultParseErrors failures={characterFailures} scope="character" />

        {/* Filter / search bar */}
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[12rem]">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-faint)]"
                aria-hidden
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or class…"
                className="h-8 w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] pl-7 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gilt)]/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              )}
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
            >
              <option value="name">Sort: Name (A→Z)</option>
              <option value="class">Sort: Class</option>
              <option value="recently-edited">Sort: Recently edited</option>
              <option value="recently-created">Sort: Recently created</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Class:
            </span>
            {ALL_CLASSES.map((c) => (
              <Chip
                key={c}
                active={classFilter.has(c)}
                onClick={() =>
                  setClassFilter((cur) => toggleSet(cur, c))
                }
              >
                {CLASS_LABEL[c]}
              </Chip>
            ))}
            <span className="ml-2 self-center text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Status:
            </span>
            {STATUS_GROUPS.map((g) => (
              <Chip
                key={g.id}
                active={statusFilter.has(g.id)}
                tone={
                  g.id === 'heavy' || g.id === 'incap' || g.id === 'dead'
                    ? 'rust'
                    : undefined
                }
                onClick={() =>
                  setStatusFilter((cur) => toggleSet(cur, g.id))
                }
              >
                {g.label}
              </Chip>
            ))}
            {(classFilter.size > 0 || statusFilter.size > 0) && (
              <button
                type="button"
                onClick={() => {
                  setClassFilter(new Set());
                  setStatusFilter(new Set());
                }}
                className="ml-2 self-center text-[10px] underline text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <ParchmentCard>Loading characters…</ParchmentCard>
        ) : characters.length === 0 ? (
          <ParchmentCard>
            <p className="text-[var(--color-ink-soft)]">
              No characters yet. Create one to start tracking abilities,
              skills, and gear.
            </p>
          </ParchmentCard>
        ) : filtered.length === 0 ? (
          <ParchmentCard>
            <p className="text-[var(--color-ink-soft)]">
              No characters match the current filters.
            </p>
          </ParchmentCard>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map(({ character: c, status }) => (
              <li key={c.id} className="group relative">
                <Link
                  to="/campaigns/$cid/characters/$pcid"
                  params={{ cid, pcid: c.id }}
                  className="block transition-colors hover:bg-[var(--color-parchment-200)]/40"
                >
                  <ParchmentCard className="flex items-center gap-3 p-3">
                    <Portrait
                      vaultPath={c.portrait_path}
                      classId={c.class_id}
                      name={c.name}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="font-display text-base text-[var(--color-ink)]">
                        {c.name}
                      </div>
                      <div className="text-xs text-[var(--color-ink-faint)]">
                        {classLabel(c)}
                      </div>
                    </div>
                    {status !== 'fine' && <StatusBadge status={status} />}
                  </ParchmentCard>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingDelete(c);
                  }}
                  title={`Delete ${c.name}`}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-[var(--color-ink-faint)] opacity-0 transition-opacity hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)] group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={
          pendingDelete ? `Delete ${pendingDelete.name}?` : 'Delete character?'
        }
        description="Removes the character's YAML, biography, and portrait from the vault. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!pendingDelete) return;
          if (pendingDelete.portrait_path) {
            try {
              await removeCharacterPortrait(pendingDelete.portrait_path);
            } catch {
              /* non-fatal */
            }
          }
          await deleteCharacter(cid, pendingDelete.id);
          setCharacters((cs) => cs.filter((x) => x.id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function Chip({
  children,
  active,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  tone?: 'rust';
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2 py-0.5 text-xs transition-colors ${
        active
          ? tone === 'rust'
            ? 'border-[var(--color-rust)] bg-[var(--color-rust)]/15 text-[var(--color-rust)]'
            : 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/15 text-[var(--color-ink)]'
          : 'border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] text-[var(--color-ink-soft)] hover:bg-[var(--color-parchment-200)]/60'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: CharacterStatus }): React.JSX.Element {
  const isCritical =
    status === 'incap-physical' ||
    status === 'incap-mental' ||
    status === 'dead' ||
    status === 'insane';
  const isDead = status === 'dead' || status === 'insane';
  return (
    <span
      className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
        isDead
          ? 'border-[var(--color-rust)] bg-[var(--color-rust)]/10 text-[var(--color-rust)] line-through'
          : isCritical
            ? 'border-[var(--color-rust)] bg-[var(--color-rust)]/15 font-medium text-[var(--color-rust)]'
            : 'border-[var(--color-rust)]/60 bg-[var(--color-rust)]/5 text-[var(--color-rust)]'
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function sortCompare(a: Character, b: Character, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'class':
      return (
        a.class_id.localeCompare(b.class_id) || a.name.localeCompare(b.name)
      );
    case 'recently-edited':
      return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
    case 'recently-created':
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  }
}

function classLabel(c: Character): string {
  if (c.class_id === 'word-caster' && c.word_caster_gate) {
    return `Word-Caster · Gate of ${capitalize(c.word_caster_gate)}`;
  }
  if (c.class_id === 'spiritualist' && c.spiritualist_order) {
    return prettify(c.spiritualist_order);
  }
  if (c.class_id === 'tradesfolk' && c.tradesfolk_profession) {
    return `Tradesfolk · ${capitalize(c.tradesfolk_profession)}`;
  }
  return capitalize(c.class_id.replace('-', ' '));
}

function capitalize(s: string): string {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

function prettify(s: string): string {
  return s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}
