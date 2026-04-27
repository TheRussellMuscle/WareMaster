/**
 * CRUD for monster / ryude / npc instances inside a campaign (Phase 4).
 *
 * Each instance is a thin wrapper over a `template_id` plus per-instance
 * overrides + state. The repo follows the same shape as `character-repo.ts`:
 * `listInstances` is forgiving (validation errors surface as `failures`, the
 * list still loads); `deleteInstance` cleans up the portrait file too.
 */

import yaml from 'js-yaml';
import type { ZodType } from 'zod';
import {
  campaignPaths,
  instanceYamlPath,
  monsterPortraitPath,
  newId,
  npcInstanceMarkdownPath,
  npcPortraitPath,
  ryudePortraitPath,
  type TemplateKind,
} from './paths';
import {
  vaultListDir,
  vaultReadText,
  vaultRemove,
  vaultWriteText,
} from './vault';
import { parseYaml } from './yaml';
import {
  MonsterInstanceSchema,
  type MonsterInstance,
} from '@/domain/monster-instance';
import {
  RyudeInstanceSchema,
  type RyudeInstance,
} from '@/domain/ryude-instance';
import {
  NpcInstanceSchema,
  type NpcInstance,
} from '@/domain/npc-instance';

export interface ListResult<T> {
  items: T[];
  failures: Array<{ path: string; message: string }>;
}

export type InstanceOf<K extends TemplateKind> = K extends 'monster'
  ? MonsterInstance
  : K extends 'ryude'
    ? RyudeInstance
    : NpcInstance;

function schemaFor<K extends TemplateKind>(kind: K): ZodType<InstanceOf<K>> {
  switch (kind) {
    case 'monster':
      return MonsterInstanceSchema as unknown as ZodType<InstanceOf<K>>;
    case 'ryude':
      return RyudeInstanceSchema as unknown as ZodType<InstanceOf<K>>;
    case 'npc':
      return NpcInstanceSchema as unknown as ZodType<InstanceOf<K>>;
    default:
      throw new Error(`Unknown template kind: ${String(kind)}`);
  }
}

function instancesDir(campaignDir: string, kind: TemplateKind): string {
  const paths = campaignPaths(campaignDir);
  switch (kind) {
    case 'monster':
      return paths.monstersDir;
    case 'ryude':
      return paths.ryudeDir;
    case 'npc':
      return paths.npcsDir;
  }
}

function idPrefixFor(kind: TemplateKind): 'mon' | 'ryu' | 'npc' {
  switch (kind) {
    case 'monster':
      return 'mon';
    case 'ryude':
      return 'ryu';
    case 'npc':
      return 'npc';
  }
}

function portraitPathFor(
  kind: TemplateKind,
  id: string,
  ext: string,
): string {
  switch (kind) {
    case 'monster':
      return monsterPortraitPath(id, ext);
    case 'ryude':
      return ryudePortraitPath(id, ext);
    case 'npc':
      return npcPortraitPath(id, ext);
  }
}

export async function listInstances<K extends TemplateKind>(
  campaignDir: string,
  kind: K,
): Promise<ListResult<InstanceOf<K>>> {
  const dir = instancesDir(campaignDir, kind);
  let entries: string[] = [];
  try {
    entries = await vaultListDir(dir);
  } catch {
    return { items: [], failures: [] };
  }
  const yamlEntries = entries.filter((f) => f.endsWith('.yaml'));
  const items: InstanceOf<K>[] = [];
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
  items.sort((a, b) => (a as { name: string }).name.localeCompare((b as { name: string }).name));
  return { items, failures };
}

export async function getInstance<K extends TemplateKind>(
  campaignDir: string,
  kind: K,
  instanceId: string,
): Promise<InstanceOf<K> | null> {
  const paths = campaignPaths(campaignDir);
  const path = instanceYamlPath(paths.dir, kind, instanceId);
  try {
    const text = await vaultReadText(path);
    const parsed = parseYaml(path, text, schemaFor(kind));
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

export type NewInstance<K extends TemplateKind> = Omit<
  InstanceOf<K>,
  'id' | 'created_at' | 'updated_at' | 'schema_version'
>;

export async function createInstance<K extends TemplateKind>(
  campaignDir: string,
  kind: K,
  draft: NewInstance<K>,
): Promise<InstanceOf<K>> {
  const id = newId(idPrefixFor(kind));
  const now = new Date().toISOString();
  const paths = campaignPaths(campaignDir);
  const candidate = {
    ...(draft as object),
    schema_version: 1,
    id,
    created_at: now,
    updated_at: now,
  } as unknown;
  // Per-kind post-processing for side-files (NPC notes path).
  if (kind === 'npc') {
    (candidate as { notes_path?: string | null }).notes_path =
      (candidate as { notes_path?: string | null }).notes_path
        ?? npcInstanceMarkdownPath(paths.dir, id);
  }
  const validated = schemaFor(kind).parse(candidate);
  const path = instanceYamlPath(paths.dir, kind, id);
  await vaultWriteText(path, yaml.dump(validated, { lineWidth: 100 }));
  return validated;
}

export async function updateInstance<K extends TemplateKind>(
  campaignDir: string,
  kind: K,
  instance: InstanceOf<K>,
): Promise<InstanceOf<K>> {
  const updated = {
    ...(instance as object),
    updated_at: new Date().toISOString(),
  } as unknown;
  const validated = schemaFor(kind).parse(updated);
  const paths = campaignPaths(campaignDir);
  const path = instanceYamlPath(paths.dir, kind, (validated as { id: string }).id);
  await vaultWriteText(path, yaml.dump(validated, { lineWidth: 100 }));
  return validated;
}

export async function deleteInstance(
  campaignDir: string,
  kind: TemplateKind,
  instanceId: string,
): Promise<void> {
  // Look up portrait_path before deleting the YAML so we know what to clean up.
  const existing = await getInstance(campaignDir, kind, instanceId);
  const paths = campaignPaths(campaignDir);
  await vaultRemove(instanceYamlPath(paths.dir, kind, instanceId));
  if (kind === 'npc') {
    try {
      await vaultRemove(npcInstanceMarkdownPath(paths.dir, instanceId));
    } catch {
      /* notes file is optional */
    }
  }
  if (existing && existing.portrait_path) {
    try {
      await vaultRemove(existing.portrait_path);
    } catch {
      /* portrait might already be gone — best-effort */
    }
  }
  // Also try common portrait extensions in case portrait_path wasn't set
  // but a file exists (e.g. legacy deleted instance).
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    try {
      await vaultRemove(portraitPathFor(kind, instanceId, ext));
    } catch {
      /* expected miss */
    }
  }
}
