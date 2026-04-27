import * as React from 'react';
import { Search } from 'lucide-react';
import { ParchmentDialog } from '@/components/dialogs/ParchmentDialog';
import { Portrait } from '@/components/portraits/Portrait';
import { useCampaignStore } from '@/stores/campaign-store';
import { listCharacters } from '@/persistence/character-repo';
import type { Campaign } from '@/domain/campaign';
import type { Character } from '@/domain/character';

interface CharacterDuplicatorProps {
  open: boolean;
  onClose: () => void;
  onPick: (character: Character, campaign: Campaign) => void;
}

interface Row {
  campaign: Campaign;
  character: Character;
}

/**
 * Modal that lists every character across every campaign so the user can
 * pick one to pre-fill a FullCharacter NPC template.
 */
export function CharacterDuplicator({
  open,
  onClose,
  onPick,
}: CharacterDuplicatorProps): React.JSX.Element {
  const campaigns = useCampaignStore((s) => s.list);
  const refreshList = useCampaignStore((s) => s.refreshList);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');

  // Refresh campaign list once on open.
  React.useEffect(() => {
    if (open) void refreshList();
  }, [open, refreshList]);

  // When the dialog opens (and once campaign list is loaded), fetch all characters.
  React.useEffect(() => {
    if (!open || campaigns.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all(
      campaigns.map(async (c) => {
        const result = await listCharacters(c.dir_name);
        return result.items.map((ch) => ({ campaign: c, character: ch }));
      }),
    ).then((all) => {
      if (cancelled) return;
      setRows(all.flat());
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, campaigns]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.character.name.toLowerCase().includes(q) ||
        r.campaign.name.toLowerCase().includes(q) ||
        r.character.class_id.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  return (
    <ParchmentDialog
      open={open}
      onClose={onClose}
      title="Duplicate from existing character"
      description="Pick a character from any campaign to pre-fill this NPC template. You can keep editing afterwards."
      widthClass="w-[min(92vw,42rem)]"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-faint)]"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by character name, campaign, or class…"
            className="h-8 w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] pl-7 pr-2 text-sm"
          />
        </div>

        {loading ? (
          <p className="text-sm italic text-[var(--color-ink-faint)]">
            Loading characters from all campaigns…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm italic text-[var(--color-ink-faint)]">
            {rows.length === 0
              ? 'No characters in any campaign yet.'
              : 'No matches.'}
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto divide-y divide-[var(--color-parchment-300)] rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40">
            {filtered.map(({ campaign, character }) => (
              <li key={`${campaign.id}:${character.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(character, campaign);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-parchment-200)]/60"
                >
                  <Portrait
                    vaultPath={character.portrait_path}
                    fallback={{ kind: 'class', classId: character.class_id }}
                    name={character.name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--color-ink)]">
                      {character.name}
                    </div>
                    <div className="text-[10px] text-[var(--color-ink-faint)]">
                      {character.class_id} · in {campaign.name}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ParchmentDialog>
  );
}
