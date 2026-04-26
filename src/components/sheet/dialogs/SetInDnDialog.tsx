import * as React from 'react';
import { rollInDn } from '@/engine/combat/in-dn';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { RollResultBadge } from '@/components/dice/RollResultBadge';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import type { Character } from '@/domain/character';
import type { ActionLogEntry } from '@/domain/action-log';
import { RollDialogShell } from './RollDialogShell';
import { RollControls } from './RollControls';
import { DialogActions } from './DialogActions';

type SegmentState = NonNullable<Character['state']['current_segment']>;

interface SetInDnDialogProps {
  open: boolean;
  onClose: () => void;
  derived: DerivedCombatValues;
  currentInHalved: boolean;
  availableLuc: number;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    current: SegmentState,
    lucSpent: number,
  ) => Promise<void>;
}

/** "Set IN/DN" — Rule §08 IN/DN Roll. */
export function SetInDnDialog({
  open,
  onClose,
  derived,
  currentInHalved,
  availableLuc,
  onResolve,
}: SetInDnDialogProps): React.JSX.Element {
  const [lucDice, setLucDice] = React.useState(0);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualValues, setManualValues] = React.useState<number[]>([1]);
  const [result, setResult] = React.useState<ReturnType<typeof rollInDn> | null>(null);

  React.useEffect(() => {
    if (!open) {
      setLucDice(0);
      setManualMode(false);
      setManualValues([1]);
      setResult(null);
    }
  }, [open]);

  const diceCount = 1 + lucDice;

  const onRoll = () => {
    const r = rollInDn({
      baseIN: derived.baseIN,
      baseDN: derived.baseDN,
      lucDice,
      manual: manualMode ? manualValues.slice(0, diceCount) : undefined,
    });
    setResult(r);
  };

  const onAdd = async () => {
    if (!result) return;
    const inValue = currentInHalved
      ? Math.floor(result.inValue / 2)
      : result.inValue;
    const notes: string[] = [];
    if (currentInHalved)
      notes.push(
        'IN halved this Segment (carry-over from prior Total Failure on BN).',
      );
    if (result.absorptionModifier === 2)
      notes.push('Total Absorption ×2 this Segment (Perfect Success).');
    if (result.absorptionModifier === 0.5)
      notes.push(
        'Total Absorption halved (rounded down) this Segment (Total Failure).',
      );
    if (lucDice > 0) notes.push(`Spent ${lucDice} LUC.`);

    await onResolve(
      {
        kind: 'in-dn',
        label: `IN/DN — Base IN ${derived.baseIN}, Base DN ${derived.baseDN}`,
        dice: result.roll.diceRolled,
        modifier: derived.baseIN,
        total: inValue,
        difficulty: null,
        outcome: result.roll.outcome,
        is_critical: false,
        notes: notes.join(' '),
      },
      {
        in: inValue,
        dn: result.dnValue,
        absorption_modifier: result.absorptionModifier,
        in_halved_next_segment: false,
        set_at_real: new Date().toISOString(),
      },
      lucDice,
    );
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Roll IN/DN"
      ruleNote={
        <>
          1D10 + Base IN, same dice + Base DN. <strong>Perfect Success</strong>{' '}
          (all 10s) doubles Total Absorption this Segment;{' '}
          <strong>Total Failure</strong> (all 1s) halves it (rounding down). LUC
          dice add to the same pool. (Rule §08.)
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Base IN" value={String(derived.baseIN)} />
        <Stat label="Base DN" value={String(derived.baseDN)} />
      </div>
      {currentInHalved && (
        <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 p-2 text-xs text-[var(--color-rust)]">
          IN will be halved this Segment due to last Segment's Total Failure on
          a BN Roll (Rule §08).
        </div>
      )}
      <RollControls
        lucDice={lucDice}
        onLucDiceChange={setLucDice}
        availableLuc={availableLuc}
        manualMode={manualMode}
        onManualModeChange={setManualMode}
        manualValues={manualValues}
        onManualValuesChange={setManualValues}
        diceCount={diceCount}
        faces={10}
      />
      {result && (
        <div className="flex flex-col gap-1 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3 text-sm">
          <RollResultBadge
            diceRolled={result.roll.diceRolled}
            total={
              currentInHalved
                ? Math.floor(result.inValue / 2)
                : result.inValue
            }
            outcome={result.roll.outcome}
          />
          <div className="text-xs text-[var(--color-ink-soft)]">
            <AcronymTooltip code="IN" /> ={' '}
            {currentInHalved
              ? `floor(${result.inValue} / 2) = ${Math.floor(result.inValue / 2)}`
              : result.inValue}{' '}
            · <AcronymTooltip code="DN" /> = {result.dnValue} · Absorption{' '}
            {result.absorptionModifier === 2
              ? '×2'
              : result.absorptionModifier === 0.5
                ? '÷2'
                : '×1'}
          </div>
        </div>
      )}
      <DialogActions
        hasResult={result != null}
        onRoll={onRoll}
        onAdd={() => void onAdd()}
        onDiscard={() => setResult(null)}
      />
    </RollDialogShell>
  );
}

function Stat({
  label,
  value,
}: {
  label: React.ReactNode;
  value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="font-mono text-[var(--color-ink)]">{value}</div>
    </div>
  );
}
