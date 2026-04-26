/**
 * Action Roll resolver — Rule §07 (`docs/rules/07-action-rolls.md`).
 *
 * Roll = 1D10 + Base Value + Skill Level (when applicable). LUC dice are
 * pre-allocated by the player. The resolver also flags re-roll eligibility
 * (Skill Level ≥ Difficulty allows re-rolling any one 1) and computes
 * Perfect Success / Total Failure outcomes that PP gain and LUC recovery
 * downstream depend on.
 */

import { rollDice, classifyOutcome, type RollOutcome } from './roll';
import type { Rng } from './rng';
import { createRng } from './rng';

export interface ActionRollInput {
  /** Base Value of the governing ability — `floor(score/3)`. */
  baseAttribute: number;
  /** Relevant Skill Level, or 0 / undefined when none applies. */
  skillLevel?: number;
  /** Flat modifier (armor mod, situational, etc.). */
  modifier?: number;
  /** Action Roll Difficulty. Open rolls (no DC) may pass `undefined`. */
  difficulty?: number;
  /** Number of LUC dice spent. Defaults to 0 (just 1D10). */
  lucDice?: number;
  /**
   * Manual dice values (the player rolled physical dice). Length must equal
   * `1 + lucDice`. Engine validates and uses these instead of RNG.
   */
  manual?: number[];
}

export interface ActionRollResult {
  diceRolled: number[];
  baseAttribute: number;
  skillLevel: number;
  modifier: number;
  total: number;
  difficulty: number | undefined;
  outcome: RollOutcome;
  /** Always 0 for plain action rolls; set by `attack.ts` when crit applies. */
  isCritical: boolean;
  /** True when Skill Level ≥ Difficulty AND at least one die came up 1. */
  canReroll: boolean;
  rerollUsed: boolean;
  lucDiceUsed: number;
  /** True for Perfect Success / Total Failure. Caller computes PP via tables.yaml. */
  ppEligible: boolean;
  /**
   * Multiplier on bonuses/penalties when LUC was spent (Rule §07: "all
   * bonuses or penalties are multiplied by the total number of dice rolled").
   * Always at least 1 — equals total dice including the baseline D10.
   */
  bonusMultiplier: number;
}

/** Roll an Action Roll. Caller may follow up with `applyReroll` if `canReroll`. */
export function actionRoll(
  input: ActionRollInput,
  rng: Rng = createRng(),
): ActionRollResult {
  const lucDice = input.lucDice ?? 0;
  if (lucDice < 0 || !Number.isInteger(lucDice)) {
    throw new Error(`lucDice must be a non-negative integer, got ${lucDice}`);
  }
  const totalDice = 1 + lucDice;
  const skillLevel = input.skillLevel ?? 0;
  const modifier = input.modifier ?? 0;

  const raw = rollDice(
    {
      dice: totalDice,
      faces: 10,
      baseAttribute: input.baseAttribute,
      skillLevel,
      modifier,
      difficulty: input.difficulty,
      manual: input.manual,
    },
    rng,
  );
  const outcome = classifyOutcome(
    raw.diceRolled,
    raw.total,
    10,
    input.difficulty,
  );

  const canReroll =
    input.difficulty !== undefined &&
    skillLevel >= input.difficulty &&
    raw.diceRolled.includes(1);

  return {
    diceRolled: raw.diceRolled,
    baseAttribute: input.baseAttribute,
    skillLevel,
    modifier,
    total: raw.total,
    difficulty: input.difficulty,
    outcome,
    isCritical: false,
    canReroll,
    rerollUsed: false,
    lucDiceUsed: lucDice,
    ppEligible: outcome === 'perfect-success' || outcome === 'total-failure',
    bonusMultiplier: totalDice,
  };
}

/**
 * Re-roll a single die at `dieIndex` (Rule §07: "re-roll any 1 once" when
 * Skill Level ≥ Difficulty). The new die replaces the old one and outcome is
 * re-classified. `rerollUsed` is set to true; subsequent calls throw — only
 * one re-roll per Action Roll.
 *
 * Pass a `manualValue` to substitute a player-rolled die instead of using RNG.
 */
export function applyReroll(
  result: ActionRollResult,
  dieIndex: number,
  rng: Rng = createRng(),
  manualValue?: number,
): ActionRollResult {
  if (result.rerollUsed) {
    throw new Error('reroll already used on this Action Roll');
  }
  if (!result.canReroll) {
    throw new Error('this Action Roll is not eligible for a re-roll');
  }
  if (
    dieIndex < 0 ||
    dieIndex >= result.diceRolled.length ||
    !Number.isInteger(dieIndex)
  ) {
    throw new Error(`dieIndex ${dieIndex} out of range`);
  }
  if (result.diceRolled[dieIndex] !== 1) {
    throw new Error(`die at index ${dieIndex} is not a 1`);
  }
  let next: number;
  if (manualValue !== undefined) {
    if (!Number.isInteger(manualValue) || manualValue < 1 || manualValue > 10) {
      throw new Error(`manual reroll value ${manualValue} out of range for D10`);
    }
    next = manualValue;
  } else {
    next = rng.nextInt(10);
  }
  const diceRolled = result.diceRolled.slice();
  diceRolled[dieIndex] = next;
  const sum = diceRolled.reduce((a, b) => a + b, 0);
  const total = sum + result.baseAttribute + result.skillLevel + result.modifier;
  const outcome = classifyOutcome(diceRolled, total, 10, result.difficulty);
  return {
    ...result,
    diceRolled,
    total,
    outcome,
    rerollUsed: true,
    canReroll: false,
    ppEligible: outcome === 'perfect-success' || outcome === 'total-failure',
  };
}

/**
 * PP awarded for a resolved Action Roll. Defaults from Rule §07:
 * Perfect Success → 10 PP, Total Failure → 5 PP. When LUC was spent,
 * the gain is multiplied by total dice rolled (`bonusMultiplier`).
 *
 * Returns 0 for plain success/failure outcomes. The caller adds the PP to
 * the relevant skill on the character record.
 */
export function ppGainForActionRoll(result: ActionRollResult): number {
  if (result.outcome === 'perfect-success') return 10 * result.bonusMultiplier;
  if (result.outcome === 'total-failure') return 5 * result.bonusMultiplier;
  return 0;
}
