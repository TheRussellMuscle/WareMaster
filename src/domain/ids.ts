import { z } from 'zod';

/**
 * Stable kebab-case identifiers used throughout the bundled reference data.
 * Branded id types for instance/campaign records arrive in Phase 3.
 */
export const IdSchema = z.string().min(1);
export type Id = z.infer<typeof IdSchema>;

export const KebabIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'expected kebab-case id');
