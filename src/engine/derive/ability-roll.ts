/**
 * Ability roll helpers for character creation. Pure: no IO, no React.
 *
 * Source: Playkit Chapter 3 (p. 14, "Step 1 - Roll Abilities") and Chapter 4
 * ("Attributes and Derived Values").
 *
 * Rule §03 §1.1 — Roll 3D5 once per ability (SEN, AGI, WIL, CON, CHA, LUC).
 * If three or more scores end up below 8, OR any single score is above 13,
 * the player MUST re-roll all six.
 */

import type { Abilities } from '@/domain/character';
import { ABILITY_CODES, type AbilityCode } from '@/domain/attributes';
import type { Class } from '@/domain/class';
import type { Gate } from '@/domain/technique';

/** Roll one D5 (1..5). */
export function rollD5(): number {
  return Math.floor(Math.random() * 5) + 1;
}

/** Roll 3D5 (3..15). */
export function roll3D5(): number {
  return rollD5() + rollD5() + rollD5();
}

/** Roll 3D5 for each of the six abilities, in canonical order. */
export function rollSixAbilities(): Abilities {
  return {
    SEN: roll3D5(),
    AGI: roll3D5(),
    WIL: roll3D5(),
    CON: roll3D5(),
    CHA: roll3D5(),
    LUC: roll3D5(),
  };
}

export type AbilityValidation =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Per rule §03 §1.1, a starting ability spread is invalid when:
 *   - 3 or more scores are below 8, OR
 *   - any single score is above 13.
 * In that case the player must re-roll all six.
 */
export function validateAbilityRoll(abilities: Abilities): AbilityValidation {
  const scores = ABILITY_CODES.map((code) => abilities[code]);
  const lowCount = scores.filter((n) => n < 8).length;
  const highScore = scores.find((n) => n > 13);

  if (lowCount >= 3 && highScore != null) {
    return {
      ok: false,
      reason: `Three scores are below 8 and one is above 13 — re-roll all six (Rule §03 §1.1).`,
    };
  }
  if (lowCount >= 3) {
    return {
      ok: false,
      reason: `Three or more scores are below 8 — re-roll all six (Rule §03 §1.1).`,
    };
  }
  if (highScore != null) {
    return {
      ok: false,
      reason: `One score (${highScore}) is above 13 — re-roll all six (Rule §03 §1.1).`,
    };
  }
  return { ok: true };
}

/**
 * Roll a fresh six-ability spread that satisfies the rule §03 §1.1 validation.
 * Caps attempts to avoid pathological loops on malformed RNG.
 */
export function rollValidSixAbilities(maxAttempts = 50): Abilities {
  for (let i = 0; i < maxAttempts; i++) {
    const a = rollSixAbilities();
    if (validateAbilityRoll(a).ok) return a;
  }
  // Fallback: deterministic safe spread (all 9s) — should never hit in practice.
  return { SEN: 9, AGI: 9, WIL: 9, CON: 9, CHA: 9, LUC: 9 };
}

/** Re-roll only the abilities NOT in `keep`. Used for "lock and re-roll". */
export function rerollExcept(
  abilities: Abilities,
  keep: ReadonlySet<AbilityCode>,
): Abilities {
  const next = { ...abilities };
  for (const code of ABILITY_CODES) {
    if (!keep.has(code)) next[code] = roll3D5();
  }
  return next;
}

/**
 * Look up the paired knowledge skill for a Word-Caster's chosen Gate.
 * Returns the display name from classes.yaml (e.g. "Astronomy"), which the
 * caller resolves to a skill_id via the skills catalog.
 *
 * Source: rule §03 §5 + §11 §5; data: classes.yaml
 * `gates_with_paired_skills`.
 */
export function pairedSkillForGate(
  gate: Gate,
  cls: Class,
): { gate: Gate; pairedSkillName: string } | null {
  const map = cls.gates_with_paired_skills;
  if (!map) return null;
  const entry = map[gate];
  if (!entry) return null;
  return { gate, pairedSkillName: entry.paired_skill };
}
