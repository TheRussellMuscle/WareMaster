import { z } from 'zod';
import { IdSchema } from './ids';
import { ClassIdSchema } from './class';
import { GateSchema } from './technique';
import { CurrentSegmentSchema } from './action-log';

const AbilitiesSchema = z.object({
  SEN: z.number().int(),
  AGI: z.number().int(),
  WIL: z.number().int(),
  CON: z.number().int(),
  CHA: z.number().int(),
  LUC: z.number().int(),
});
export type Abilities = z.infer<typeof AbilitiesSchema>;

const SkillEntrySchema = z.object({
  skill_id: z.string(),
  level: z.number().int(),
  pp: z.number().int().default(0),
});
export type SkillEntry = z.infer<typeof SkillEntrySchema>;

const InventoryItemSchema = z.object({
  item_id: z.string(),
  quantity: z.number().int().default(1),
});

export const BastardSwordGripSchema = z.enum(['1H', '2H']);
export type BastardSwordGrip = z.infer<typeof BastardSwordGripSchema>;

const EquipmentSchema = z.object({
  weapons: z.array(z.string()).default([]),
  body_armor: z.string().nullable().default(null),
  head_armor: z.string().nullable().default(null),
  shield: z.string().nullable().default(null),
  other: z.array(InventoryItemSchema).default([]),
  /**
   * Bastard Sword grip choice when one is equipped (rule §06 §1).
   * `1H` → damage 1D10+3 / `2H` → damage 1D10+5; switching to 2H
   * suspends shield absorption (§06 §2.1). Defaults to `1H`.
   */
  bastard_sword_grip: BastardSwordGripSchema.default('1H'),
});
export type Equipment = z.infer<typeof EquipmentSchema>;

const ActiveEffectSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string().optional(),
  expires_at_segment: z.number().int().nullable(),
});

export const CharacterStatusSchema = z.enum([
  'fine',
  'heavy-physical',
  'heavy-mental',
  'incap-physical',
  'incap-mental',
  'dead',
  'insane',
]);
export type CharacterStatus = z.infer<typeof CharacterStatusSchema>;

const CharacterStateSchema = z.object({
  physical_damage: z.number().int().default(0),
  mental_damage: z.number().int().default(0),
  available_luc: z.number().int(),
  status: CharacterStatusSchema.default('fine'),
  /**
   * When true, `status` is treated as a manual WM override and the engine
   * does not auto-derive it from current damage. Defaults to false (auto).
   */
  status_override: z.boolean().default(false),
  active_effects: z.array(ActiveEffectSchema).default([]),
  /** Segment-index timestamp when recovery was last applied. */
  last_recovery_tick: z.number().int().default(0),
  /**
   * Current-Segment state set by the sheet's "Set IN/DN" action. Null when
   * not in a segment (or when End Segment was clicked). Persists across
   * reloads so the WM can leave mid-fight.
   */
  current_segment: CurrentSegmentSchema.nullable().default(null),
});
export type CharacterState = z.infer<typeof CharacterStateSchema>;

const CustomItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['weapon', 'armor', 'good']),
  price_golda: z.number().int().nonnegative().nullable().default(null),
  in_shop: z.boolean().default(true),
  is_unique: z.boolean().default(false),
  notes: z.string().default(''),
});
export type CustomItem = z.infer<typeof CustomItemSchema>;

export const SpiritualistOrderSchema = z.enum([
  'monk-votarist',
  'monk-militant',
  'invoker-evangelist',
  'invoker-denouncer',
]);
export type SpiritualistOrder = z.infer<typeof SpiritualistOrderSchema>;

export const TradesfolkProfessionSchema = z.enum([
  'thief',
  'bard',
  'alchemist',
  'doctor',
]);
export type TradesfolkProfession = z.infer<typeof TradesfolkProfessionSchema>;

export const CharacterSchema = z.object({
  schema_version: z.literal(1),
  id: IdSchema,
  campaign_id: IdSchema,
  name: z.string().min(1),
  age: z.number().int().nullable().default(null),

  // Identity (Playkit character sheet p. 79)
  gender: z.string().default(''),
  title: z.string().default(''),
  homeland: z.string().default(''),
  current_home: z.string().default(''),
  family_relationships: z.string().default(''),
  personality_notes: z.string().default(''),
  ryude_name: z.string().default(''),

  class_id: ClassIdSchema,
  word_caster_gate: GateSchema.optional(),
  spiritualist_order: SpiritualistOrderSchema.optional(),
  tradesfolk_profession: TradesfolkProfessionSchema.optional(),

  /** Word-Caster only: spent Memory Points (Wares-Stone capacity tracker). */
  memory_points_spent: z.number().int().default(0),
  /** Spiritualist only: free-text doctrine / restrictions (techniques sheet). */
  spiritualist_doctrine: z.string().default(''),
  spiritualist_restrictions: z.string().default(''),
  spiritualist_special_implements: z.string().default(''),

  skill_package_id: z.string(),
  equipment_package_id: z.string().nullable().default(null),

  /** Visual / persona modifier on top of CHA for First Impression Rolls (Playkit p. 79). */
  appearance_modifier: z.number().int().default(0),

  abilities: AbilitiesSchema,
  skills: z.array(SkillEntrySchema).default([]),
  techniques: z.array(z.string()).default([]),
  equipment: EquipmentSchema,

  custom_items: z.array(CustomItemSchema).default([]),

  golda: z.number().int().default(0),
  completion_bonus: z.number().int().default(0),
  luc_reserves: z.number().int().default(0),
  /** Initial LUC score acts as the cap on Available LUC. */
  initial_luc: z.number().int(),

  state: CharacterStateSchema,

  portrait_path: z.string().nullable().default(null),
  notes_path: z.string().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Character = z.infer<typeof CharacterSchema>;
