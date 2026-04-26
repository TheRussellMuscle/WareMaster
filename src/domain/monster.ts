import { z } from 'zod';
import { IdSchema } from './ids';

export const MonsterRankSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export type MonsterRank = z.infer<typeof MonsterRankSchema>;

export const MonsterReactionSchema = z.enum([
  'Attack',
  'Flee or Attack',
  'Ignore or Flee',
  'Behavior depends on commands',
]);
export type MonsterReaction = z.infer<typeof MonsterReactionSchema>;

/**
 * Bestiary stat block. Bracketed-vs-Ryude variants are stored as separate
 * fields (suffix `_vs_ryude`). Many fields are optional/null because the
 * Playkit's stat blocks are inconsistent (e.g. skeletons have null CON).
 *
 * Source: docs/data/beastiary.yaml; rule §15 lines 41-52.
 */
export const MonsterTemplateSchema = z.object({
  id: IdSchema,
  name: z.string(),
  rank: MonsterRankSchema,
  type: z.string().optional(),
  source: z.string(),

  // Ability scores vs characters
  base_sen: z.number().nullable().optional(),
  base_agi: z.number().nullable().optional(),
  base_con: z.number().nullable().optional(),
  base_wil: z.number().nullable().optional(),
  base_cha: z.number().nullable().optional(),
  base_con_notes: z.string().optional(),

  // Ability scores vs Ryude (the bracketed values in the Playkit)
  base_sen_vs_ryude: z.number().nullable().optional(),
  base_agi_vs_ryude: z.number().nullable().optional(),
  base_con_vs_ryude: z.number().nullable().optional(),
  base_wil_vs_ryude: z.number().nullable().optional(),
  cha_modifier_vs_ryude: z.number().nullable().optional(),

  physical_durability_notes: z.string().optional(),
  mental_durability_notes: z.string().optional(),

  reaction: MonsterReactionSchema,
  anti_luc: z.string().optional(),

  damage_value: z.union([z.string(), z.number()]),
  damage_value_vs_ryude: z.union([z.string(), z.number()]).optional(),
  damage_value_multiplier_vs_ryude: z.number().optional(),
  damage_value_vs_ryude_multiplier: z.number().optional(),

  total_absorption: z.union([z.string(), z.number()]).nullable().optional(),
  total_absorption_vs_ryude: z
    .union([z.string(), z.number()])
    .nullable()
    .optional(),

  movement_speed: z.number(),
  sprint_speed: z.number().optional(),

  intelligence: z.enum(['None', 'Low', 'High']),
  primary_habitat: z.string(),

  encounter_rate: z.number(),
  encounter_rate_vs_ryude: z.number().optional(),
  encounter_rate_notes: z.string().optional(),

  number_encountered: z.union([z.string(), z.number()]),
  description: z.string(),
});
export type MonsterTemplate = z.infer<typeof MonsterTemplateSchema>;

export const BestiaryFileSchema = z.object({
  monsters: z.array(MonsterTemplateSchema),
});
export type BestiaryFile = z.infer<typeof BestiaryFileSchema>;
