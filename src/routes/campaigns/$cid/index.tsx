import * as React from 'react';
import {
  createFileRoute,
  Link,
  useParams,
  useNavigate,
} from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
  SealedDivider,
} from '@/components/parchment/ParchmentCard';
import { Portrait } from '@/components/portraits/Portrait';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RequireVault } from '@/components/shell/RequireVault';
import { VaultParseErrors } from '@/components/shell/VaultParseErrors';
import { useCampaignStore } from '@/stores/campaign-store';
import {
  deleteCharacter,
  listCharacters,
} from '@/persistence/character-repo';
import { removeCharacterPortrait } from '@/persistence/portrait-repo';
import type { Character } from '@/domain/character';

export const Route = createFileRoute('/campaigns/$cid/')({
  component: CampaignDetail,
});

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

  const [characters, setCharacters] = React.useState<Character[]>([]);
  const [characterFailures, setCharacterFailures] = React.useState<
    Array<{ path: string; message: string }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [pendingDelete, setPendingDelete] = React.useState<Character | null>(
    null,
  );

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

  if (!current) {
    return (
      <ParchmentCard className="mx-auto max-w-2xl">
        Loading campaign…
      </ParchmentCard>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
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

      <SealedDivider />

      <section>
        <header className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-xl text-[var(--color-ink)]">
            Characters
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

        {loading ? (
          <ParchmentCard>Loading characters…</ParchmentCard>
        ) : characters.length === 0 ? (
          <ParchmentCard>
            <p className="text-[var(--color-ink-soft)]">
              No characters yet. Create one to start tracking abilities,
              skills, and gear.
            </p>
          </ParchmentCard>
        ) : (
          <ul className="flex flex-col gap-2">
            {characters.map((c) => (
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
