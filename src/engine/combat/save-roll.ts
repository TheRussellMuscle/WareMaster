/**
 * Save Roll convenience wrapper — Rules §08 / §09.
 *
 * "Save throws" are not a separate game mechanic in Wares Blade; they are
 * Action Rolls of a specific Ability + Difficulty triggered by a damage
 * stage transition or a Heavy-Damage state requiring an action.
 *
 * Cases this wrapper covers:
 *   - `heavy-crossing-wil`   — WIL Roll, Difficulty = damage taken
 *   - `heavy-crossing-con`   — CON Roll, Difficulty = damage taken (Physical only)
 *   - `heavy-state-action`   — WIL Roll, Difficulty = `accumulated − Durability`
 *   - `incap-revive`         — AGI Roll (Medicine), Difficulty = damage on target
 *   - `luc-roll`             — pure-luck LUC Roll
 *   - `custom`               — caller supplies ability + difficulty
 */

import { actionRoll, type ActionRollResult } from '../dice/action-roll';
import type { Rng } from '../dice/rng';
import { baseValue, type AbilityCode } from '@/domain/attributes';
import type { Abilities } from '@/domain/character';

export type SaveKind =
  | 'heavy-crossing-wil'
  | 'heavy-crossing-con'
  | 'heavy-state-action'
  | 'incap-revive'
  | 'luc-roll'
  | 'custom';

export interface SaveRollInput {
  kind: SaveKind;
  abilities: Abilities;
  /** Required for `custom`. Otherwise inferred from `kind`. */
  ability?: AbilityCode;
  difficulty: number;
  /** Optional skill level (e.g. Medicine for `incap-revive`). */
  skillLevel?: number;
  modifier?: number;
  lucDice?: number;
  manual?: number[];
}

export interface SaveRollResult {
  kind: SaveKind;
  ability: AbilityCode;
  roll: ActionRollResult;
  /** Convenience: passed iff outcome is success or perfect-success. */
  passed: boolean;
}

const KIND_TO_ABILITY: Record<Exclude<SaveKind, 'custom' | 'luc-roll'>, AbilityCode> = {
  'heavy-crossing-wil': 'WIL',
  'heavy-crossing-con': 'CON',
  'heavy-state-action': 'WIL',
  'incap-revive': 'AGI',
};

export function saveRoll(input: SaveRollInput, rng?: Rng): SaveRollResult {
  let ability: AbilityCode;
  if (input.kind === 'custom') {
    if (!input.ability) {
      throw new Error('custom save-roll requires an `ability`');
    }
    ability = input.ability;
  } else if (input.kind === 'luc-roll') {
    ability = 'LUC';
  } else {
    ability = KIND_TO_ABILITY[input.kind];
  }

  // LUC Rolls work differently: roll N D10s where N = Available LUC spent (lucDice),
  // sum them. There is no Base value (rule §07). For our wrapper, the caller has
  // already decided how many dice to roll via `lucDice` (with a minimum of 1).
  if (ability === 'LUC') {
    const dice = Math.max(1, input.lucDice ?? 1);
    const roll = actionRoll(
      {
        baseAttribute: 0,
        difficulty: input.difficulty,
        // For a LUC Roll, ALL dice are LUC dice. lucDice in the action-roll spec
        // counts dice ABOVE the baseline 1; pass `dice - 1`.
        lucDice: dice - 1,
        manual: input.manual,
      },
      rng,
    );
    return {
      kind: input.kind,
      ability,
      roll,
      passed: roll.outcome === 'success' || roll.outcome === 'perfect-success',
    };
  }

  const score = input.abilities[ability];
  const base = baseValue(score);
  const roll = actionRoll(
    {
      baseAttribute: base,
      skillLevel: input.skillLevel,
      modifier: input.modifier,
      difficulty: input.difficulty,
      lucDice: input.lucDice,
      manual: input.manual,
    },
    rng,
  );
  return {
    kind: input.kind,
    ability,
    roll,
    passed: roll.outcome === 'success' || roll.outcome === 'perfect-success',
  };
}

/**
 * Suggested save kind given a character's current damage state. Returns
 * `null` when no forced save applies (character is in Light damage or fully
 * healthy). Callers can pre-fill the Save Throw modal with this.
 */
export function suggestedSave(args: {
  physicalDamage: number;
  mentalDamage: number;
  physicalDurability: number;
  mentalDurability: number;
}): { kind: SaveKind; ability: AbilityCode; difficulty: number } | null {
  const overPhys = args.physicalDamage - args.physicalDurability;
  const overMental = args.mentalDamage - args.mentalDurability;
  if (overPhys > 0 && overPhys > overMental) {
    return {
      kind: 'heavy-state-action',
      ability: 'WIL',
      difficulty: overPhys,
    };
  }
  if (overMental > 0) {
    return {
      kind: 'heavy-state-action',
      ability: 'WIL',
      difficulty: overMental,
    };
  }
  return null;
}
