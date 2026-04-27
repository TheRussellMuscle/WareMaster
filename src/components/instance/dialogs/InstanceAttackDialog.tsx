import * as React from 'react';
import { resolveAttack } from '@/engine/combat/attack';
import {
  monsterAbilityRoll,
  monsterDamageFormula,
  type AttackTarget,
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
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
  ) => Promise<void>;
}

/**
 * Monster (and Beast NPC) BN attack — Rule §08.
 * No LUC dice (monsters lack a LUC pool).
 */
export function InstanceAttackDialog({
  open,
  onClose,
  template,
  instance,
  onResolve,
}: Props): React.JSX.Element {
  const [target, setTarget] = React.useState<AttackTarget>('character');
  const [targetDN, setTargetDN] = React.useState(8);
  const [targetAbsorption, setTargetAbsorption] = React.useState(0);
  const [criticalValue, setCriticalValue] = React.useState(8);
  const [result, setResult] = React.useState<ReturnType<typeof resolveAttack> | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) {
      setTarget('character');
      setTargetDN(8);
      setTargetAbsorption(0);
      setCriticalValue(8);
      setResult(null);
    }
  }, [open]);

  const agi = monsterAbilityRoll(template, instance, 'agi', target);
  const dmg = monsterDamageFormula(template, instance, target);

  const onRoll = () => {
    setResult(
      resolveAttack({
        baseBN: agi.base,
        weaponBnModifier: 0,
        weaponSkillLevel: 0,
        criticalValue,
        damageFormula: dmg.formula.replace(/\s×\d+$/, ''), // strip "×N" suffix; engine doesn't parse it
        targetDN,
        targetAbsorption,
      }),
    );
  };

  const onAdd = async () => {
    if (!result) return;
    const notes: string[] = [];
    if (result.outcome === 'critical-hit') notes.push('Critical hit.');
    if (result.outcome === 'perfect-success')
      notes.push('Perfect Success — crit + PP.');
    if (result.outcome === 'total-failure') notes.push('Total Failure on BN.');
    notes.push(`Damage dealt: ${result.damageDealt}.`);
    if (result.damageBreakdown.flatBonus > 0)
      notes.push(`(+${result.damageBreakdown.flatBonus} flat).`);

    await onResolve({
      kind: 'attack',
      label: `${instance.name} · BN ${target === 'ryude' ? 'vs Ryude' : 'vs Character'} · DN ${targetDN}`,
      dice: result.bnRoll.diceRolled,
      modifier: agi.base,
      total: result.bnRoll.total,
      difficulty: targetDN,
      outcome: result.bnRoll.outcome,
      is_critical: result.isCritical,
      notes: notes.join(' '),
    });
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Monster Attack"
      ruleNote={
        <>
          1D10 + Base AGI vs target's DN. All 1s ⇒ Total Failure; dice ≥
          Critical Value AND total ≥ DN ⇒ Critical Hit. Damage formula{' '}
          <code>{dmg.formula}</code> minus target absorption (×{result?.damageBreakdown.critMultiplier ?? 1} on
          crit). Vs-Ryude variants use bracketed stats (Rule §15).
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
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
            Critical Value
          </span>
          <input
            type="number"
            min={1}
            max={10}
            value={criticalValue}
            onChange={(e) =>
              setCriticalValue(Math.max(1, parseInt(e.target.value, 10) || 8))
            }
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Target DN
          </span>
          <input
            type="number"
            min={1}
            value={targetDN}
            onChange={(e) =>
              setTargetDN(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Target Absorption
          </span>
          <input
            type="number"
            min={0}
            value={targetAbsorption}
            onChange={(e) =>
              setTargetAbsorption(Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
      </div>
      <div className="text-xs text-[var(--color-ink-soft)]">
        Base AGI {agi.base} · Damage <code>{dmg.formula}</code>
      </div>
      {result && (
        <ResultDisplay
          dice={result.bnRoll.diceRolled}
          total={result.bnRoll.total}
          outcome={result.bnRoll.outcome}
          difficulty={targetDN}
          isCritical={result.isCritical}
          extra={
            result.outcome === 'miss' || result.outcome === 'total-failure' ? (
              <>No damage.</>
            ) : (
              <>
                Damage roll {result.damageRollTotal} → dealt {result.damageDealt}{' '}
                (after absorption)
              </>
            )
          }
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
