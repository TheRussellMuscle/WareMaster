import { z } from 'zod';
import { IdSchema } from './ids';
import { RyudeTypeSchema } from './ryude';
import { CurrentSegmentSchema } from './action-log';

/**
 * RyudeInstance — a tracked, named Ryude (Footman / Courser / Maledictor)
 * spawned into a campaign from a template. Tracks per-unit Durability,
 * attribute damage, attunement state, and operator assignment (Phase 4).
 */
const RyudeInstanceOverridesSchema = z.object({
  durability: z.number().int().optional(),
  type: RyudeTypeSchema.optional(),
  notes: z.string().optional(),
});

const RyudeAttunementStateSchema = z.enum([
  'unattuned',
  'attuning',
  'attuned',
  'rejected',
]);
export type RyudeAttunementState = z.infer<typeof RyudeAttunementStateSchema>;

const ActiveEffectSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string().optional(),
  expires_at_segment: z.number().int().nullable(),
});
export type ActiveEffect = z.infer<typeof ActiveEffectSchema>;

const RepairTicketSchema = z.object({
  id: z.string(),
  description: z.string(),
  segment_started: z.number().int(),
  segments_remaining: z.number().int(),
});

const RyudeAttributeDamageSchema = z.object({
  spe: z.number().int().default(0),
  pow: z.number().int().default(0),
  arm: z.number().int().default(0),
  bal: z.number().int().default(0),
});

const RyudeInstanceStateSchema = z.object({
  current_unit_durability: z.number().int(),
  /** Maledictor only — separate mental HP pool (Rule §14:229). */
  current_ryude_mind_durability: z.number().int().optional(),
  /** Accumulated Base Drive reduction from attunement penalties (Rule §14:50-57). */
  drive_reduction: z.number().int().default(0),
  /** Consecutive dashing segments used this sprint; resets to 5 on rest (Rule §14:22). */
  dashing_segments_remaining: z.number().int().default(5),
  attribute_damage: RyudeAttributeDamageSchema.default({
    spe: 0,
    pow: 0,
    arm: 0,
    bal: 0,
  }),
  attunement_state: RyudeAttunementStateSchema.default('unattuned'),
  /** IDs of catalog weapons/armor + custom Ryude items currently equipped on this instance. */
  equipped_item_ids: z.array(z.string()).default([]),
  repair_queue: z.array(RepairTicketSchema).default([]),
  active_effects: z.array(ActiveEffectSchema).default([]),
  last_recovery_tick: z.number().int().default(0),
  location: z.string().default(''),
  segment: CurrentSegmentSchema.nullable().default(null),
  current_segment_index: z.number().int().default(0),
});
export type RyudeInstanceState = z.infer<typeof RyudeInstanceStateSchema>;

const RyudeOperatorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('character'), id: IdSchema }),
  z.object({ kind: z.literal('npc'), id: IdSchema }),
]);
export type RyudeOperator = z.infer<typeof RyudeOperatorSchema>;

export const RyudeInstanceSchema = z.object({
  schema_version: z.literal(1),
  id: IdSchema,
  campaign_id: IdSchema,
  template_id: z.string(),
  name: z.string().min(1),
  equipped_operator: RyudeOperatorSchema.nullable().default(null),
  overrides: RyudeInstanceOverridesSchema.default({}),
  state: RyudeInstanceStateSchema,
  portrait_path: z.string().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RyudeInstance = z.infer<typeof RyudeInstanceSchema>;
