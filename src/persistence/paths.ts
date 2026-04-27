/**
 * Naming conventions and path builders for the user's vault. All paths are
 * vault-relative (POSIX style). The Rust side resolves them under the
 * configured vault root.
 */

import { ulid } from 'ulid';
import type { ClassId } from '@/domain/class';

export type IdPrefix =
  | 'cmp' // campaign
  | 'cha' // character
  | 'npc' // NPC instance (Phase 4)
  | 'mon' // monster instance (Phase 4)
  | 'ryu' // Ryude instance (Phase 4)
  | 'tpl' // template (Phase 4)
  | 'itm' // custom item (global vault)
  | 'evt' // event (Phase 6+)
  | 'combat'; // combat session (Phase 7)

/** Generate a typed kebab-prefixed ULID id. */
export function newId(prefix: IdPrefix): string {
  return `${prefix}_${ulid()}`;
}

/** kebab-case slug derived from a free-text name; safe for filesystem use. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 48) || 'untitled';
}

/** Folder name for a campaign: `{id}-{slug}`. */
export function campaignDirName(id: string, name: string): string {
  return `${id}-${slugify(name)}`;
}

export const VAULT_PATHS = {
  campaigns: 'campaigns',
  templates: 'templates',
  portraits: 'portraits',
  items: 'items',
};

export interface CampaignPaths {
  dir: string;
  yaml: string;
  charactersDir: string;
  npcsDir: string;
  monstersDir: string;
  ryudeDir: string;
  sessionsDir: string;
  combatDir: string;
  historyDir: string;
  /** Root for campaign-scoped template overrides (Phase 4). */
  templatesDir: string;
  /** Campaign-wide action log (every sheet roll across all characters). */
  actionLog: string;
}

export function campaignPaths(dirName: string): CampaignPaths {
  const dir = `${VAULT_PATHS.campaigns}/${dirName}`;
  return {
    dir,
    yaml: `${dir}/campaign.yaml`,
    charactersDir: `${dir}/characters`,
    npcsDir: `${dir}/npcs`,
    monstersDir: `${dir}/monsters`,
    ryudeDir: `${dir}/ryude`,
    sessionsDir: `${dir}/sessions`,
    combatDir: `${dir}/combat`,
    historyDir: `${dir}/.history`,
    templatesDir: `${dir}/templates`,
    actionLog: `${dir}/action-log.yaml`,
  };
}

/**
 * Phase 4 template kinds. Used in path builders, repo discriminators, and the
 * resolution chain (campaign → vault → bundled).
 */
export type TemplateKind = 'monster' | 'ryude' | 'npc';

/** Pluralized subdirectory for a template kind (matches campaign instance dirs). */
export function templateKindDir(kind: TemplateKind): string {
  switch (kind) {
    case 'monster':
      return 'monsters';
    case 'ryude':
      return 'ryude';
    case 'npc':
      return 'npcs';
  }
}

/** Vault-relative directory for global (vault-wide) templates of a given kind. */
export function globalTemplatesDir(kind: TemplateKind): string {
  return `${VAULT_PATHS.templates}/${templateKindDir(kind)}`;
}

/** Vault-relative directory for campaign-scoped templates of a given kind. */
export function campaignTemplatesDir(
  campaignDir: string,
  kind: TemplateKind,
): string {
  return `${campaignDir}/templates/${templateKindDir(kind)}`;
}

/**
 * YAML file path for a template, scoped either to a campaign or to the global
 * vault. `templateId` may be a kebab-case bundled override (`tusktooth`) or a
 * `tpl_*_<ULID>` user-created id.
 */
export function templateYamlPath(
  scope: { kind: 'global' } | { kind: 'campaign'; campaignDir: string },
  kind: TemplateKind,
  templateId: string,
): string {
  const dir =
    scope.kind === 'global'
      ? globalTemplatesDir(kind)
      : campaignTemplatesDir(scope.campaignDir, kind);
  return `${dir}/${templateId}.yaml`;
}

export function monsterInstanceYamlPath(
  campaignDir: string,
  instanceId: string,
): string {
  return `${campaignDir}/monsters/${instanceId}.yaml`;
}

export function ryudeInstanceYamlPath(
  campaignDir: string,
  instanceId: string,
): string {
  return `${campaignDir}/ryude/${instanceId}.yaml`;
}

export function npcInstanceYamlPath(
  campaignDir: string,
  instanceId: string,
): string {
  return `${campaignDir}/npcs/${instanceId}.yaml`;
}

export function npcInstanceMarkdownPath(
  campaignDir: string,
  instanceId: string,
): string {
  return `${campaignDir}/npcs/${instanceId}.md`;
}

export function instanceYamlPath(
  campaignDir: string,
  kind: TemplateKind,
  instanceId: string,
): string {
  switch (kind) {
    case 'monster':
      return monsterInstanceYamlPath(campaignDir, instanceId);
    case 'ryude':
      return ryudeInstanceYamlPath(campaignDir, instanceId);
    case 'npc':
      return npcInstanceYamlPath(campaignDir, instanceId);
  }
}

/** Vault-relative portrait path for a monster instance. */
export function monsterPortraitPath(instanceId: string, ext: string): string {
  return `${VAULT_PATHS.portraits}/monsters/${instanceId}.${ext.toLowerCase()}`;
}

/** Vault-relative portrait path for a Ryude instance. */
export function ryudePortraitPath(instanceId: string, ext: string): string {
  return `${VAULT_PATHS.portraits}/ryude/${instanceId}.${ext.toLowerCase()}`;
}

/** Vault-relative portrait path for an NPC instance. */
export function npcPortraitPath(instanceId: string, ext: string): string {
  return `${VAULT_PATHS.portraits}/npcs/${instanceId}.${ext.toLowerCase()}`;
}

/** Vault-relative portrait path for a template's default custom image. */
export function templatePortraitPath(
  kind: TemplateKind,
  templateId: string,
  ext: string,
): string {
  return `${VAULT_PATHS.portraits}/templates/${templateKindDir(kind)}/${templateId}.${ext.toLowerCase()}`;
}

export function characterYamlPath(campaignDir: string, characterId: string): string {
  return `${campaignDir}/characters/${characterId}.yaml`;
}

export function characterMarkdownPath(campaignDir: string, characterId: string): string {
  return `${campaignDir}/characters/${characterId}.md`;
}

/** Vault-relative portrait path for a character (PLAN.md §B layout). */
export function characterPortraitPath(characterId: string, ext: string): string {
  return `${VAULT_PATHS.portraits}/characters/${characterId}.${ext.toLowerCase()}`;
}

/**
 * Stub: placeholder portrait path for a class. Phase 4 swaps this out for
 * real bundled portraits and custom-uploaded ones.
 */
export function defaultClassPortraitPath(classId: ClassId): string {
  return `placeholder-class:${classId}`;
}

/** Vault-relative path for a global custom item YAML. */
export function customItemYamlPath(itemId: string): string {
  return `${VAULT_PATHS.items}/${itemId}.yaml`;
}
