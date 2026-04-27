import * as React from 'react';
import { rollDice, classifyOutcome, type RollOutcome } from '@/engine/dice/roll';
import { ryudeAttunementContext, type OperatorStats } from '@/engine/derive/instance-rolls';
import { nextAttunementState } from '@/engine/derive/instance-bookkeeping';
import { RollResultBadge } from '@/components/dice/RollResultBadge';
import type { ActionLogEntry } from '@/domain/action-log';
import type { RyudeTemplate } from '@/domain/ryude';
import type { RyudeInstance, RyudeAttunementState } from '@/domain/ryude-instance';
import { RollDialogShell } from '@/components/sheet/dialogs/RollDialogShell';
import { DialogActions } from '@/components/sheet/dialogs/DialogActions';

type PenaltyKind =
  | 'drive-1'
  | 'spe-1'
  | 'pow-1'
  | 'spe-pow-1'
  | 'operator-con'
  | 'operator-wil'
  | null;

interface Props {
  open: boolean;
  onClose: () => void;
  template: RyudeTemplate;
  instance: RyudeInstance;
  operator: OperatorStats;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    suggestedNextState: RyudeAttunementState | null,
    penaltyDelta?: Partial<RyudeInstance['state']>,
  ) => Promise<void>;
}

interface AttunementResult {
  dice: number[];
  rawTotal: number;        // 1D10 result
  adjustedTotal: number;   // 1D10 - driveModifier
  passed: boolean;         // adjustedTotal ≤ attunementValue
  outcome: RollOutcome;    // for badge styling
}

/** Ryude Attunement Check — Rule §14:38-66.
 *  1D10 - DriveModifier ≤ AttunementValue. */
export function RyudeAttunementDialog({
  open,
  onClose,
  template,
  instance,
  operator,
  onResolve,
}: Props): React.JSX.Element {
  const [result, setResult] = React.useState<AttunementResult | null>(null);
  const [selectedPenalty, setSelectedPenalty] = React.useState<PenaltyKind>(null);

  React.useEffect(() => {
    if (!open) {
      setResult(null);
      setSelectedPenalty(null);
    }
  }, [open]);

  const ctx = ryudeAttunementContext(template, instance, operator);

  const onRoll = () => {
    const raw = rollDice(
      { dice: 1, faces: 10, baseAttribute: 0, modifier: 0 },
      undefined,
    );
    const adjustedTotal = raw.total - ctx.driveModifier;
    const passed = adjustedTotal <= ctx.attunementValue;
    // Use roll classifier on raw dice — all 1s and all 10s drive special transitions.
    const baseOutcome = classifyOutcome(raw.diceRolled, raw.total, 10, undefined);
    setResult({
      dice: raw.diceRolled,
      rawTotal: raw.total,
      adjustedTotal,
      passed,
      outcome: baseOutcome,
    });
    setSelectedPenalty(null);
  };

  const isTotalFailure = result
    ? result.outcome === 'total-failure'
    : false;

  const onAdd = async () => {
    if (!result) return;
    // Map roll-under check to ActionOutcome enum for the action log:
    // Total Failure (all 1s) → 'total-failure'
    // Perfect Success (all 10s) → 'perfect-success' if it still passed
    // Otherwise success / failure based on the comparison.
    let logOutcome: RollOutcome;
    if (result.outcome === 'total-failure') logOutcome = 'total-failure';
    else if (result.outcome === 'perfect-success' && result.passed)
      logOutcome = 'perfect-success';
    else logOutcome = result.passed ? 'success' : 'failure';

    const suggested = nextAttunementState(
      instance.state.attunement_state,
      logOutcome,
    );
    const willChange = suggested !== instance.state.attunement_state;

    const notes: string[] = [
      `1D10 ${result.rawTotal} ${ctx.driveModifier >= 0 ? `− ${ctx.driveModifier}` : `+ ${Math.abs(ctx.driveModifier)}`} = ${result.adjustedTotal} ≤ ${ctx.attunementValue}? ${result.passed ? 'pass' : 'fail'}.`,
    ];
    if (willChange) notes.push(`Suggested: ${instance.state.attunement_state} → ${suggested}.`);

    // Build penalty delta if WM selected one after total-failure
    let penaltyDelta: Partial<RyudeInstance['state']> | undefined;
    if (isTotalFailure && selectedPenalty && selectedPenalty !== 'operator-con' && selectedPenalty !== 'operator-wil') {
      const attrDmg = { ...instance.state.attribute_damage };
      let driveReduction = instance.state.drive_reduction ?? 0;
      switch (selectedPenalty) {
        case 'drive-1':
          driveReduction += 1;
          notes.push('Attunement penalty: Base Drive −1 recorded on instance.');
          break;
        case 'spe-1':
          attrDmg.spe += 1;
          notes.push('Attunement penalty: Ryude SPE −1.');
          break;
        case 'pow-1':
          attrDmg.pow += 1;
          notes.push('Attunement penalty: Ryude POW −1.');
          break;
        case 'spe-pow-1':
          attrDmg.spe += 1;
          attrDmg.pow += 1;
          notes.push('Attunement penalty: Ryude SPE −1, POW −1.');
          break;
      }
      penaltyDelta = { attribute_damage: attrDmg, drive_reduction: driveReduction };
    }
    if (isTotalFailure && (selectedPenalty === 'operator-con' || selectedPenalty === 'operator-wil')) {
      notes.push(`Attunement penalty: operator ${selectedPenalty === 'operator-con' ? 'CON' : 'WIL'} damage — apply manually on the character sheet.`);
    }

    await onResolve(
      {
        kind: 'save',
        label: `${instance.name} · Attunement Check`,
        dice: result.dice,
        modifier: -ctx.driveModifier,
        total: result.adjustedTotal,
        difficulty: ctx.attunementValue,
        outcome: logOutcome,
        is_critical: false,
        notes: notes.join(' '),
      },
      willChange ? suggested : null,
      penaltyDelta,
    );
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Attunement Check"
      ruleNote={
        <>
          1D10 − Drive Modifier ≤ Attunement Value (Rule §14:38-66). Roll-under
          check; Perfect Success transitions <code>attuning → attuned</code>;
          Total Failure transitions to <code>rejected</code>.
        </>
      }
    >
      <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3 text-sm text-[var(--color-ink-soft)]">
        <div className="flex justify-between">
          <span>Attunement Value</span>
          <span className="font-mono">{ctx.attunementValue}</span>
        </div>
        <div className="flex justify-between">
          <span>Drive Modifier ({operator.name})</span>
          <span className="font-mono">
            {ctx.driveModifier >= 0 ? '+' : ''}
            {ctx.driveModifier}
          </span>
        </div>
        {(instance.state.drive_reduction ?? 0) > 0 && (
          <div className="flex justify-between text-[var(--color-rust)]">
            <span>Drive Reduction (attunement penalties)</span>
            <span className="font-mono">−{instance.state.drive_reduction}</span>
          </div>
        )}
        <div className="mt-1 border-t border-[var(--color-parchment-300)] pt-1 text-xs italic">
          Pass condition: {ctx.successCondition}
        </div>
        <div className="text-xs italic">
          Current state:{' '}
          <span className="font-mono">{instance.state.attunement_state}</span>
        </div>
      </div>
      {result && (
        <div className="flex flex-col gap-1 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3 text-sm">
          <RollResultBadge
            diceRolled={result.dice}
            total={result.adjustedTotal}
            outcome={result.outcome}
          />
          <div className="text-xs text-[var(--color-ink-soft)]">
            1D10 = {result.rawTotal}{' '}
            {ctx.driveModifier >= 0 ? `− ${ctx.driveModifier}` : `+ ${Math.abs(ctx.driveModifier)}`}{' '}
            = {result.adjustedTotal} ≤{' '}
            {ctx.attunementValue}? <strong>{result.passed ? 'Pass' : 'Fail'}</strong>
          </div>
          <div className="text-xs text-[var(--color-ink-soft)]">
            Suggested next state:{' '}
            <span className="font-mono">
              {nextAttunementState(
                instance.state.attunement_state,
                result.outcome === 'total-failure'
                  ? 'total-failure'
                  : result.outcome === 'perfect-success' && result.passed
                    ? 'perfect-success'
                    : result.passed
                      ? 'success'
                      : 'failure',
              )}
            </span>
          </div>
        </div>
      )}
      {/* Record Penalty step — shown only on total-failure (Rule §14:50-57) */}
      {result && isTotalFailure && (
        <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 p-3 text-sm">
          <div className="mb-2 font-medium text-[var(--color-rust)]">
            Total Failure — Record Attunement Penalty (Rule §14:50-57)
          </div>
          <div className="flex flex-col gap-1 text-xs text-[var(--color-ink-soft)]">
            {(
              [
                ['drive-1', 'Base Drive −1 (recorded on this Ryude)'],
                ['spe-1', 'Ryude SPE −1'],
                ['pow-1', 'Ryude POW −1'],
                ['spe-pow-1', 'Ryude SPE −1 and POW −1'],
                ['operator-con', 'Operator CON damage (apply on character sheet)'],
                ['operator-wil', 'Operator WIL roll / damage (apply on character sheet)'],
              ] as [PenaltyKind, string][]
            ).map(([kind, label]) => (
              <label key={kind} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="attunement-penalty"
                  value={kind ?? ''}
                  checked={selectedPenalty === kind}
                  onChange={() => setSelectedPenalty(kind)}
                />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-2 mt-1">
              <input
                type="radio"
                name="attunement-penalty"
                value=""
                checked={selectedPenalty === null}
                onChange={() => setSelectedPenalty(null)}
              />
              <span className="italic">Skip — record penalty manually</span>
            </label>
          </div>
        </div>
      )}
      <DialogActions
        hasResult={result != null}
        onRoll={onRoll}
        onAdd={() => void onAdd()}
        onDiscard={() => { setResult(null); setSelectedPenalty(null); }}
      />
    </RollDialogShell>
  );
}
