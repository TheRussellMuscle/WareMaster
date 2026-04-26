import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export interface VaultInfo {
  root: string;
  created: boolean;
}

export async function getVaultRoot(): Promise<string | null> {
  return invoke<string | null>('vault_get_root');
}

export async function getDefaultVaultRoot(): Promise<string> {
  return invoke<string>('vault_get_default_root');
}

/**
 * Returns the default path *only if* a vault already exists there. Used as a
 * fallback so re-launches don't force a re-pick when app config is missing.
 */
export async function detectExistingVault(): Promise<string | null> {
  return invoke<string | null>('vault_detect_existing');
}

export async function initializeVault(root: string): Promise<VaultInfo> {
  return invoke<VaultInfo>('vault_initialize', { root });
}

export async function pickVaultFolder(
  defaultPath?: string,
): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    defaultPath,
    title: 'Choose your WareMaster vault folder',
  });
  if (result == null) return null;
  return Array.isArray(result) ? (result[0] ?? null) : result;
}

/* ---------- Vault-relative file operations ---------- */

export function vaultReadText(relative: string): Promise<string> {
  return invoke<string>('vault_read_text', { relative });
}

export function vaultWriteText(relative: string, contents: string): Promise<void> {
  return invoke<void>('vault_write_text', { relative, contents });
}

export function vaultMkdir(relative: string): Promise<void> {
  return invoke<void>('vault_mkdir', { relative });
}

export function vaultRemove(relative: string): Promise<void> {
  return invoke<void>('vault_remove', { relative });
}

export function vaultExists(relative: string): Promise<boolean> {
  return invoke<boolean>('vault_exists', { relative });
}

export function vaultListDir(relative: string): Promise<string[]> {
  return invoke<string[]>('vault_list_dir', { relative });
}

/**
 * Copy a host-absolute image file (e.g. one returned by the dialog plugin)
 * into the vault at `relativeDest`. Validates extension (png/jpg/jpeg/webp)
 * and size (≤5 MB) on the Rust side; throws with a descriptive message on
 * failure.
 */
export function vaultCopyFile(
  sourceAbs: string,
  relativeDest: string,
): Promise<void> {
  return invoke<void>('vault_copy_file', {
    sourceAbs,
    relativeDest,
  });
}

export async function pickImageFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    title: 'Choose a portrait image',
    filters: [
      {
        name: 'Image',
        extensions: ['png', 'jpg', 'jpeg', 'webp'],
      },
    ],
  });
  if (result == null) return null;
  return Array.isArray(result) ? (result[0] ?? null) : result;
}
