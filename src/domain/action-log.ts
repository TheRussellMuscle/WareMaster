import { z } from 'zod';

/**
 * Campaign-wide action log. Every roll made via the sheet Action Panel
 * appends an entry here, regardless of which character performed it. The
 * file lives at `campaigns/<dir>/action-log.yaml` and is the single source
 * of truth for "what happened during this campaign" until the Phase 6 event
 * log + snapshot system arrives.
 *
 * Each entry snapshots `character_name` at write time so a renamed or
 * deleted character still shows up correctly in the historical log.
 */

export const ActionLogKindSchema = z.enum([
  'in-dn',
  'ability',
  'attack',
  'save',
  'skill',
]);
export type ActionLogKind = z.infer<typeof ActionLogKindSchema>;

export const ActionOutcomeSchema = z.enum([
  'success',
  'failure',
  'perfect-success',
  'total-failure',
]);
export type ActionOutcome = z.infer<typeof ActionOutcomeSchema>;

export const ActionLogEntrySchema = z.object({
  id: z.string(),
  timestamp_real: z.string(),
  /** Character that performed the roll. Empty when an NPC/monster acts (Phase 4). */
  character_id: z.string(),
  /** Character name snapshotted at write time — survives renames/deletes. */
  character_name: z.string(),
  kind: ActionLogKindSchema,
  /** Human-readable summary, e.g. "WIL Roll vs Heavy crossing", "Longsword vs DN 12". */
  label: z.string(),
  /** Raw dice values (color-coded in the log: 1 = rust, 10 = gilt). */
  dice: z.array(z.number().int()),
  /** Sum of modifiers (Base + Skill + weapon mod, etc.) added once to the dice sum. */
  modifier: z.number().int(),
  /** Final total = dice sum + modifier. */
  total: z.number().int(),
  /** DC for action / save / skill rolls; `null` for open IN/DN rolls. */
  difficulty: z.number().int().nullable(),
  outcome: ActionOutcomeSchema,
  is_critical: z.boolean().default(false),
  /** Engine-generated rule consequences (e.g. "IN halved next Segment", "Total Absorption ×2"). */
  notes: z.string().default(''),
});
export type ActionLogEntry = z.infer<typeof ActionLogEntrySchema>;

/** On-disk file shape: `campaigns/<dir>/action-log.yaml`. */
export const CampaignActionLogFileSchema = z.object({
  schema_version: z.literal(1),
  campaign_dir: z.string(),
  entries: z.array(ActionLogEntrySchema).default([]),
});
export type CampaignActionLogFile = z.infer<typeof CampaignActionLogFileSchema>;

/**
 * Per-character segment state — set by Set IN/DN, cleared by End Segment.
 * Persists to disk so the WM can leave and return mid-fight.
 */
export const CurrentSegmentSchema = z.object({
  in: z.number().int(),
  dn: z.number().int(),
  /** Total Absorption modifier this Segment (Rule §08). 1 / 2 / 0.5. */
  absorption_modifier: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(0.5),
  ]),
  /** True when last attack / IN-DN flagged the next Segment's IN to halve. */
  in_halved_next_segment: z.boolean().default(false),
  set_at_real: z.string(),
});
export type CurrentSegment = z.infer<typeof CurrentSegmentSchema>;
