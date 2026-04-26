import * as React from 'react';
import { Dices } from 'lucide-react';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { useSheetActions } from './SheetActionsContext';
import type { Character } from '@/domain/character';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';

interface ActionPanelProps {
  character: Character;
  derived: DerivedCombatValues;
  onChange: (next: Character) => Promise<void>;
}

/**
 * "This Segment" panel — current Segment IN/DN/Absorption-modifier values
 * + the `Set IN/DN` and `End Segment` buttons. Renders as a plain section
 * (no ParchmentCard wrapper) so the character sheet can place it inline
 * under Derived stats where these values live conceptually.
 *
 * The other four sheet roll dialogs (Ability / Attack / Save / Skill) are
 * reached from contextual buttons distributed throughout the sheet, not
 * from this panel.
 */
export function ActionPanel({
  character,
  derived,
  onChange,
}: ActionPanelProps): React.JSX.Element {
  const actions = useSheetActions();
  const segment = character.state.current_segment;

  const endSegment = async () => {
    await onChange({
      ...character,
      state: { ...character.state, current_segment: null },
    });
  };

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
          This Segment
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => actions.openInDn()}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/10 px-3 py-1 text-xs hover:bg-[var(--color-gilt)]/25"
          >
            <Dices className="h-3.5 w-3.5" aria-hidden /> Set IN/DN
          </button>
          {segment && (
            <button
              type="button"
              onClick={() => void endSegment()}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
            >
              End Segment
            </button>
          )}
        </div>
      </header>
      <SegmentStatusRow
        segment={segment}
        totalAbsorption={derived.totalAbsorption}
      />
    </section>
  );
}

function SegmentStatusRow({
  segment,
  totalAbsorption,
}: {
  segment: Character['state']['current_segment'];
  totalAbsorption: number;
}): React.JSX.Element {
  if (!segment) {
    return (
      <div className="text-sm italic text-[var(--color-ink-faint)]">
        No active Segment. Roll <strong>Set IN/DN</strong> to begin one.
      </div>
    );
  }
  const absorptionThis =
    segment.absorption_modifier === 2
      ? totalAbsorption * 2
      : segment.absorption_modifier === 0.5
        ? Math.floor(totalAbsorption / 2)
        : totalAbsorption;
  const modLabel =
    segment.absorption_modifier === 2
      ? '×2'
      : segment.absorption_modifier === 0.5
        ? '÷2'
        : '×1';
  return (
    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
      <Stat
        label={
          <>
            <AcronymTooltip code="IN" /> this segment
          </>
        }
        value={String(segment.in)}
      />
      <Stat
        label={
          <>
            <AcronymTooltip code="DN" /> this segment
          </>
        }
        value={String(segment.dn)}
      />
      <Stat
        label="Absorption"
        value={`${absorptionThis} (${modLabel})`}
        tone={
          segment.absorption_modifier === 2
            ? 'gilt'
            : segment.absorption_modifier === 0.5
              ? 'rust'
              : undefined
        }
      />
      <Stat
        label="IN halved next?"
        value={segment.in_halved_next_segment ? 'yes' : 'no'}
        tone={segment.in_halved_next_segment ? 'rust' : undefined}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  tone?: 'gilt' | 'rust';
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div
        className={
          tone === 'gilt'
            ? 'font-mono text-[var(--color-gilt)]'
            : tone === 'rust'
              ? 'font-mono text-[var(--color-rust)]'
              : 'font-mono text-[var(--color-ink)]'
        }
      >
        {value}
      </div>
    </div>
  );
}
