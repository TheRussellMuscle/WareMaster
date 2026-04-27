import * as React from 'react';
import { actionRoll } from '@/engine/dice/action-roll';
import {
  monsterAbilityRoll,
  type AttackTarget,
  type MonsterAbility,
} from '@/engine/derive/instance-rolls';
import type { ActionLogEntry } from '@/domain/action-log';
import type { MonsterTemplate } from '@/domain/monster';
import type { MonsterInstance } from '@/domain/monster-instance';
import { RollDialogShell } from '@/components/sheet/dialogs/RollDialogShell';
import { DialogActions } from '@/components/sheet/dialogs/DialogActions';
import { ResultDisplay } from '@/components/sheet/dialogs/ResultDisplay';

interface Props {
  open: boolean;
  onClose: () => void;
  template: MonsterTemplate;
  instance: MonsterInstance;
  initialAbility?: MonsterAbility;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
  ) => Promise<void>;
}

const ABILITIES: MonsterAbility[] = ['sen', 'agi', 'wil', 'con', 'cha'];

export function InstanceAbilityDialog({
  open,
  onClose,
  template,
  instance,
  initialAbility,
  onResolve,
}: Props): React.JSX.Element {
  const [ability, setAbility] = React.useState<MonsterAbility>(
    initialAbility ?? 'agi',
  );
  const [target, setTarget] = React.useState<AttackTarget>('character');
  const [difficulty, setDifficulty] = React.useState(8);
  const [result, setResult] = React.useState<ReturnType<typeof actionRoll> | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) {
      setAbility(initialAbility ?? 'agi');
      setTarget('character');
      setDifficulty(8);
      setResult(null);
    }
  }, [open, initialAbility]);

  const ctx = monsterAbilityRoll(template, instance, ability, target);

  const onRoll = () => {
    setResult(
      actionRoll({
        baseAttribute: ctx.base,
        modifier: ctx.modifier,
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
      modifier: ctx.base + ctx.modifier,
      total: result.total,
      difficulty,
      outcome: result.outcome,
      is_critical: false,
      notes: result.outcome === 'perfect-success'
        ? 'Perfect Success.'
        : result.outcome === 'total-failure'
          ? 'Total Failure.'
          : '',
    });
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Ability Roll"
      ruleNote={
        <>
          1D10 + Base Ability vs Difficulty (Rule §07). Monsters use{' '}
          <code>base_&lt;ability&gt;</code> against characters; bracketed{' '}
          <code>_vs_ryude</code> variants apply when the target is a Ryude
          (Rule §15).
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2 text-sm">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Ability
          </span>
          <select
            value={ability}
            onChange={(e) => setAbility(e.target.value as MonsterAbility)}
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm uppercase"
          >
            {ABILITIES.map((a) => (
              <option key={a} value={a}>
                {a.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Target
          </span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as AttackTarget)}
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
          >
            <option value="character">vs Character</option>
            <option value="ryude">vs Ryude</option>
          </select>
        </label>
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
      </div>
      <div className="text-xs text-[var(--color-ink-soft)]">
        Base {ability.toUpperCase()} = {ctx.base}
        {target === 'ryude' && ' (vs-Ryude variant)'}
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
