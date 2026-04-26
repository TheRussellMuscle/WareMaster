import { z } from 'zod';
import { AbilityCodeSchema } from './attributes';
import { IdSchema } from './ids';

export const SkillCategorySchema = z.enum([
  'combat',
  'adventure-physical',
  'adventure-mental',
  'specialized',
]);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const SkillSchema = z.object({
  id: IdSchema,
  name: z.string(),
  category: SkillCategorySchema,
  attribute: AbilityCodeSchema.nullable(),
  source: z.string(),
  notes: z.string().optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const SkillsFileSchema = z.object({
  skills: z.array(SkillSchema),
});
export type SkillsFile = z.infer<typeof SkillsFileSchema>;
