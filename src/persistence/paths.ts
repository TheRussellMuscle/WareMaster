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
    actionLog: `${dir}/action-log.yaml`,
  };
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
