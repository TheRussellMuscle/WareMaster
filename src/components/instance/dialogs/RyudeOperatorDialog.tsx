import * as React from 'react';
import { actionRoll } from '@/engine/dice/action-roll';
import { ryudeOperatorRoll, effectiveRyudeAttribute, type OperatorStats } from '@/engine/derive/instance-rolls';
import type { ActionLogEntry } from '@/domain/action-log';
import type { RyudeTemplate } from '@/domain/ryude';
import type { RyudeInstance } from '@/domain/ryude-instance';
import { RollDialogShell } from '@/components/sheet/dialogs/RollDialogShell';
import { DialogActions } from '@/components/sheet/dialogs/DialogActions';
import { ResultDisplay } from '@/components/sheet/dialogs/ResultDisplay';

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
  ) => Promise<void>;
}

/** Ryude Operator Roll — Rule §14:124-160. */
export function RyudeOperatorDialog({
  open,
  onClose,
  template,
  instance,
  operator,
  onResolve,
}: Props): React.JSX.Element {
  const [difficulty, setDifficulty] = React.useState(8);
  const [extraModifier, setExtraModifier] = React.useState(0);
  const [result, setResult] = React.useState<ReturnType<typeof actionRoll> | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) {
      setDifficulty(8);
      setExtraModifier(0);
      setResult(null);
    }
  }, [open]);

  const ctx = ryudeOperatorRoll(template, instance, operator);

  const onRoll = () => {
    setResult(
      actionRoll({
        baseAttribute: ctx.base,
        modifier: ctx.modifier + extraModifier,
        difficulty,
      }),
    );
  };

  const onAdd = async () => {
    if (!result) return;
    await onResolve({
      kind: 'ability',
      label: `${ctx.label} vs DC ${difficulty}`,
      dice: result.diceRolled,
      modifier: ctx.base + ctx.modifier + extraModifier,
      total: result.total,
      difficulty,
      outcome: result.outcome,
      is_critical: false,
      notes:
        result.outcome === 'perfect-success'
          ? 'Perfect Success.'
          : result.outcome === 'total-failure'
            ? 'Total Failure — consult Operator Error Tables (Rule §14:124-145).'
            : '',
    });
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Operator Roll"
      ruleNote={
        <>
          DN/BN: 1D10 + Operator AGI Base + Ryude SPE + Drive Modifier vs DC.
          IN uses SEN Base instead of AGI (Rule §14:149). Total Failure consults
          Operator Error Tables (Rule §14:124-160).
        </>
      }
    >
      <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3 text-xs text-[var(--color-ink-soft)]">
        {ctx.breakdown.map((line) =>
          line.value === 0 && line.label.startsWith('Ryude Ego') ? (
            <div key={line.label} className="italic text-[var(--color-ink-faint)]">
              {line.label}
            </div>
          ) : (
            <div key={line.label} className="flex justify-between">
              <span>{line.label}</span>
              <span className="font-mono">
                {line.value >= 0 ? '+' : ''}
                {line.value}
              </span>
            </div>
          ),
        )}
        <div className="mt-1 flex justify-between border-t border-[var(--color-parchment-300)] pt-1 font-medium text-[var(--color-ink)]">
          <span>Total modifier</span>
          <span className="font-mono">
            {ctx.base + ctx.modifier + (extraModifier >= 0 ? '+' : '')}
            {extraModifier !== 0 ? extraModifier : ''}
          </span>
        </div>
        {/* Jump distance reference values — Rule §14:22 */}
        {(() => {
          const pow = effectiveRyudeAttribute(template, instance, 'pow');
          return (
            <div className="mt-2 border-t border-[var(--color-parchment-300)] pt-2 text-[10px] italic text-[var(--color-ink-faint)]">
              Jump capacity (POW {pow}): vertical {pow * 6} liets ·
              dash-jump {pow * 50} long / {pow * 6} high
            </div>
          );
        })()}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            DC
          </span>
          <input
            type="number"
            min={1}
            value={difficulty}
            onChange={(e) =>
              setDifficulty(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            WM modifier
          </span>
          <input
            type="number"
            value={extraModifier}
            onChange={(e) => setExtraModifier(parseInt(e.target.value, 10) || 0)}
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
      </div>
      {result && (
        <ResultDisplay
          dice={result.diceRolled}
          total={result.total}
          outcome={result.outcome}
          difficulty={difficulty}
        />
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
