import { z } from 'zod';
import { IdSchema } from './ids';

export const ClassIdSchema = z.enum([
  'warrior',
  'word-caster',
  'spiritualist',
  'tradesfolk',
]);
export type ClassId = z.infer<typeof ClassIdSchema>;

const PerkSchema = z.object({
  id: IdSchema,
  name: z.string(),
  description: z.string(),
});

const SkillPackageEntrySchema = z.object({
  name: z.string(),
  level: z.number().int(),
});

const SkillPackageOptionSchema = z.object({
  description: z.string(),
});

const SkillPackageSchema = z.object({
  id: IdSchema,
  name: z.string(),
  notes: z.string().optional(),
  skills: z.array(SkillPackageEntrySchema).optional(),
  optional_choose_one: z.array(SkillPackageOptionSchema).optional(),
  bonus_golda: z.number().int().optional(),
});

const EquipmentPackageSchema = z.object({
  id: IdSchema,
  name: z.string(),
  items: z.array(z.string()),
  total_golda: z.number().optional(),
  cost: z.string().optional(),
  notes: z.string().optional(),
});

const ProfessionSchema = z.object({
  id: IdSchema,
  name: z.string(),
  perks: z.array(PerkSchema),
  skill_package: z.array(SkillPackageEntrySchema).optional(),
  bonus_golda: z.number().int().optional(),
  equipment_package: z
    .object({
      items: z.array(z.string()),
      cost: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

const GatePairedSkillSchema = z.object({
  paired_skill: z.string(),
});

export const ClassSchema = z.object({
  id: ClassIdSchema,
  name: z.string(),
  source: z.string(),
  description: z.string(),
  perks: z.array(PerkSchema),
  professions: z.array(ProfessionSchema).optional(),
  gates_with_paired_skills: z
    .record(z.string(), GatePairedSkillSchema)
    .optional(),
  skill_packages: z.array(SkillPackageSchema).optional(),
  equipment_packages: z.array(EquipmentPackageSchema).optional(),
});
export type Class = z.infer<typeof ClassSchema>;

export const ClassesFileSchema = z.object({
  classes: z.array(ClassSchema),
});
export type ClassesFile = z.infer<typeof ClassesFileSchema>;
