import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RollResultBadge } from '@/components/dice/RollResultBadge';
import type { ActionLogEntry } from '@/domain/action-log';

interface ActionLogProps {
  entries: ActionLogEntry[];
  /** Campaign dir — used to build per-row character links. */
  campaignDir: string;
  /** Currently-active character; their name in log entries renders subtly (no extra link). */
  currentCharacterId?: string;
  onClear: () => void | Promise<void>;
  /** When true, log is loading from disk for the first time. */
  loading?: boolean;
}

const KIND_LABEL: Record<ActionLogEntry['kind'], string> = {
  'in-dn': 'IN/DN',
  ability: 'Ability',
  attack: 'Attack',
  save: 'Save',
  skill: 'Skill',
};

/**
 * Campaign-wide action log surface. Reverse-chronological list of every roll
 * the WM has made via the sheet Action Panel for any character in this
 * campaign. Each entry surfaces who rolled it (linked to that character's
 * sheet when not the current one). Persists to
 * `campaigns/<dir>/action-log.yaml`.
 *
 * Designed to live inside a vertical scroll container; the header is
 * `position: sticky` so it stays visible while you scroll through entries.
 */
export function ActionLog({
  entries,
  campaignDir,
  currentCharacterId,
  onClear,
  loading,
}: ActionLogProps): React.JSX.Element {
  const [confirmClear, setConfirmClear] = React.useState(false);
  const reversed = React.useMemo(() => entries.slice().reverse(), [entries]);

  return (
    <ParchmentCard className="flex flex-col gap-3 p-4">
      <header className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between gap-2 border-b border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] px-4 py-3">
        <IlluminatedHeading level={3}>Campaign Log</IlluminatedHeading>
        <button
          type="button"
          disabled={entries.length === 0}
          onClick={() => setConfirmClear(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1 text-xs text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)] disabled:opacity-40"
        >
          <Trash2 className="h-3 w-3" aria-hidden /> Clear
        </button>
      </header>

      {loading && entries.length === 0 ? (
        <p className="text-sm italic text-[var(--color-ink-faint)]">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm italic text-[var(--color-ink-faint)]">
          No rolls yet. Use the buttons throughout the sheet — Attack, Cast,
          Save, Roll, IN/DN — to record results here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-parchment-300)]">
          {reversed.map((e) => (
            <LogRow
              key={e.id}
              entry={e}
              campaignDir={campaignDir}
              isCurrent={e.character_id === currentCharacterId}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear campaign log?"
        description={`Removes all ${entries.length} entries across every character. This cannot be undone.`}
        confirmLabel="Clear"
        destructive
        onConfirm={async () => {
          await onClear();
        }}
      />
    </ParchmentCard>
  );
}

function LogRow({
  entry,
  campaignDir,
  isCurrent,
}: {
  entry: ActionLogEntry;
  campaignDir: string;
  isCurrent: boolean;
}): React.JSX.Element {
  return (
    <li className="flex flex-wrap items-start gap-x-2 gap-y-1 py-2 text-sm">
      <span className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-100)]/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {KIND_LABEL[entry.kind]}
      </span>
      {entry.character_id ? (
        isCurrent ? (
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            {entry.character_name}
          </span>
        ) : (
          <Link
            to="/campaigns/$cid/characters/$pcid"
            params={{ cid: campaignDir, pcid: entry.character_id }}
            className="text-[10px] uppercase tracking-wider text-[var(--color-rust)] hover:underline"
          >
            {entry.character_name}
          </Link>
        )
      ) : (
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {entry.character_name || '—'}
        </span>
      )}
      <span className="font-display text-[var(--color-ink)]">{entry.label}</span>
      <RollResultBadge
        diceRolled={entry.dice}
        total={entry.total}
        outcome={entry.outcome}
        isCritical={entry.is_critical}
        difficulty={entry.difficulty}
      />
      <div className="ml-auto self-center text-[10px] italic text-[var(--color-ink-faint)]">
        {formatRelative(entry.timestamp_real)}
      </div>
      {entry.notes && (
        <div className="basis-full pl-1 text-xs italic text-[var(--color-ink-soft)]">
          {entry.notes}
        </div>
      )}
    </li>
  );
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = (Date.now() - t) / 1000;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}
