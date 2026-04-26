import { z } from 'zod';

/**
 * The six Ability Scores (rule §04). LUC is rolled as a pool, not a Base
 * value — the others map to Base values via floor(score / 3).
 */
export const ABILITY_CODES = ['SEN', 'AGI', 'WIL', 'CON', 'CHA', 'LUC'] as const;
export const AbilityCodeSchema = z.enum(ABILITY_CODES);
export type AbilityCode = z.infer<typeof AbilityCodeSchema>;

/** Compute the Base Attribute value from an Ability Score. LUC has no Base. */
export function baseValue(score: number): number {
  return Math.floor(score / 3);
}
