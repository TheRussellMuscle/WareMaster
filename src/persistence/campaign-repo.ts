import yaml from 'js-yaml';
import { CampaignSchema, type Campaign } from '@/domain/campaign';
import { campaignDirName, campaignPaths, newId, VAULT_PATHS } from './paths';
import {
  vaultListDir,
  vaultMkdir,
  vaultReadText,
  vaultRemove,
  vaultWriteText,
} from './vault';
import { parseYaml } from './yaml';

interface CreateCampaignArgs {
  name: string;
  wm: string;
  description: string;
  setting_region: string | null;
}

export interface ListResult<T> {
  items: T[];
  failures: Array<{ path: string; message: string }>;
}

export async function listCampaigns(): Promise<ListResult<Campaign>> {
  const dirs = await vaultListDir(VAULT_PATHS.campaigns);
  const items: Campaign[] = [];
  const failures: Array<{ path: string; message: string }> = [];
  for (const dir of dirs) {
    const yamlPath = `${VAULT_PATHS.campaigns}/${dir}/campaign.yaml`;
    try {
      const text = await vaultReadText(yamlPath);
      const parsed = parseYaml(yamlPath, text, CampaignSchema);
      if (parsed.ok) {
        items.push(parsed.value);
      } else {
        failures.push({ path: yamlPath, message: parsed.error.message });
      }
    } catch (err) {
      // Missing campaign.yaml in a stray dir: not surfaced as an error.
      // Real read errors bubble up to failures so the user sees them.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/no such file|cannot find/i.test(msg)) {
        failures.push({ path: yamlPath, message: msg });
      }
    }
  }
  items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return { items, failures };
}

export async function getCampaign(dirName: string): Promise<Campaign | null> {
  const paths = campaignPaths(dirName);
  try {
    const text = await vaultReadText(paths.yaml);
    const parsed = parseYaml(paths.yaml, text, CampaignSchema);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const all = await listCampaigns();
  return all.items.find((c) => c.id === id) ?? null;
}

export async function createCampaign(
  args: CreateCampaignArgs,
): Promise<Campaign> {
  const id = newId('cmp');
  const dirName = campaignDirName(id, args.name);
  const paths = campaignPaths(dirName);
  const now = new Date().toISOString();

  const campaign: Campaign = {
    schema_version: 1,
    id,
    name: args.name,
    wm: args.wm,
    description: args.description,
    setting_region: args.setting_region,
    clock: { segment_index: 0, real_world_anchor: now },
    dir_name: dirName,
    created_at: now,
    updated_at: now,
  };

  await vaultMkdir(paths.dir);
  await vaultMkdir(paths.charactersDir);
  await vaultMkdir(paths.npcsDir);
  await vaultMkdir(paths.monstersDir);
  await vaultMkdir(paths.ryudeDir);
  await vaultMkdir(paths.sessionsDir);
  await vaultMkdir(paths.combatDir);
  await vaultMkdir(paths.historyDir);

  await vaultWriteText(paths.yaml, yaml.dump(campaign, { lineWidth: 100 }));
  return campaign;
}

export async function updateCampaign(campaign: Campaign): Promise<Campaign> {
  const paths = campaignPaths(campaign.dir_name);
  const updated: Campaign = {
    ...campaign,
    updated_at: new Date().toISOString(),
  };
  await vaultWriteText(paths.yaml, yaml.dump(updated, { lineWidth: 100 }));
  return updated;
}

export async function deleteCampaign(dirName: string): Promise<void> {
  const paths = campaignPaths(dirName);
  await vaultRemove(paths.dir);
}
