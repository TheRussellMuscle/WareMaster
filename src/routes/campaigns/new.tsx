import * as React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { RequireVault } from '@/components/shell/RequireVault';
import { useCampaignStore } from '@/stores/campaign-store';

export const Route = createFileRoute('/campaigns/new')({
  component: NewCampaign,
});

function NewCampaign(): React.JSX.Element {
  return (
    <RequireVault>
      <NewCampaignInner />
    </RequireVault>
  );
}

function NewCampaignInner(): React.JSX.Element {
  const navigate = useNavigate();
  const create = useCampaignStore((s) => s.create);
  const setCurrent = useCampaignStore((s) => s.setCurrent);

  const [name, setName] = React.useState('');
  const [wm, setWm] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const campaign = await create({
        name: name.trim(),
        wm: wm.trim(),
        description: description.trim(),
        setting_region: region.trim() ? region.trim() : null,
      });
      setCurrent(campaign);
      void navigate({
        to: '/campaigns/$cid',
        params: { cid: campaign.dir_name },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <IlluminatedHeading level={1}>New campaign</IlluminatedHeading>

      <ParchmentCard>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field label="Name" required>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Blackmarsh Affair"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="Wares Maker">
            <input
              type="text"
              value={wm}
              onChange={(e) => setWm(e.target.value)}
              placeholder="Your name"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="Setting region">
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Teela-tein, Rumbqt foothills, …"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A one-line summary visible in the campaign list."
              className={INPUT_CLASS}
            />
          </Field>

          {error && (
            <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-2 text-sm text-[var(--color-rust)]">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || name.trim().length === 0}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create campaign'}
            </button>
            <button
              type="button"
              onClick={() => void navigate({ to: '/campaigns' })}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-4 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
            >
              Cancel
            </button>
          </div>
        </form>
      </ParchmentCard>
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 font-body text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gilt)]/40';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
        {required && <span className="ml-1 text-[var(--color-rust)]">*</span>}
      </span>
      {children}
    </label>
  );
}
