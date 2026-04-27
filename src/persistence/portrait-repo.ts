/**
 * Portrait import / removal across all entity kinds (Phase 4).
 *
 * Source paths come from the Tauri dialog (arbitrary host paths). Destinations
 * live under the vault at `portraits/<bucket>/<id>.<ext>` per PLAN.md §B.
 *
 * Buckets:
 *   - characters/<cha_id>.<ext>
 *   - monsters/<mon_id>.<ext>
 *   - ryude/<ryu_id>.<ext>
 *   - npcs/<npc_id>.<ext>
 *   - templates/<kind>s/<template_id>.<ext>     ← template default override
 */

import { vaultCopyFile, vaultExists, vaultRemove } from './vault';
import {
  characterPortraitPath,
  monsterPortraitPath,
  npcPortraitPath,
  ryudePortraitPath,
  templatePortraitPath,
  type TemplateKind,
} from './paths';

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function extensionOf(path: string): string | null {
  const i = path.lastIndexOf('.');
  if (i < 0) return null;
  const ext = path.slice(i + 1).toLowerCase();
  return ext.length === 0 ? null : ext;
}

export type PortraitTarget =
  | { kind: 'character'; id: string }
  | { kind: 'monster-instance'; id: string }
  | { kind: 'ryude-instance'; id: string }
  | { kind: 'npc-instance'; id: string }
  | { kind: 'template'; templateKind: TemplateKind; id: string };

function destPathFor(target: PortraitTarget, ext: string): string {
  switch (target.kind) {
    case 'character':
      return characterPortraitPath(target.id, ext);
    case 'monster-instance':
      return monsterPortraitPath(target.id, ext);
    case 'ryude-instance':
      return ryudePortraitPath(target.id, ext);
    case 'npc-instance':
      return npcPortraitPath(target.id, ext);
    case 'template':
      return templatePortraitPath(target.templateKind, target.id, ext);
  }
}

/**
 * Copy a host-absolute image into the vault and return its vault-relative
 * path so the caller can persist it (e.g. on `instance.portrait_path`).
 * Throws if the extension isn't whitelisted; the Rust side validates size.
 */
export async function importPortrait(
  target: PortraitTarget,
  sourceAbs: string,
): Promise<string> {
  const ext = extensionOf(sourceAbs);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported portrait extension "${ext ?? ''}". Use PNG, JPG, JPEG, or WEBP.`,
    );
  }
  const dest = destPathFor(target, ext);
  await vaultCopyFile(sourceAbs, dest);
  return dest;
}

/**
 * Best-effort removal of a previously imported portrait. Silently no-ops if
 * the file no longer exists.
 */
export async function removePortrait(vaultPath: string): Promise<void> {
  if (!vaultPath) return;
  if (!(await vaultExists(vaultPath))) return;
  await vaultRemove(vaultPath);
}

/** Backwards-compatible wrapper for existing character-only call sites. */
export async function importCharacterPortrait(
  characterId: string,
  sourceAbs: string,
): Promise<string> {
  return importPortrait({ kind: 'character', id: characterId }, sourceAbs);
}

/** Backwards-compatible wrapper. */
export async function removeCharacterPortrait(
  vaultPath: string,
): Promise<void> {
  return removePortrait(vaultPath);
}
