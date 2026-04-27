import { z } from 'zod';
import { IdSchema } from './ids';

export const RyudeTypeSchema = z.enum(['Footman', 'Courser', 'Maledictor']);
export type RyudeType = z.infer<typeof RyudeTypeSchema>;

const RyudeAttributesSchema = z.object({
  spe: z.number().int(),
  pow: z.number().int(),
  arm: z.number().int(),
  bal: z.number().int(),
});

const PersonaRankSchema = z.string();

export const RyudeTemplateSchema = z.object({
  id: IdSchema,
  name: z.string(),
  source: z.string(),
  type: RyudeTypeSchema,
  attributes: RyudeAttributesSchema,
  durability: z.number().int(),
  required_drive: z.number().int(),
  persona_rank: PersonaRankSchema,
  attunement_value: z.number().int(),
  ryude_rank: z.string(),
  ego: z.number().int().nullable().optional(),
  numetic_modifier: z.number().int().optional(),
  binding_modifier: z.number().int().optional(),
  ryude_mind_durability: z.number().int().optional(),
  equipment: z.array(z.string()),
  description: z.string(),
  courser_perks: z.array(z.string()).optional(),
  /** Typed flag: Courser grants operator immunity to WC Techniques Lv≤3 (Rule §14:233). */
  courser_wc_immunity: z.boolean().optional(),
  /** Ryude absorbs this many liets of fall damage for its operator (Rule §14:23). */
  fall_endurance: z.number().int().optional(),
  notes: z.array(z.string()).optional(),
});
export type RyudeTemplate = z.infer<typeof RyudeTemplateSchema>;

export const RyudeUnitsFileSchema = z.object({
  ryude_units: z.array(RyudeTemplateSchema),
});
export type RyudeUnitsFile = z.infer<typeof RyudeUnitsFileSchema>;
