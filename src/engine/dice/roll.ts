/**
 * Core roll types and the raw `rollDice` primitive. Pure: no IO, no React.
 *
 * Rule §07 (`docs/rules/07-action-rolls.md`) defines the Action Roll —
 * `actionRoll()` in [./action-roll.ts](./action-roll.ts) layers Total
 * Failure / Perfect Success / re-roll-on-skill semantics on top of these
 * primitives.
 */

import type { Rng } from './rng';
import { createRng } from './rng';

export type RollOutcome =
  | 'success'
  | 'failure'
  | 'perfect-success'
  | 'total-failure';

export interface RollSpec {
  /** Total D10s (or D5s) to roll. For Action Rolls = 1 + lucDice. */
  dice: number;
  /** Die size. 10 for action / IN-DN / BN; 5 for D5 damage / 3D5 ability rolls. */
  faces: 10 | 5;
  /** Base value added once to the dice sum. `floor(score/3)` for ability-driven rolls. */
  baseAttribute: number;
  /** Skill level added once to the dice sum (when a relevant Skill applies). */
  skillLevel?: number;
  /** Flat numeric modifier (weapon BN mod, armor mod, etc.). */
  modifier?: number;
  /** Action Roll Difficulty. Optional: ability/save rolls without DC just report total. */
  difficulty?: number;
  /**
   * Weapon Critical Value (Rule §08). When provided, BN rolls test `dice ≥
   * critical_value AND total ≥ difficulty` ⇒ critical hit.
   */
  criticalValue?: number;
  /**
   * Substitute manual values for the auto-rolled dice (player rolled physical
   * dice — Rule §K manual-dice input). Length must equal `dice`. Each value
   * must be in `[1, faces]`.
   */
  manual?: number[];
}

export interface RawRollResult {
  diceRolled: number[];
  total: number;
}

/**
 * Roll dice and sum. Substitutes `manual` values when provided.
 *
 * Throws if `manual.length !== spec.dice` or any manual value is out of range,
 * so the UI surfaces the typo instead of silently producing wrong numbers.
 */
export function rollDice(spec: RollSpec, rng: Rng = createRng()): RawRollResult {
  if (spec.dice < 1 || !Number.isInteger(spec.dice)) {
    throw new Error(`dice must be a positive integer, got ${spec.dice}`);
  }

  const diceRolled: number[] = [];
  if (spec.manual !== undefined) {
    if (spec.manual.length !== spec.dice) {
      throw new Error(
        `manual dice count mismatch: expected ${spec.dice}, got ${spec.manual.length}`,
      );
    }
    for (const v of spec.manual) {
      if (!Number.isInteger(v) || v < 1 || v > spec.faces) {
        throw new Error(
          `manual die value ${v} out of range for D${spec.faces}`,
        );
      }
      diceRolled.push(v);
    }
  } else {
    for (let i = 0; i < spec.dice; i++) {
      diceRolled.push(rng.nextInt(spec.faces));
    }
  }

  const baseAttribute = spec.baseAttribute;
  const skillLevel = spec.skillLevel ?? 0;
  const modifier = spec.modifier ?? 0;
  const sum = diceRolled.reduce((a, b) => a + b, 0);
  return {
    diceRolled,
    total: sum + baseAttribute + skillLevel + modifier,
  };
}

/**
 * Detect Total Failure (every die = 1) and Perfect Success (every die = max
 * face AND total ≥ difficulty). Returns the canonical outcome flags. Caller
 * decides what to do with them — Action Rolls treat Total Failure as
 * overriding success; BN Rolls also flag IN-halving.
 */
export function classifyOutcome(
  diceRolled: number[],
  total: number,
  faces: number,
  difficulty: number | undefined,
): RollOutcome {
  const allOnes = diceRolled.length > 0 && diceRolled.every((d) => d === 1);
  const allMax = diceRolled.length > 0 && diceRolled.every((d) => d === faces);
  if (allOnes) return 'total-failure';
  if (difficulty !== undefined && allMax && total >= difficulty) {
    return 'perfect-success';
  }
  if (difficulty === undefined) return 'success';
  return total >= difficulty ? 'success' : 'failure';
}
