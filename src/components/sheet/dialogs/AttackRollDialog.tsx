import * as React from 'react';
import { resolveAttack } from '@/engine/combat/attack';
import { buildWeaponLines } from '@/engine/derive/weapon-lines';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { RollResultBadge } from '@/components/dice/RollResultBadge';
import { DiceInputs } from '@/components/dice/DiceInputs';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import type { Character } from '@/domain/character';
import type { CustomItem } from '@/domain/custom-item';
import { isCustomWeapon, customWeaponToWeapon } from '@/domain/custom-item';
import type { ActionLogEntry } from '@/domain/action-log';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import { RollDialogShell } from './RollDialogShell';
import { DialogActions } from './DialogActions';

interface AttackRollDialogProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  derived: DerivedCombatValues;
  catalog: ReferenceCatalog | null;
  customItems?: CustomItem[];
  /** Pre-select a weapon when opening from a per-weapon Attack button. */
  initialWeaponId?: string;
  availableLuc: number;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    lucSpent: number,
  ) => Promise<void>;
}

function damageExpression(r: ReturnType<typeof resolveAttack>): string {
  const { diceTotal, flatBonus, critMultiplier } = r.damageBreakdown;
  const parts: string[] = [String(diceTotal)];
  if (flatBonus > 0) parts.push(`+ ${flatBonus} Warrior`);
  const pre = diceTotal + flatBonus;
  if (critMultiplier > 1) {
    return `${parts.join(' ')} × ${critMultiplier} crit = ${pre * critMultiplier}`;
  }
  if (flatBonus > 0) {
    return `${parts.join(' ')} = ${pre}`;
  }
  return String(pre);
}

export function AttackRollDialog({
  open,
  onClose,
  character,
  derived,
  catalog,
  customItems,
  initialWeaponId,
  availableLuc,
  onResolve,
}: AttackRollDialogProps): React.JSX.Element {
  const lines = React.useMemo(
    () => buildWeaponLines(character, catalog, derived.baseBN, customItems),
    [character, catalog, derived.baseBN, customItems],
  );
  const defaultWeapon = initialWeaponId ?? lines[0]?.weapon_id ?? '';
  const [weaponId, setWeaponId] = React.useState(defaultWeapon);
  const [stance, setStance] = React.useState<'melee' | 'charge' | 'range'>('melee');
  const [targetDN, setTargetDN] = React.useState<number>(10);
  const [targetAbsorption, setTargetAbsorption] = React.useState<number>(0);
  const [lucBn, setLucBn] = React.useState(0);
  const [lucDmg, setLucDmg] = React.useState(0);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualBn, setManualBn] = React.useState<number[]>([1]);
  const [manualDmg, setManualDmg] = React.useState<number[]>([1]);
  const [result, setResult] = React.useState<ReturnType<typeof resolveAttack> | null>(null);

  React.useEffect(() => {
    if (!open) {
      setWeaponId(initialWeaponId ?? lines[0]?.weapon_id ?? '');
      setStance('melee');
      setTargetDN(10);
      setTargetAbsorption(0);
      setLucBn(0);
      setLucDmg(0);
      setManualMode(false);
      setManualBn([1]);
      setManualDmg([1]);
      setResult(null);
    } else if (initialWeaponId) {
      setWeaponId(initialWeaponId);
    }
  }, [open, lines, initialWeaponId]);

  const catalogWeapon = catalog?.weapons.weapons.find((w) => w.id === weaponId) ?? null;
  const customWeapon = !catalogWeapon
    ? (customItems?.find((c) => c.id === weaponId) ?? null)
    : null;
  const weapon =
    catalogWeapon ??
    (customWeapon && isCustomWeapon(customWeapon) ? customWeaponToWeapon(customWeapon) : null);
  const line = lines.find((l) => l.weapon_id === weaponId) ?? null;

  // Pick a default stance based on what the weapon supports.
  React.useEffect(() => {
    if (!line) return;
    if (line.meleeBN != null) setStance('melee');
    else if (line.chargeBN != null) setStance('charge');
    else if (line.rangedBN != null) setStance('range');
  }, [weaponId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stanceBN =
    line && stance === 'melee'
      ? line.meleeBN
      : line && stance === 'charge'
        ? line.chargeBN
        : line && stance === 'range'
          ? line.rangedBN
          : null;

  const damageStr =
    weapon &&
    (stance === 'range'
      ? weapon.damage_value.ranged ?? null
      : weapon.damage_value.melee ?? null);

  const bnDiceCount = 1 + lucBn;
  const totalLucCap = availableLuc;
  const lucBnDisabled = totalLucCap === 0;
  const lucDmgRemaining = Math.max(0, totalLucCap - lucBn);
  const overspend = lucBn + lucDmg > totalLucCap;
  const overspendMessage = overspend
    ? `LUC dice (${lucBn} BN + ${lucDmg} damage = ${lucBn + lucDmg}) exceed Available LUC (${totalLucCap})`
    : undefined;

  const onRoll = () => {
    if (!weapon || !line || !damageStr || overspend) return;
    const stanceMod =
      stance === 'melee'
        ? weapon.bn_modifier.melee ?? 0
        : stance === 'charge'
          ? weapon.bn_modifier.charge ?? 0
          : weapon.bn_modifier.range ?? 0;
    const r = resolveAttack({
      baseBN: derived.baseBN,
      weaponBnModifier: stanceMod,
      weaponSkillLevel: line.weaponSkillLevel,
      criticalValue: weapon.critical_value,
      damageFormula: damageStr,
      bastardGrip:
        weapon.id === 'bastard-sword'
          ? character.equipment.bastard_sword_grip
          : undefined,
      targetDN,
      targetAbsorption,
      lucDice: lucBn,
      manualBn: manualMode ? manualBn.slice(0, bnDiceCount) : undefined,
      damageLucDice: lucDmg,
      manualDamage: manualMode ? manualDmg.slice(0, 1 + lucDmg) : undefined,
      flatDamageBonus: derived.warriorDamageBonus,
    });
    setResult(r);
  };

  const onAdd = async () => {
    if (!result || !weapon || !line) return;
    const notes: string[] = [];
    if (result.outcome === 'critical-hit')
      notes.push(
        `Critical Hit — damage × ${result.bnRoll.diceRolled.length + 1}.`,
      );
    if (result.outcome === 'perfect-success')
      notes.push(
        `Perfect Success — crit + PP, no LUC restored. damage × ${result.bnRoll.diceRolled.length + 1}.`,
      );
    if (result.outcome === 'total-failure')
      notes.push(
        'Total Failure on BN — IN halved next Segment; weapon may break (WM discretion).',
      );
    if (result.outcome === 'hit' || result.isCritical) {
      const { diceTotal, flatBonus, critMultiplier } = result.damageBreakdown;
      const breakdown =
        flatBonus > 0
          ? `${diceTotal} dice + ${flatBonus} Warrior${critMultiplier > 1 ? ` × ${critMultiplier} crit` : ''}`
          : `raw ${result.damageRollTotal}`;
      notes.push(
        `Damage dealt to target: ${result.damageDealt} (${breakdown}, absorption ${targetAbsorption}).`,
      );
    }
    if (result.outcome === 'miss') notes.push('Missed.');
    if (lucBn + lucDmg > 0)
      notes.push(`Spent ${lucBn + lucDmg} LUC (${lucBn} BN + ${lucDmg} damage).`);

    await onResolve(
      {
        kind: 'attack',
        label: `${weapon.name} (${stance}) vs DN ${targetDN}`,
        dice: result.bnRoll.diceRolled,
        modifier: derived.baseBN, // dice + Base BN; weapon mod + skill folded in via engine
        total: result.bnRoll.total,
        difficulty: targetDN,
        outcome: result.bnRoll.outcome,
        is_critical: result.isCritical,
        notes: notes.join(' '),
      },
      lucBn + lucDmg,
    );
    onClose();
  };

  if (!catalog) return <></>;

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Attack Roll"
      ruleNote={
        <>
          BN Roll = 1D10 + Base BN + weapon BN mod + Weapon Skill Level.
          Critical Hit when dice ≥ weapon Critical Value AND total ≥ DN.{' '}
          <strong>Total Failure</strong> halves IN next Segment. Damage = roll −
          target's Total Absorption (this Segment); on crit, ×(BN dice + 1).
          (Rule §08.)
        </>
      }
    >
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
            {lines.map((l) => (
              <option key={l.weapon_id} value={l.weapon_id}>
                {l.name}
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
            {line?.meleeBN != null && <option value="melee">Melee</option>}
            {line?.chargeBN != null && <option value="charge">Charge</option>}
            {line?.rangedBN != null && <option value="range">Range</option>}
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
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Target Absorption (this Segment)
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
      {line && stanceBN != null && damageStr && (
        <div className="text-xs text-[var(--color-ink-soft)]">
          BN to roll: 1D10 + {stanceBN} (Base + weapon mod + skill); damage{' '}
          <span className="font-mono">{damageStr}</span>; crit on dice ≥{' '}
          {weapon?.critical_value}.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-[var(--color-ink-soft)]">
          <span className="mr-2 font-display uppercase tracking-wider text-[var(--color-ink-faint)]">
            <AcronymTooltip code="LUC" /> on BN
          </span>
          <input
            type="number"
            min={0}
            max={totalLucCap}
            value={lucBn}
            disabled={lucBnDisabled}
            onChange={(e) =>
              setLucBn(
                Math.max(
                  0,
                  Math.min(totalLucCap, parseInt(e.target.value, 10) || 0),
                ),
              )
            }
            className="h-7 w-14 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 text-center font-mono text-sm disabled:opacity-50"
          />
          <span className="ml-1.5 text-[10px] text-[var(--color-ink-faint)]">
            / {totalLucCap} avail.
          </span>
        </label>
        <label className="text-xs text-[var(--color-ink-soft)]">
          <span className="mr-2 font-display uppercase tracking-wider text-[var(--color-ink-faint)]">
            <AcronymTooltip code="LUC" /> on damage
          </span>
          <input
            type="number"
            min={0}
            max={lucDmgRemaining}
            value={lucDmg}
            disabled={lucDmgRemaining === 0}
            onChange={(e) =>
              setLucDmg(
                Math.max(
                  0,
                  Math.min(
                    lucDmgRemaining,
                    parseInt(e.target.value, 10) || 0,
                  ),
                ),
              )
            }
            className="h-7 w-14 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 text-center font-mono text-sm disabled:opacity-50"
          />
          <span className="ml-1.5 text-[10px] text-[var(--color-ink-faint)]">
            / {lucDmgRemaining} left
          </span>
        </label>
      </div>
      <label className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
        <input
          type="checkbox"
          checked={manualMode}
          onChange={(e) => setManualMode(e.target.checked)}
          className="h-3.5 w-3.5 rounded-sm border-[var(--color-parchment-400)]"
        />
        Manual dice (BN and damage)
      </label>
      {manualMode && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <DiceInputs
            label="BN dice"
            count={bnDiceCount}
            faces={10}
            values={manualBn}
            onChange={setManualBn}
          />
          <DiceInputs
            label="Damage dice"
            count={1 + lucDmg}
            faces={10}
            values={manualDmg}
            onChange={setManualDmg}
          />
        </div>
      )}
      {result && (
        <div className="flex flex-col gap-1 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3 text-sm">
          <RollResultBadge
            diceRolled={result.bnRoll.diceRolled}
            total={result.bnRoll.total}
            outcome={result.bnRoll.outcome}
            isCritical={result.isCritical}
            difficulty={targetDN}
          />
          <div className="text-xs text-[var(--color-ink-soft)]">
            Outcome: <strong>{result.outcome}</strong>. Damage dealt:{' '}
            <strong>{result.damageDealt}</strong>{' '}
            {result.damageDice.length > 0 && (
              <>(rolled {result.damageDice.join(', ')} ⇒ {damageExpression(result)})</>
            )}
          </div>
        </div>
      )}
      <DialogActions
        hasResult={result != null}
        onRoll={onRoll}
        onAdd={() => void onAdd()}
        onDiscard={() => setResult(null)}
        disabledReason={overspendMessage}
      />
    </RollDialogShell>
  );
}
