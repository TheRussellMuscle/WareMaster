import * as React from 'react';
import { Search, Scroll } from 'lucide-react';
import { ParchmentDialog } from '@/components/dialogs/ParchmentDialog';
import { useCampaignStore } from '@/stores/campaign-store';
import type { Campaign } from '@/domain/campaign';

interface CampaignPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (campaign: Campaign) => void;
  /** Title shown in the dialog header. Defaults to 'Pick a campaign'. */
  title?: string;
  description?: React.ReactNode;
}

/**
 * Modal listing all campaigns. Used when an action that requires a campaign
 * is triggered without one in context (e.g. "Spawn this template" from the
 * global templates page).
 */
export function CampaignPicker({
  open,
  onClose,
  onPick,
  title = 'Pick a campaign',
  description = 'Where should this go? Campaigns are sorted by most recently updated.',
}: CampaignPickerProps): React.JSX.Element {
  const campaigns = useCampaignStore((s) => s.list);
  const refreshList = useCampaignStore((s) => s.refreshList);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (open) void refreshList();
  }, [open, refreshList]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...campaigns].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.wm.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [campaigns, query]);

  return (
    <ParchmentDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      widthClass="w-[min(92vw,32rem)]"
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
            placeholder="Search campaigns…"
            className="h-8 w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] pl-7 pr-2 text-sm"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm italic text-[var(--color-ink-faint)]">
            {campaigns.length === 0
              ? 'No campaigns yet — create one from the Campaigns page first.'
              : 'No matches.'}
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto divide-y divide-[var(--color-parchment-300)] rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(c);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-[var(--color-parchment-200)]/60"
                >
                  <Scroll className="h-4 w-4 text-[var(--color-rust)]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--color-ink)]">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-[var(--color-ink-faint)]">
                      WM: {c.wm}
                      {c.setting_region ? ` · ${c.setting_region}` : ''}
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
