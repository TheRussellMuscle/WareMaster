import { z } from 'zod';

const NamedTableSchema = z.object({
  source: z.string(),
});

const RangeRowSchema = z.object({
  range: z.string(),
  description: z.string(),
});

const ProficiencyGainRowSchema = z.object({
  impact: z.string(),
  perfect_success: z.number().int(),
  total_failure: z.number().int(),
});

const CompletionBonusRowSchema = z.object({
  event: z.string(),
  bonus: z.union([z.number(), z.string()]),
});

const RollResultRowSchema = z.object({
  roll: z.string(),
  result: z.string(),
});

const RollLocationRowSchema = z.object({
  roll: z.string(),
  location: z.string(),
});

export const TablesFileSchema = z.object({
  difficulty_examples: NamedTableSchema.extend({
    ranges: z.array(RangeRowSchema),
  }),
  proficiency_gains: NamedTableSchema.extend({
    rows: z.array(ProficiencyGainRowSchema),
  }),
  completion_bonus_examples: NamedTableSchema.extend({
    entries: z.array(CompletionBonusRowSchema),
  }),
  skill_advancement_costs: NamedTableSchema.extend({
    raise_existing: z.string(),
    acquire_level_1_combat: z.union([z.number(), z.string()]),
    acquire_level_1_adventure: z.union([z.number(), z.string()]),
    acquire_level_1_specialized: z.string(),
  }),
  luc_reserves: NamedTableSchema.extend({
    conversion: z.string(),
    cap: z.string(),
  }),
  damage_recovery: NamedTableSchema.extend({
    light_damage: z.object({
      physical_per_day: z.number(),
      mental_per_hour: z.number(),
    }),
    heavy_damage: z.object({
      physical_days_per_point: z.string(),
      mental_hours_per_point: z.string(),
    }),
    notes: z.array(z.string()),
  }),
  attunement_penalty_table_a: NamedTableSchema.extend({
    rows: z.array(RollResultRowSchema),
  }),
  attunement_penalty_table_b: NamedTableSchema.extend({
    rows: z.array(RollResultRowSchema),
  }),
  operator_error_table_a_normal: NamedTableSchema.extend({
    rows: z.array(RollResultRowSchema),
  }),
  operator_error_table_b_normal: NamedTableSchema.extend({
    rows: z.array(RollResultRowSchema),
  }),
  operator_error_table_a_combat: NamedTableSchema.extend({
    rows: z.array(RollResultRowSchema),
  }),
  operator_error_table_b_combat: NamedTableSchema.extend({
    rows: z.array(RollResultRowSchema),
  }),
  standard_damage_penalty_table: NamedTableSchema.extend({
    trigger: z.string(),
    rows: z.array(RollResultRowSchema),
  }),
  critical_damage_table_a: NamedTableSchema.extend({
    trigger: z.string(),
    rows: z.array(RollResultRowSchema),
  }),
  critical_damage_table_b: NamedTableSchema.extend({
    rows: z.array(RollResultRowSchema),
  }),
  damage_location_table: NamedTableSchema.extend({
    rows: z.array(RollLocationRowSchema),
  }),
  ryude_repair_costs: NamedTableSchema.extend({
    durability_damage: z.object({
      time: z.string(),
      cost_golda: z.string(),
    }),
    ability_damage: z.object({
      time: z.string(),
      cost_golda: z.string(),
    }),
  }),
});
export type TablesFile = z.infer<typeof TablesFileSchema>;
