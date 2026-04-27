import { z } from 'zod';
import { IdSchema } from './ids';
import { MonsterTemplateSchema } from './monster';
import { CharacterSchema } from './character';

/**
 * NPC templates (Phase 4). Three archetypes via discriminated union:
 *
 * - **beast** — uses the full Monster stat block (e.g. a named guard dog,
 *   a bandit's wolf companion). Reuses MonsterTemplateSchema's fields so
 *   the engine can roll attacks against them directly.
 * - **simple** — lightweight stat block (merchant, bystander) — just enough
 *   to roll a First-Impression / reaction check against. CHA modifier and
 *   a few notable skills, no full ability spread.
 * - **full-character** — a named NPC with a full character sheet (a rival,
 *   an ally PC reskinned). Reuses the Character schema minus per-instance
 *   fields (campaign_id, state, notes_path are populated on the instance).
 */
export const NpcArchetypeSchema = z.enum([
  'beast',
  'simple',
  'full-character',
]);
export type NpcArchetype = z.infer<typeof NpcArchetypeSchema>;

export const NpcRoleSchema = z.enum([
  'merchant',
  'courtier',
  'bystander',
  'envoy',
  'retainer',
  'laborer',
  'other',
]);
export type NpcRole = z.infer<typeof NpcRoleSchema>;

const BeastNpcSchema = MonsterTemplateSchema.extend({
  archetype: z.literal('beast'),
  /** Free-text behavioral notes (friendly / hostile / skittish / loyal). */
  disposition: z.string().default(''),
});
export type BeastNpc = z.infer<typeof BeastNpcSchema>;

const NotableSkillSchema = z.object({
  skill_id: z.string(),
  level: z.number().int(),
});

const SimpleNpcSchema = z.object({
  archetype: z.literal('simple'),
  id: IdSchema,
  name: z.string().min(1),
  source: z.string().default('user'),
  role: NpcRoleSchema,
  /** CHA modifier for First Impression Rolls / reactions. Defaults to 0. */
  cha_modifier: z.number().int().default(0),
  /** Optional Reaction Value if the WM has stat'd one out. */
  reaction_value: z.number().int().nullable().default(null),
  notable_skills: z.array(NotableSkillSchema).default([]),
  description: z.string().default(''),
});
export type SimpleNpc = z.infer<typeof SimpleNpcSchema>;

/**
 * FullCharacterNpc reuses CharacterSchema minus the campaign-scoped fields
 * that only make sense on a Character instance. The omitted fields appear on
 * the corresponding NpcInstance instead.
 */
const FullCharacterNpcSchema = CharacterSchema.omit({
  campaign_id: true,
  state: true,
  notes_path: true,
}).extend({
  archetype: z.literal('full-character'),
});
export type FullCharacterNpc = z.infer<typeof FullCharacterNpcSchema>;

export const NpcTemplateSchema = z.discriminatedUnion('archetype', [
  BeastNpcSchema,
  SimpleNpcSchema,
  FullCharacterNpcSchema,
]);
export type NpcTemplate = z.infer<typeof NpcTemplateSchema>;
