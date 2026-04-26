import yaml from 'js-yaml';
import { CharacterSchema, type Character } from '@/domain/character';
import {
  campaignPaths,
  characterMarkdownPath,
  characterYamlPath,
  newId,
} from './paths';
import {
  vaultListDir,
  vaultReadText,
  vaultRemove,
  vaultWriteText,
} from './vault';
import { parseYaml } from './yaml';

export interface ListResult<T> {
  items: T[];
  failures: Array<{ path: string; message: string }>;
}

export async function listCharacters(
  campaignDirName: string,
): Promise<ListResult<Character>> {
  const paths = campaignPaths(campaignDirName);
  const entries = await vaultListDir(paths.charactersDir);
  const yamlEntries = entries.filter((f) => f.endsWith('.yaml'));
  const items: Character[] = [];
  const failures: Array<{ path: string; message: string }> = [];
  for (const file of yamlEntries) {
    const path = `${paths.charactersDir}/${file}`;
    try {
      const text = await vaultReadText(path);
      const parsed = parseYaml(path, text, CharacterSchema);
      if (parsed.ok) {
        items.push(parsed.value);
      } else {
        failures.push({ path, message: parsed.error.message });
      }
    } catch (err) {
      failures.push({
        path,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return { items, failures };
}

export async function getCharacter(
  campaignDirName: string,
  characterId: string,
): Promise<Character | null> {
  const paths = campaignPaths(campaignDirName);
  const yamlPath = characterYamlPath(paths.dir, characterId);
  try {
    const text = await vaultReadText(yamlPath);
    const parsed = parseYaml(yamlPath, text, CharacterSchema);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

export type NewCharacter = Omit<
  Character,
  'id' | 'created_at' | 'updated_at' | 'schema_version'
>;

export async function createCharacter(
  campaignDirName: string,
  draft: NewCharacter,
  biography: string,
): Promise<Character> {
  const id = newId('cha');
  const now = new Date().toISOString();
  const paths = campaignPaths(campaignDirName);
  const yamlPath = characterYamlPath(paths.dir, id);
  const mdPath = characterMarkdownPath(paths.dir, id);

  const character: Character = {
    ...draft,
    schema_version: 1,
    id,
    created_at: now,
    updated_at: now,
    notes_path: mdPath,
  };

  await vaultWriteText(yamlPath, yaml.dump(character, { lineWidth: 100 }));
  if (biography.trim().length > 0) {
    const md = `---\ncharacter_id: ${id}\nname: ${JSON.stringify(character.name)}\n---\n\n${biography}\n`;
    await vaultWriteText(mdPath, md);
  }
  return character;
}

export async function updateCharacter(
  campaignDirName: string,
  character: Character,
): Promise<Character> {
  const paths = campaignPaths(campaignDirName);
  const updated: Character = {
    ...character,
    updated_at: new Date().toISOString(),
  };
  await vaultWriteText(
    characterYamlPath(paths.dir, character.id),
    yaml.dump(updated, { lineWidth: 100 }),
  );
  return updated;
}

export async function deleteCharacter(
  campaignDirName: string,
  characterId: string,
): Promise<void> {
  const paths = campaignPaths(campaignDirName);
  await vaultRemove(characterYamlPath(paths.dir, characterId));
  await vaultRemove(characterMarkdownPath(paths.dir, characterId));
}
