import yaml from 'js-yaml';
import { ulid } from 'ulid';
import { VAULT_PATHS, customItemYamlPath } from './paths';
import { vaultListDir, vaultMkdir, vaultReadText, vaultRemove, vaultWriteText } from './vault';
import { parseYaml } from './yaml';
import { CustomItemSchema, type CustomItem } from '@/domain/custom-item';

export interface ListResult<T> {
  items: T[];
  failures: Array<{ path: string; message: string }>;
}

export function newCustomItemId(): string {
  return `itm_${ulid()}`;
}

export async function listCustomItems(): Promise<ListResult<CustomItem>> {
  let entries: string[] = [];
  try {
    entries = await vaultListDir(VAULT_PATHS.items);
  } catch {
    return { items: [], failures: [] };
  }
  const yamlEntries = entries.filter((f) => f.endsWith('.yaml'));
  const items: CustomItem[] = [];
  const failures: Array<{ path: string; message: string }> = [];
  for (const file of yamlEntries) {
    const path = `${VAULT_PATHS.items}/${file}`;
    try {
      const text = await vaultReadText(path);
      const parsed = parseYaml(path, text, CustomItemSchema);
      if (parsed.ok) items.push(parsed.value);
      else failures.push({ path, message: parsed.error.message });
    } catch (err) {
      failures.push({ path, message: err instanceof Error ? err.message : String(err) });
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return { items, failures };
}

export async function getCustomItem(itemId: string): Promise<CustomItem | null> {
  const path = customItemYamlPath(itemId);
  try {
    const text = await vaultReadText(path);
    const parsed = parseYaml(path, text, CustomItemSchema);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

export async function createCustomItem(item: CustomItem): Promise<CustomItem> {
  await vaultMkdir(VAULT_PATHS.items);
  const validated = CustomItemSchema.parse(item);
  await vaultWriteText(customItemYamlPath(validated.id), yaml.dump(validated, { lineWidth: 100 }));
  return validated;
}

export async function updateCustomItem(item: CustomItem): Promise<CustomItem> {
  const validated = CustomItemSchema.parse(item);
  await vaultWriteText(customItemYamlPath(validated.id), yaml.dump(validated, { lineWidth: 100 }));
  return validated;
}

export async function deleteCustomItem(itemId: string): Promise<void> {
  await vaultRemove(customItemYamlPath(itemId));
}
