import * as React from 'react';
import { resolveAttack } from '@/engine/combat/attack';
import {
  ryudeAttackContext,
  type AttackTarget,
  type OperatorStats,
} from '@/engine/derive/instance-rolls';
import {
  resolveRyudeItem,
  equippedRyudeArmors,
} from '@/engine/derive/ryude-equipment';
import type { CustomItem } from '@/domain/custom-item';
import type { ActionLogEntry } from '@/domain/action-log';
import type { RyudeTemplate } from '@/domain/ryude';
import type { RyudeInstance } from '@/domain/ryude-instance';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import { RollDialogShell } from '@/components/sheet/dialogs/RollDialogShell';
import { DialogActions } from '@/components/sheet/dialogs/DialogActions';
import { ResultDisplay } from '@/components/sheet/dialogs/ResultDisplay';

interface Props {
  open: boolean;
  onClose: () => void;
  template: RyudeTemplate;
  instance: RyudeInstance;
  operator: OperatorStats;
  catalog: ReferenceCatalog | null;
  customItems?: CustomItem[];
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
  ) => Promise<void>;
}

export function RyudeAttackDialog({
  open,
  onClose,
  template,
  instance,
  operator,
  catalog,
  customItems = [],
  onResolve,
}: Props): React.JSX.Element {
  const weapons = React.useMemo(
    () =>
      instance.state.equipped_item_ids
        .map((id) => resolveRyudeItem(id, catalog, customItems))
        .flatMap((r) => (r?.kind === 'weapon' ? [r.item] : [])),
    [instance.state.equipped_item_ids, catalog, customItems],
  );

  const [weaponId, setWeaponId] = React.useState(weapons[0]?.id ?? '');
  const [stance, setStance] = React.useState<'melee' | 'charge' | 'range'>(
    'melee',
  );
  const [target, setTarget] = React.useState<AttackTarget>('character');
  const [targetDN, setTargetDN] = React.useState(8);
  const [targetAbsorption, setTargetAbsorption] = React.useState(0);
  const [result, setResult] = React.useState<ReturnType<typeof resolveAttack> | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) {
      setWeaponId(weapons[0]?.id ?? '');
      setStance('melee');
      setTarget('character');
      setTargetDN(8);
      setTargetAbsorption(0);
      setResult(null);
    }
  }, [open, weapons]);

  const weapon = weapons.find((w) => w.id === weaponId) ?? null;
  const armors = React.useMemo(
    () => equippedRyudeArmors(instance.state.equipped_item_ids, catalog, customItems),
    [instance.state.equipped_item_ids, catalog, customItems],
  );
  const ctx = weapon
    ? ryudeAttackContext(template, instance, operator, weapon, target, stance, armors)
    : null;

  const onRoll = () => {
    if (!ctx) return;
    setResult(
      resolveAttack({
        baseBN: ctx.baseBN,
        weaponBnModifier: ctx.weaponBnModifier,
        weaponSkillLevel: ctx.weaponSkillLevel,
        criticalValue: ctx.criticalValue,
        damageFormula: ctx.damageFormula,
        targetDN,
        targetAbsorption,
      }),
    );
  };

  const onAdd = async () => {
    if (!result || !ctx) return;
    const dealt = result.damageDealt * ctx.vsHumanMultiplier;
    const notes: string[] = [];
    if (result.outcome === 'critical-hit') notes.push('Critical hit.');
    if (result.outcome === 'perfect-success')
      notes.push('Perfect Success — crit + PP.');
    if (result.outcome === 'total-failure')
      notes.push('Total Failure — Operator Error possible (Rule §14:124).');
    if (ctx.vsHumanMultiplier === 10)
      notes.push(`Damage ×10 vs human target (Rule §14:160): ${result.damageDealt} → ${dealt}.`);
    else notes.push(`Damage dealt: ${dealt}.`);

    await onResolve({
      kind: 'attack',
      label: ctx.label,
      dice: result.bnRoll.diceRolled,
      modifier: ctx.baseBN + ctx.weaponBnModifier + ctx.weaponSkillLevel,
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
      title="Ryude Weapon Attack"
      ruleNote={
        <>
          BN = Operator AGI Base + Ryude SPE + Weapon BN (stance) + Weapon Skill +
          Drive Modifier vs target DN. Damage formula minus target absorption,{' '}
          <strong>×10 vs human-scale targets</strong> (Rule §14:160).
        </>
      }
    >
      {weapons.length === 0 ? (
        <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 p-2 text-xs text-[var(--color-rust)]">
          No weapons equipped. Equip weapons from the Equipment panel on this instance&apos;s stat block.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Weapon
              </span>
              <select
                value={weaponId}
                onChange={(e) => setWeaponId(e.target.value)}
                className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
              >
                {weapons.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Stance
              </span>
              <select
                value={stance}
                onChange={(e) =>
                  setStance(e.target.value as 'melee' | 'charge' | 'range')
                }
                className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
              >
                <option value="melee">Melee</option>
                <option value="charge">Charge</option>
                <option value="range">Range</option>
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
                <option value="character">vs Character (×10)</option>
                <option value="ryude">vs Ryude</option>
              </select>
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
            <label className="flex flex-col gap-0.5 col-span-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Target Absorption
              </span>
              <input
                type="number"
                min={0}
                value={targetAbsorption}
                onChange={(e) =>
                  setTargetAbsorption(
                    Math.max(0, parseInt(e.target.value, 10) || 0),
                  )
                }
                className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
              />
            </label>
          </div>
          {ctx && (
            <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3 text-xs text-[var(--color-ink-soft)]">
              {ctx.breakdown.map((line) => (
                <div key={line.label} className="flex justify-between">
                  <span>{line.label}</span>
                  <span className="font-mono">
                    {line.value >= 0 ? '+' : ''}
                    {line.value}
                  </span>
                </div>
              ))}
              <div className="mt-1 border-t border-[var(--color-parchment-300)] pt-1 italic">
                Damage <code>{ctx.damageFormula}</code>
                {ctx.vsHumanMultiplier === 10 && ' ×10 vs human'}
              </div>
            </div>
          )}
        </>
      )}
      {result && ctx && (
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
                Damage {result.damageRollTotal} → dealt{' '}
                {result.damageDealt * ctx.vsHumanMultiplier} (after absorption
                {ctx.vsHumanMultiplier === 10 ? ', ×10 vs human' : ''})
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
        disabledReason={!weapon ? 'No weapon selected' : undefined}
      />
    </RollDialogShell>
  );
}
