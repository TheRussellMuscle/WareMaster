import { z } from 'zod';
import { IdSchema } from './ids';
import { MonsterRankSchema } from './monster';
import { CurrentSegmentSchema } from './action-log';

/**
 * MonsterInstance — a named, tracked monster spawned into a campaign from
 * a template (bundled bestiary entry, vault template, or campaign-scoped
 * override). Heavy stat data lives on the resolved template; this schema
 * captures only the per-instance state and overrides (Phase 4 / PLAN.md §D).
 */
const MonsterInstanceOverridesSchema = z.object({
  rank: MonsterRankSchema.optional(),
  damage_value: z.union([z.string(), z.number()]).optional(),
  total_absorption: z.union([z.string(), z.number()]).nullable().optional(),
  notes: z.string().optional(),
});

const MonsterInstanceStatusSchema = z.enum([
  'fine',
  'wounded',
  'incapacitated',
  'dead',
]);
export type MonsterInstanceStatus = z.infer<typeof MonsterInstanceStatusSchema>;

const ActiveEffectSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string().optional(),
  expires_at_segment: z.number().int().nullable(),
});

const MonsterInstanceStateSchema = z.object({
  current_physical_damage: z.number().int().default(0),
  current_mental_damage: z.number().int().default(0),
  status: MonsterInstanceStatusSchema.default('fine'),
  status_override: z.boolean().default(false),
  active_effects: z.array(ActiveEffectSchema).default([]),
  last_recovery_tick: z.number().int().default(0),
  location: z.string().default(''),
  segment: CurrentSegmentSchema.nullable().default(null),
  current_segment_index: z.number().int().default(0),
});
export type MonsterInstanceState = z.infer<typeof MonsterInstanceStateSchema>;

export const MonsterInstanceSchema = z.object({
  schema_version: z.literal(1),
  id: IdSchema,
  campaign_id: IdSchema,
  /** kebab id (bundled) or `tpl_mon_<ULID>` (user-created) — lookup target. */
  template_id: z.string(),
  name: z.string().min(1),
  overrides: MonsterInstanceOverridesSchema.default({}),
  state: MonsterInstanceStateSchema.default({
    current_physical_damage: 0,
    current_mental_damage: 0,
    status: 'fine',
    status_override: false,
    active_effects: [],
    last_recovery_tick: 0,
    location: '',
    segment: null,
    current_segment_index: 0,
  }),
  portrait_path: z.string().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MonsterInstance = z.infer<typeof MonsterInstanceSchema>;
