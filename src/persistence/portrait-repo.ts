/**
 * Character portrait import / removal.
 *
 * The wizard and the sheet's edit form both call into here. Source paths
 * come from the Tauri dialog (arbitrary host paths); destinations live under
 * the vault at `portraits/characters/<cha_id>.<ext>` per PLAN.md §B.
 */

import { vaultCopyFile, vaultExists, vaultRemove } from './vault';
import { characterPortraitPath } from './paths';

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function extensionOf(path: string): string | null {
  const i = path.lastIndexOf('.');
  if (i < 0) return null;
  const ext = path.slice(i + 1).toLowerCase();
  return ext.length === 0 ? null : ext;
}

/**
 * Copy a host-absolute image into the vault and return its vault-relative
 * path so the caller can persist it on `character.portrait_path`. Throws if
 * the extension isn't whitelisted (the Rust side double-checks size).
 */
export async function importCharacterPortrait(
  characterId: string,
  sourceAbs: string,
): Promise<string> {
  const ext = extensionOf(sourceAbs);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported portrait extension "${ext ?? ''}". Use PNG, JPG, JPEG, or WEBP.`,
    );
  }
  const dest = characterPortraitPath(characterId, ext);
  await vaultCopyFile(sourceAbs, dest);
  return dest;
}

/**
 * Best-effort removal of a previously imported portrait. Silently no-ops if
 * the file no longer exists.
 */
export async function removeCharacterPortrait(
  vaultPath: string,
): Promise<void> {
  if (!vaultPath) return;
  if (!(await vaultExists(vaultPath))) return;
  await vaultRemove(vaultPath);
}
