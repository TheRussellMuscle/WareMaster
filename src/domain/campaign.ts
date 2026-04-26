import { z } from 'zod';
import { IdSchema } from './ids';

/**
 * Campaign clock: integer count of in-fiction Segments since the campaign
 * began. Display layer formats this into native units (Etch / Day / Round)
 * via the helpers in src/lib/wares-units.ts.
 */
export const CampaignClockSchema = z.object({
  segment_index: z.number().int().nonnegative(),
  real_world_anchor: z.string(),
});
export type CampaignClock = z.infer<typeof CampaignClockSchema>;

export const CampaignSchema = z.object({
  schema_version: z.literal(1),
  id: IdSchema,
  name: z.string().min(1),
  wm: z.string().default(''),
  description: z.string().default(''),
  setting_region: z.string().nullable().default(null),
  clock: CampaignClockSchema,
  dir_name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignDraftSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  wm: z.string().default(''),
  description: z.string().default(''),
  setting_region: z.string().nullable().default(null),
});
export type CampaignDraft = z.infer<typeof CampaignDraftSchema>;
