import { z } from 'zod';
import { IdSchema } from './ids';

export const DisciplineSchema = z.enum([
  'word-casting',
  'numetic-arts',
  'invocation',
]);
export type Discipline = z.infer<typeof DisciplineSchema>;

export const GateSchema = z.enum([
  'gateless',
  'sun',
  'metal',
  'fire',
  'wood',
  'moon',
  'wind',
  'water',
  'earth',
]);
export type Gate = z.infer<typeof GateSchema>;

export const InvocationSubCategorySchema = z.enum(['fingers', 'palms']);

/**
 * A single technique entry. The schema is a superset across word-casting /
 * numetic-arts / invocation since the YAML keys overlap heavily.
 */
export const TechniqueSchema = z.object({
  id: IdSchema,
  name: z.string(),
  romanization: z.string().optional(),
  source: z.string(),
  gate: GateSchema.optional(),
  sub_category: InvocationSubCategorySchema.optional(),
  level: z.number().int(),
  segments_required: z.number().int(),
  requisites: z.string().nullable().optional(),
  effect: z.string(),
  range: z.string(),
  target: z.string(),
  duration: z.string(),
  save: z.string().nullable().optional(),
  description: z.string(),
  notes: z.string().optional(),
});
export type Technique = z.infer<typeof TechniqueSchema>;

/** A whole technique file: top-level discipline + (optional) gate + array. */
export const TechniqueFileSchema = z.object({
  discipline: DisciplineSchema,
  gate: GateSchema.optional(),
  gate_description: z.string().optional(),
  techniques: z.array(TechniqueSchema),
});
export type TechniqueFile = z.infer<typeof TechniqueFileSchema>;
