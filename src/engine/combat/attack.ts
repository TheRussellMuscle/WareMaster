/**
 * BN attack roll + damage resolution — Rule §08 (`docs/rules/08-combat.md`).
 *
 * BN Roll = 1D10 + Base BN + weapon BN modifier (+ <Weapon> Skill Level).
 * Compared to target's DN:
 *   BN < DN              → miss
 *   BN ≥ DN              → hit
 *   all dice = 1         → Total Failure (overrides hit)
 *   dice ≥ critical_value AND total ≥ DN → Critical Hit
 *   all dice = 10 AND total ≥ DN          → Perfect Success (= Crit + PP)
 *
 * Damage:
 *   normal: dmgRoll - target.totalAbsorption(currentSegment)
 *   crit:  (dmgRoll × (BN_dice_count + 1)) - target.totalAbsorption
 *
 * On Total Failure of a BN Roll: half PP, weapon-break risk (WM discretion),
 * IN halved next Segment.
 */

import {
  actionRoll,
  type ActionRollResult,
  type ActionRollInput,
} from '../dice/action-roll';
import { rollDice } from '../dice/roll';
import type { Rng } from '../dice/rng';
import { createRng } from '../dice/rng';
import {
  resolveDamageFormula,
  type BastardGrip,
  type DiceFormula,
} from '@/lib/dice-notation';

export interface AttackInput {
  /** Attacker's Base BN — typically `Base AGI + Total Armor Modifier`. */
  baseBN: number;
  /** Weapon-specific BN modifier for the chosen attack stance (melee / charge / range). */
  weaponBnModifier: number;
  /** Character's <Weapon> Skill Level for this weapon, or 0 if untrained. */
  weaponSkillLevel: number;
  /** Weapon Critical Value — dice ≥ this AND total ≥ DN ⇒ Critical Hit. */
  criticalValue: number;
  /** Damage formula string ("1D10+3", "2D5+5", or bastard "1D10+3(5)"). */
  damageFormula: string;
  /** Required when `damageFormula` is bastard-sword notation. */
  bastardGrip?: BastardGrip;
  /** Target's DN value for the current Segment. */
  targetDN: number;
  /**
   * Target's Total Absorption for the current Segment. Already-modified
   * value (Perfect Success ×2 / Total Failure ÷2 applied upstream).
   */
  targetAbsorption: number;
  /** LUC dice on the BN Roll. */
  lucDice?: number;
  /** Manual BN dice values; length must equal `1 + (lucDice ?? 0)`. */
  manualBn?: number[];
  /** Extra LUC dice on the damage roll. Capped to weapon max. */
  damageLucDice?: number;
  /** Manual damage dice (length must equal weapon dice + damageLucDice). */
  manualDamage?: number[];
  /**
   * Flat damage added to the rolled value before the crit multiplier and
   * exempt from the weapon-max cap (Rule §06 §1 carves out "Critical Hits,
   * the Warrior +1, or Techniques" as the only ways to exceed weapon max).
   * Sources: Warrior +1 class perk, future technique flat-damage modifiers.
   * Defaults to 0.
   */
  flatDamageBonus?: number;
}

export type AttackOutcome =
  | 'miss'
  | 'hit'
  | 'critical-hit'
  | 'perfect-success'
  | 'total-failure';

export interface AttackResult {
  bnRoll: ActionRollResult;
  outcome: AttackOutcome;
  /** Always true for crit / perfect — the damage roll happens regardless. */
  isCritical: boolean;
  /** Raw damage formula resolved to numbers (after grip resolution). */
  damageFormula: DiceFormula;
  /** Dice values rolled for damage (may be empty on a miss / total failure). */
  damageDice: number[];
  /** Raw `dice + modifier + flatBonus` value of the damage roll, before crit multiplier and absorption. */
  damageRollTotal: number;
  /** Damage dealt after crit multiplier and absorption subtraction. Floored at 0. */
  damageDealt: number;
  /** Components of `damageRollTotal` and the crit scaling for the result panel. */
  damageBreakdown: {
    /** Sum of dice + weapon modifier (capped at the weapon's base max). */
    diceTotal: number;
    /** Sum of flat bonuses (Warrior +1, technique bonuses, etc.). 0 on miss/total-failure. */
    flatBonus: number;
    /** 1 on hit, (BN dice count + 1) on critical-hit / perfect-success, 0 on miss/total-failure. */
    critMultiplier: number;
  };
  /** PP awarded to the weapon's skill (10 × multiplier on perfect, 5 × multiplier on total fail). */
  ppGain: number;
  /** True when Total Failure on BN — caller halves the attacker's IN next Segment. */
  inHalvedNextSegment: boolean;
  /** True when Total Failure — caller surfaces "weapon may break" warning per WM discretion. */
  weaponMayBreak: boolean;
}

export function resolveAttack(input: AttackInput, rng?: Rng): AttackResult {
  const usedRng = rng ?? createRng();
  const damageFormula = resolveDamageFormula(
    input.damageFormula,
    input.bastardGrip,
  );

  const bnInput: ActionRollInput = {
    baseAttribute: input.baseBN,
    skillLevel: input.weaponSkillLevel,
    modifier: input.weaponBnModifier,
    difficulty: input.targetDN,
    lucDice: input.lucDice,
    manual: input.manualBn,
  };
  const bnRoll = actionRoll(bnInput, usedRng);

  const allOnes = bnRoll.diceRolled.every((d) => d === 1);
  const allMax = bnRoll.diceRolled.every((d) => d === 10);
  const meetsDN = bnRoll.total >= input.targetDN;
  const critByValue =
    bnRoll.diceRolled.every((d) => d >= input.criticalValue) && meetsDN;

  let outcome: AttackOutcome;
  if (allOnes) {
    outcome = 'total-failure';
  } else if (allMax && meetsDN) {
    outcome = 'perfect-success';
  } else if (critByValue) {
    outcome = 'critical-hit';
  } else if (meetsDN) {
    outcome = 'hit';
  } else {
    outcome = 'miss';
  }

  const isCritical = outcome === 'critical-hit' || outcome === 'perfect-success';

  // Damage roll only happens on a successful hit. Total Failure / miss skip it.
  let damageDice: number[] = [];
  let damageRollTotal = 0;
  let damageDealt = 0;
  let diceTotal = 0;
  let flatBonus = 0;
  let critMultiplier = 0;
  if (outcome === 'hit' || isCritical) {
    const dmgLuc = input.damageLucDice ?? 0;
    if (dmgLuc < 0 || !Number.isInteger(dmgLuc)) {
      throw new Error(
        `damageLucDice must be a non-negative integer, got ${dmgLuc}`,
      );
    }
    const damageDiceCount = damageFormula.dice + dmgLuc;
    const dmg = rollDice(
      {
        dice: damageDiceCount,
        faces: damageFormula.faces as 10 | 5,
        baseAttribute: damageFormula.modifier,
        manual: input.manualDamage,
      },
      usedRng,
    );
    damageDice = dmg.diceRolled;
    let raw = dmg.total;
    // LUC damage cap applies to the dice contribution only — Rule §08 caps the
    // dice at the weapon's base max, but Rule §06 §1 explicitly carves out
    // "Critical Hits, the Warrior +1, or Techniques" as bonus paths that may
    // exceed that cap. So: cap dice → add flat bonus → multiply on crit.
    if (raw > damageFormula.max) raw = damageFormula.max;
    diceTotal = raw;
    flatBonus = input.flatDamageBonus ?? 0;
    raw += flatBonus;
    damageRollTotal = raw;
    critMultiplier = isCritical ? bnRoll.diceRolled.length + 1 : 1;
    damageDealt = Math.max(0, raw * critMultiplier - input.targetAbsorption);
  }

  // PP — weapon skills are combat skills. Default impact column = Non-Critical.
  let ppGain = 0;
  if (outcome === 'perfect-success') {
    ppGain = 10 * bnRoll.bonusMultiplier;
  } else if (outcome === 'total-failure') {
    ppGain = 5 * bnRoll.bonusMultiplier;
  }

  return {
    bnRoll: {
      ...bnRoll,
      isCritical,
      // Re-classify the underlying roll's outcome to match the attack outcome
      // so log entries are consistent with crit detection.
      outcome:
        outcome === 'miss'
          ? 'failure'
          : outcome === 'total-failure'
            ? 'total-failure'
            : outcome === 'perfect-success'
              ? 'perfect-success'
              : 'success',
    },
    outcome,
    isCritical,
    damageFormula,
    damageDice,
    damageRollTotal,
    damageDealt,
    damageBreakdown: { diceTotal, flatBonus, critMultiplier },
    ppGain,
    inHalvedNextSegment: outcome === 'total-failure',
    weaponMayBreak: outcome === 'total-failure',
  };
}
