import yaml from 'js-yaml';
import {
  CampaignActionLogFileSchema,
  type ActionLogEntry,
} from '@/domain/action-log';
import { campaignPaths } from './paths';
import { vaultExists, vaultReadText, vaultWriteText } from './vault';
import { parseYaml } from './yaml';

/**
 * Read the campaign-wide action log. Missing file ⇒ empty array (the file
 * is created lazily on first append).
 */
export async function getActionLog(
  campaignDir: string,
): Promise<ActionLogEntry[]> {
  const path = campaignPaths(campaignDir).actionLog;
  if (!(await vaultExists(path))) return [];
  const text = await vaultReadText(path);
  const parsed = parseYaml(path, text, CampaignActionLogFileSchema);
  return parsed.ok ? parsed.value.entries : [];
}

/**
 * Append one entry. Reads the existing log, pushes, writes back. Returns
 * the new full list (for callers that want to update local cache).
 *
 * Phase 3 acceptable: read-then-write is cheap for the action log even with
 * thousands of entries. If/when this becomes a hot path we can swap to NDJSON
 * with a true append (see PLAN.md §E).
 */
export async function appendActionLog(
  campaignDir: string,
  entry: ActionLogEntry,
): Promise<ActionLogEntry[]> {
  const existing = await getActionLog(campaignDir);
  const next = [...existing, entry];
  await writeActionLog(campaignDir, next);
  return next;
}

/** Empty the campaign log (the file persists with `entries: []`). */
export async function clearActionLog(campaignDir: string): Promise<void> {
  await writeActionLog(campaignDir, []);
}

async function writeActionLog(
  campaignDir: string,
  entries: ActionLogEntry[],
): Promise<void> {
  const path = campaignPaths(campaignDir).actionLog;
  const file = {
    schema_version: 1 as const,
    campaign_dir: campaignDir,
    entries,
  };
  await vaultWriteText(path, yaml.dump(file, { lineWidth: 100 }));
}
