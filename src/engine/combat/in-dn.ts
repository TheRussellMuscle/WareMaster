/**
 * IN/DN segment roll — Rule §08 (`docs/rules/08-combat.md`).
 *
 * "Players roll 1D10, then add their Base IN and Base DN to determine when
 * they act – their IN value – and how difficult they are to hit – their DN
 * value. Because these values are determined by the same roll, it is called
 * the IN/DN Roll."
 *
 * On the same dice:
 *  - Perfect Success (all 10s): <Defense> PP gained, Total Absorption is
 *    DOUBLED for this Segment.
 *  - Total Failure (all 1s): half of Perfect's <Defense> PP (rounding up),
 *    Total Absorption is HALVED (rounding down) for this Segment.
 *  - Neither restores LUC.
 */

import { actionRoll, type ActionRollResult } from '../dice/action-roll';
import type { Rng } from '../dice/rng';

export type AbsorptionModifier = 1 | 2 | 0.5;

export interface InDnInput {
  /** Base IN — usually `Base SEN + Total Armor Modifier`. */
  baseIN: number;
  /** Base DN — usually `Base AGI + Defense Skill Level + Total Armor Modifier`. */
  baseDN: number;
  lucDice?: number;
  manual?: number[];
}

export interface InDnResult {
  /** Underlying single-D10 (+ LUC dice) action roll. `total` here is the IN value. */
  roll: ActionRollResult;
  /** Initiative Number for this Segment (used for action ordering). */
  inValue: number;
  /** Defense Number for this Segment (compared to incoming BN totals). */
  dnValue: number;
  /** Multiplier applied to Total Absorption this Segment: 2 / 1 / 0.5. */
  absorptionModifier: AbsorptionModifier;
  /** PP awarded toward `<Defense>` — 0 unless Perfect Success / Total Failure. */
  defensePpGain: number;
}

export function rollInDn(input: InDnInput, rng?: Rng): InDnResult {
  // For an IN/DN Roll, "no Difficulty" — the dice plus base values *are*
  // the IN/DN values. We pass `undefined` for difficulty so action-roll
  // doesn't classify success/failure on the IN total. Total Failure
  // (all 1s) and Perfect Success (all 10s) are still detected: classifier
  // returns 'success' for "all 10s without difficulty" but we re-classify
  // here for the absorption rule.
  const inRoll = actionRoll(
    {
      baseAttribute: input.baseIN,
      lucDice: input.lucDice,
      manual: input.manual,
    },
    rng,
  );
  const inValue = inRoll.total;
  // DN uses the same dice but a different base (Rule §08).
  const diceSum = inRoll.diceRolled.reduce((a, b) => a + b, 0);
  const dnValue = diceSum + input.baseDN;

  let absorptionModifier: AbsorptionModifier = 1;
  let defensePpGain = 0;
  const allMax = inRoll.diceRolled.every((d) => d === 10);
  const allOnes = inRoll.diceRolled.every((d) => d === 1);
  // Defense PP base — using Non-Critical impact column (10 / 5) per
  // tables.yaml `proficiency_gains`. Multiplied by total dice when LUC was
  // spent (rule §07 LUC bonus multiplier).
  const mult = inRoll.bonusMultiplier;
  if (allMax) {
    absorptionModifier = 2;
    defensePpGain = 10 * mult;
  } else if (allOnes) {
    absorptionModifier = 0.5;
    // "half those of a Perfect Success, rounding up" → 5 PP base.
    defensePpGain = Math.ceil((10 / 2) * mult);
  }

  return {
    roll: {
      ...inRoll,
      // Re-classify outcome for log clarity.
      outcome: allOnes
        ? 'total-failure'
        : allMax
          ? 'perfect-success'
          : 'success',
      ppEligible: allMax || allOnes,
    },
    inValue,
    dnValue,
    absorptionModifier,
    defensePpGain,
  };
}

/** Apply the segment's absorption modifier to a base Total Absorption. */
export function applyAbsorptionModifier(
  totalAbsorption: number,
  modifier: AbsorptionModifier,
): number {
  if (modifier === 2) return totalAbsorption * 2;
  if (modifier === 0.5) return Math.floor(totalAbsorption / 2);
  return totalAbsorption;
}
