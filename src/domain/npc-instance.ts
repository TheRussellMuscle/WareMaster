import { z } from 'zod';
import { IdSchema } from './ids';
import { CurrentSegmentSchema } from './action-log';

/**
 * NpcInstance — a tracked, named NPC spawned into a campaign from a
 * template. Per-instance overrides are loose (`Record<string, unknown>`)
 * since the override surface differs across the three archetypes; type-aware
 * editing happens in the NPC editor and is validated against the resolved
 * template at runtime (Phase 4).
 */
const NpcInstanceStatusSchema = z.enum([
  'fine',
  'wounded',
  'incapacitated',
  'dead',
]);
export type NpcInstanceStatus = z.infer<typeof NpcInstanceStatusSchema>;

const ActiveEffectSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string().optional(),
  expires_at_segment: z.number().int().nullable(),
});

const NpcInstanceStateSchema = z.object({
  current_physical_damage: z.number().int().default(0),
  current_mental_damage: z.number().int().default(0),
  status: NpcInstanceStatusSchema.default('fine'),
  status_override: z.boolean().default(false),
  active_effects: z.array(ActiveEffectSchema).default([]),
  last_recovery_tick: z.number().int().default(0),
  location: z.string().default(''),
  segment: CurrentSegmentSchema.nullable().default(null),
  current_segment_index: z.number().int().default(0),
  // Full-Character archetype only — synthesized character sheet uses these.
  available_luc: z.number().int().nonnegative().optional(),
  completion_bonus_pp: z.number().int().nonnegative().optional(),
});
export type NpcInstanceState = z.infer<typeof NpcInstanceStateSchema>;

export const NpcInstanceSchema = z.object({
  schema_version: z.literal(1),
  id: IdSchema,
  campaign_id: IdSchema,
  template_id: z.string(),
  name: z.string().min(1),
  /** Per-instance field overrides. Validated against resolved template at edit time. */
  overrides: z.record(z.string(), z.unknown()).default({}),
  state: NpcInstanceStateSchema.default({
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
  notes_path: z.string().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NpcInstance = z.infer<typeof NpcInstanceSchema>;
