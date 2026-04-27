import * as React from 'react';
import { rollDice, classifyOutcome, type RollOutcome } from '@/engine/dice/roll';
import { ryudeAttunementContext } from '@/engine/derive/instance-rolls';
import { nextAttunementState } from '@/engine/derive/instance-bookkeeping';
import { RollResultBadge } from '@/components/dice/RollResultBadge';
import type { ActionLogEntry } from '@/domain/action-log';
import type { RyudeTemplate } from '@/domain/ryude';
import type { RyudeInstance, RyudeAttunementState } from '@/domain/ryude-instance';
import type { Character } from '@/domain/character';
import { RollDialogShell } from '@/components/sheet/dialogs/RollDialogShell';
import { DialogActions } from '@/components/sheet/dialogs/DialogActions';

interface Props {
  open: boolean;
  onClose: () => void;
  template: RyudeTemplate;
  instance: RyudeInstance;
  operator: Character;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    suggestedNextState: RyudeAttunementState | null,
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

  React.useEffect(() => {
    if (!open) setResult(null);
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
  };

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
      `1D10 ${result.rawTotal} − Drive Mod ${ctx.driveModifier} = ${result.adjustedTotal} ≤ ${ctx.attunementValue}? ${result.passed ? 'pass' : 'fail'}.`,
    ];
    if (willChange) notes.push(`Suggested: ${instance.state.attunement_state} → ${suggested}.`);

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
            1D10 = {result.rawTotal} − {ctx.driveModifier} = {result.adjustedTotal} ≤{' '}
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
      <DialogActions
        hasResult={result != null}
        onRoll={onRoll}
        onAdd={() => void onAdd()}
        onDiscard={() => setResult(null)}
      />
    </RollDialogShell>
  );
}
