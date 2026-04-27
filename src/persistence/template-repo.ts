/**
 * CRUD for user-authored templates (vault-scoped or campaign-scoped),
 * Phase 4 / PLAN.md §B + §K.
 *
 * Bundled templates come from `ReferenceCatalog` and are read-only. This repo
 * handles the two writable tiers: global vault templates under
 * `templates/{kind}s/<id>.yaml` and campaign overrides under
 * `campaigns/<dir>/templates/{kind}s/<id>.yaml`.
 *
 * Template ids: bundled use their kebab id (`tusktooth`). User-created ids are
 * `tpl_{mon|ryu|npc}_<ULID>` to avoid colliding with the bundled namespace,
 * unless the user is intentionally overriding a bundled id (campaign tier).
 */

import yaml from 'js-yaml';
import { ulid } from 'ulid';
import type { ZodType } from 'zod';
import {
  campaignPaths,
  campaignTemplatesDir,
  globalTemplatesDir,
  templateYamlPath,
  type TemplateKind,
} from './paths';
import {
  vaultListDir,
  vaultMkdir,
  vaultReadText,
  vaultRemove,
  vaultWriteText,
} from './vault';
import { parseYaml } from './yaml';
import {
  MonsterTemplateSchema,
  type MonsterTemplate,
} from '@/domain/monster';
import { RyudeTemplateSchema, type RyudeTemplate } from '@/domain/ryude';
import { NpcTemplateSchema, type NpcTemplate } from '@/domain/npc';

export interface ListResult<T> {
  items: T[];
  failures: Array<{ path: string; message: string }>;
}

export type TemplateScope =
  | { kind: 'global' }
  | { kind: 'campaign'; campaignDir: string };

export type TemplateOf<K extends TemplateKind> = K extends 'monster'
  ? MonsterTemplate
  : K extends 'ryude'
    ? RyudeTemplate
    : NpcTemplate;

function schemaFor<K extends TemplateKind>(kind: K): ZodType<TemplateOf<K>> {
  switch (kind) {
    case 'monster':
      return MonsterTemplateSchema as unknown as ZodType<TemplateOf<K>>;
    case 'ryude':
      return RyudeTemplateSchema as unknown as ZodType<TemplateOf<K>>;
    case 'npc':
      return NpcTemplateSchema as unknown as ZodType<TemplateOf<K>>;
    default:
      throw new Error(`Unknown template kind: ${String(kind)}`);
  }
}

function scopeDir(scope: TemplateScope, kind: TemplateKind): string {
  return scope.kind === 'global'
    ? globalTemplatesDir(kind)
    : campaignTemplatesDir(scope.campaignDir, kind);
}

async function ensureTemplatesDir(scope: TemplateScope, kind: TemplateKind): Promise<string> {
  const dir = scopeDir(scope, kind);
  if (scope.kind === 'campaign') {
    await vaultMkdir(campaignPaths(scope.campaignDir).templatesDir);
  }
  await vaultMkdir(dir);
  return dir;
}

/**
 * Generate a new template id. `tpl_mon_<ULID>` style — guaranteed not to
 * collide with bundled kebab ids.
 */
export function newTemplateId(kind: TemplateKind): string {
  const prefix = kind === 'monster' ? 'tpl_mon' : kind === 'ryude' ? 'tpl_ryu' : 'tpl_npc';
  return `${prefix}_${ulid()}`;
}

export async function listTemplates<K extends TemplateKind>(
  scope: TemplateScope,
  kind: K,
): Promise<ListResult<TemplateOf<K>>> {
  const dir = scopeDir(scope, kind);
  let entries: string[] = [];
  try {
    entries = await vaultListDir(dir);
  } catch {
    return { items: [], failures: [] };
  }
  const yamlEntries = entries.filter((f) => f.endsWith('.yaml'));
  const items: TemplateOf<K>[] = [];
  const failures: Array<{ path: string; message: string }> = [];
  const schema = schemaFor(kind);
  for (const file of yamlEntries) {
    const path = `${dir}/${file}`;
    try {
      const text = await vaultReadText(path);
      const parsed = parseYaml(path, text, schema);
      if (parsed.ok) items.push(parsed.value);
      else failures.push({ path, message: parsed.error.message });
    } catch (err) {
      failures.push({
        path,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  items.sort((a, b) => templateName(a).localeCompare(templateName(b)));
  return { items, failures };
}

function templateName(t: MonsterTemplate | RyudeTemplate | NpcTemplate): string {
  // All three template shapes have a `name` string field.
  return (t as { name: string }).name;
}

export async function getTemplate<K extends TemplateKind>(
  scope: TemplateScope,
  kind: K,
  templateId: string,
): Promise<TemplateOf<K> | null> {
  const path = templateYamlPath(scope, kind, templateId);
  try {
    const text = await vaultReadText(path);
    const parsed = parseYaml(path, text, schemaFor(kind));
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

export async function createTemplate<K extends TemplateKind>(
  scope: TemplateScope,
  kind: K,
  draft: TemplateOf<K>,
): Promise<TemplateOf<K>> {
  await ensureTemplatesDir(scope, kind);
  // Re-validate the draft so we never write garbage.
  const validated = schemaFor(kind).parse(draft);
  const path = templateYamlPath(scope, kind, (validated as { id: string }).id);
  await vaultWriteText(path, yaml.dump(validated, { lineWidth: 100 }));
  return validated;
}

export async function updateTemplate<K extends TemplateKind>(
  scope: TemplateScope,
  kind: K,
  template: TemplateOf<K>,
): Promise<TemplateOf<K>> {
  const validated = schemaFor(kind).parse(template);
  const path = templateYamlPath(scope, kind, (validated as { id: string }).id);
  await vaultWriteText(path, yaml.dump(validated, { lineWidth: 100 }));
  return validated;
}

export async function deleteTemplate(
  scope: TemplateScope,
  kind: TemplateKind,
  templateId: string,
): Promise<void> {
  const path = templateYamlPath(scope, kind, templateId);
  await vaultRemove(path);
}
