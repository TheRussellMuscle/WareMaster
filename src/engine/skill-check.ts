/**
 * Skill check engine — wraps `actionRoll` with the rules-specific bookkeeping
 * for Skills (Rule §07).
 *
 * Concerns:
 * - Resolve the governing ability for the skill (`floor(score/3)`).
 *   Specialized skills (Word-Casting, Numenism, Invocation, Drive) have
 *   `attribute: null`; the caller must supply `abilityOverride`.
 * - Determine the character's current Skill Level (default 0 if untrained;
 *   half-PP gain applies per rule §07).
 * - Compute PP awarded — Perfect Success / Total Failure rates configurable
 *   by `impact` (Minimal / Non-Critical / Tremendous) per
 *   `docs/data/tables.yaml::proficiency_gains`.
 * - LUC recovery: Perfect Success on a non-combat skill restores
 *   `+1 × bonusMultiplier` to Available LUC. Combat skills never restore.
 *   IN/DN and BN rolls (rule §08) bypass this wrapper entirely.
 */

import { actionRoll, type ActionRollResult } from './dice/action-roll';
import type { Rng } from './dice/rng';
import { baseValue, type AbilityCode } from '@/domain/attributes';
import type { Abilities, Character, SkillEntry } from '@/domain/character';
import type { Skill } from '@/domain/skill';

export type SkillImpact = 'minimal' | 'non-critical' | 'tremendous';

const PP_GAINS: Record<
  SkillImpact,
  { perfectSuccess: number; totalFailure: number }
> = {
  minimal: { perfectSuccess: 5, totalFailure: 1 },
  'non-critical': { perfectSuccess: 10, totalFailure: 5 },
  tremendous: { perfectSuccess: 20, totalFailure: 10 },
};

export interface SkillCheckInput {
  skill: Skill;
  abilities: Abilities;
  /** Character's current entry for this skill, if any (level + accrued PP). */
  skillEntry?: SkillEntry;
  /** Required when `skill.attribute === null` (specialized skills). */
  abilityOverride?: AbilityCode;
  difficulty?: number;
  modifier?: number;
  lucDice?: number;
  manual?: number[];
  impact?: SkillImpact;
}

export interface SkillCheckResult {
  roll: ActionRollResult;
  /** PP awarded for this roll — already halved if `untrained` is true. */
  ppGain: number;
  untrained: boolean;
  lucRestored: number;
  /** True when this skill is in `combat` category — for log labeling and LUC rule. */
  isCombatSkill: boolean;
}

export function skillCheck(
  input: SkillCheckInput,
  rng?: Rng,
): SkillCheckResult {
  const ability =
    input.abilityOverride ?? (input.skill.attribute as AbilityCode | null);
  if (ability == null) {
    throw new Error(
      `Skill "${input.skill.id}" has no governing ability; pass abilityOverride.`,
    );
  }
  if (ability === 'LUC') {
    // Skill checks never use LUC as a Base value (rule §04). Caller probably
    // wants a LUC Roll instead — see actionRoll caller paths.
    throw new Error(
      `LUC has no Base value; use a LUC Roll, not a Skill Check.`,
    );
  }

  const score = input.abilities[ability];
  const base = baseValue(score);
  const skillLevel = input.skillEntry?.level ?? 0;
  const untrained = input.skillEntry == null;

  const roll = actionRoll(
    {
      baseAttribute: base,
      skillLevel,
      modifier: input.modifier,
      difficulty: input.difficulty,
      lucDice: input.lucDice,
      manual: input.manual,
    },
    rng,
  );

  const impact = input.impact ?? 'non-critical';
  const gains = PP_GAINS[impact];
  let ppGain = 0;
  if (roll.outcome === 'perfect-success') {
    ppGain = gains.perfectSuccess * roll.bonusMultiplier;
  } else if (roll.outcome === 'total-failure') {
    ppGain = gains.totalFailure * roll.bonusMultiplier;
  }
  // Rule §07: untrained Skills earn half PP.
  if (untrained && ppGain > 0) {
    ppGain = Math.floor(ppGain / 2);
  }

  const isCombatSkill = input.skill.category === 'combat';
  const lucRestored =
    !isCombatSkill && roll.outcome === 'perfect-success'
      ? 1 * roll.bonusMultiplier
      : 0;

  return { roll, ppGain, untrained, lucRestored, isCombatSkill };
}

/**
 * Apply the PP gain (and untrained-skill creation) to a character's skill list.
 * Pure — returns the new list. Caller persists.
 *
 * If the skill is not yet on the character, it is added at Level 0 with the
 * half-PP gain (rule §07: "they gain it at Level 0 and earn half PP").
 */
export function applyPpGain(
  character: Character,
  skillId: string,
  ppGain: number,
): SkillEntry[] {
  if (ppGain <= 0) return character.skills;
  const idx = character.skills.findIndex((s) => s.skill_id === skillId);
  if (idx === -1) {
    return [
      ...character.skills,
      { skill_id: skillId, level: 0, pp: ppGain },
    ];
  }
  const next = character.skills.slice();
  const cur = next[idx];
  next[idx] = { ...cur, pp: cur.pp + ppGain };
  return next;
}

/** Apply LUC recovery to the character state, capped at `initial_luc`. */
export function applyLucRestore(
  character: Character,
  lucRestored: number,
): number {
  if (lucRestored <= 0) return character.state.available_luc;
  return Math.min(
    character.initial_luc,
    character.state.available_luc + lucRestored,
  );
}

/**
 * Deduct spent LUC from `available_luc`, floored at 0. Caller is responsible
 * for ordering when a single roll both spends LUC (added dice) and restores
 * it (Perfect Success on a non-combat skill): spend first, restore second so
 * the cap math is consistent.
 */
export function applyLucSpend(
  character: Character,
  lucSpent: number,
): number {
  if (lucSpent <= 0) return character.state.available_luc;
  return Math.max(0, character.state.available_luc - lucSpent);
}
