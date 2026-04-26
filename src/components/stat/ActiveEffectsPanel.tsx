import * as React from 'react';
import { Plus, X } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import type { Character } from '@/domain/character';

interface ActiveEffect {
  id: string;
  label: string;
  source?: string;
  expires_at_segment: number | null;
}

interface ActiveEffectsPanelProps {
  character: Character;
  onChange: (effects: ActiveEffect[]) => Promise<void> | void;
}

/**
 * Manual WM-managed list of temporary effects on the character.
 *
 * Phase 3 ships a working add/remove form so WMs can jot down "Blessed for
 * 1 etch" or "Poisoned" without leaving the sheet. Phase 6 will swap the
 * manual entry for an engine-driven sweep that auto-expires on time
 * advance and emits events. The schema (CharacterState.active_effects[])
 * is stable, so the data persists across that change.
 */
export function ActiveEffectsPanel({
  character,
  onChange,
}: ActiveEffectsPanelProps): React.JSX.Element | null {
  const [showForm, setShowForm] = React.useState(false);
  const effects = character.state.active_effects;

  const remove = (id: string) => {
    void onChange(effects.filter((e) => e.id !== id));
  };

  const add = (eff: Omit<ActiveEffect, 'id'>) => {
    const next: ActiveEffect = {
      id: `eff_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      label: eff.label,
      source: eff.source || undefined,
      expires_at_segment: eff.expires_at_segment,
    };
    void onChange([...effects, next]);
    setShowForm(false);
  };

  // Hide entirely when there's nothing to show and the user hasn't reached for it.
  if (effects.length === 0 && !showForm) {
    return (
      <ParchmentCard className="flex items-baseline justify-between">
        <div>
          <IlluminatedHeading level={2}>Active effects</IlluminatedHeading>
          <p className="text-xs italic text-[var(--color-ink-faint)]">
            None. Add a temporary effect (blessing, curse, status) and the WM
            can clear it manually. Auto-expiry comes in Phase 6.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2.5 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
        >
          <Plus className="h-3 w-3" aria-hidden /> Add effect
        </button>
      </ParchmentCard>
    );
  }

  return (
    <ParchmentCard className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <IlluminatedHeading level={2}>Active effects</IlluminatedHeading>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2.5 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
        >
          <Plus className="h-3 w-3" aria-hidden /> Add effect
        </button>
      </header>

      {effects.length > 0 && (
        <ul className="space-y-1 text-sm">
          {effects.map((e) => (
            <li
              key={e.id}
              className="flex items-baseline justify-between rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5"
            >
              <div>
                <span className="font-medium">{e.label}</span>
                {e.source && (
                  <span className="ml-2 text-xs italic text-[var(--color-ink-soft)]">
                    from {e.source}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-soft)]">
                {e.expires_at_segment != null ? (
                  <span>
                    expires{' '}
                    <UnitTooltip
                      unit="segment"
                      amount={e.expires_at_segment}
                    />
                  </span>
                ) : (
                  <span className="italic">no expiry</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  title="Remove effect"
                  className="rounded-sm p-0.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <AddEffectForm onAdd={add} onCancel={() => setShowForm(false)} />
      )}

      {effects.length > 0 && (
        <p className="text-[10px] italic text-[var(--color-ink-faint)]">
          WM-managed in Phase 3 — auto-expiry on time advance comes in Phase 6.
        </p>
      )}
    </ParchmentCard>
  );
}

function AddEffectForm({
  onAdd,
  onCancel,
}: {
  onAdd: (eff: Omit<ActiveEffect, 'id'>) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [label, setLabel] = React.useState('');
  const [source, setSource] = React.useState('');
  const [expires, setExpires] = React.useState<string>('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const expSeg = expires.trim() === '' ? null : parseInt(expires, 10);
    onAdd({
      label: label.trim(),
      source: source.trim(),
      expires_at_segment: Number.isFinite(expSeg) ? expSeg : null,
    });
    setLabel('');
    setSource('');
    setExpires('');
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3 text-sm"
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="font-display uppercase tracking-wider text-[var(--color-ink-faint)]">
            Label *
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Blessed of Sael"
            required
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="font-display uppercase tracking-wider text-[var(--color-ink-faint)]">
            Source
          </span>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Binding Palm"
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="font-display uppercase tracking-wider text-[var(--color-ink-faint)]">
            Expires at segment
          </span>
          <input
            type="number"
            min={0}
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            placeholder="optional"
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1 text-xs font-medium hover:bg-[var(--color-gilt)]/25"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
