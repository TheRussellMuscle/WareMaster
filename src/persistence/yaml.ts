import yaml from 'js-yaml';
import type { ZodType } from 'zod';

export interface YamlParseError {
  kind: 'yaml-error' | 'validation-error';
  source: string;
  message: string;
  detail?: unknown;
}

export type YamlResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: YamlParseError };

/**
 * Parse a YAML string and validate against a Zod schema. Returns a structured
 * Result so the UI can render a "this file failed validation" repair view
 * rather than crashing.
 */
export function parseYaml<T>(
  source: string,
  text: string,
  schema: ZodType<T>,
): YamlResult<T> {
  let raw: unknown;
  try {
    raw = yaml.load(text);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: 'yaml-error',
        source,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        kind: 'validation-error',
        source,
        message: 'YAML did not match expected schema',
        detail: parsed.error.issues,
      },
    };
  }

  return { ok: true, value: parsed.data };
}
