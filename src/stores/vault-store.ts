import { create } from 'zustand';
import {
  detectExistingVault,
  getDefaultVaultRoot,
  getVaultRoot,
  initializeVault,
  pickVaultFolder,
} from '@/persistence/vault';

type Status = 'idle' | 'checking' | 'ready' | 'unconfigured' | 'error';

interface VaultState {
  status: Status;
  root: string | null;
  error: string | null;
  /** Bootstrap the vault: read saved root from app config, fall back to default. */
  init: () => Promise<void>;
  /** Set up the vault at `root` (creates folder structure if needed). */
  setRoot: (root: string) => Promise<void>;
  /** Open a folder picker. Returns true if a folder was chosen and initialized. */
  pickAndSet: () => Promise<boolean>;
  /** Initialize the default vault location without prompting. */
  useDefault: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'idle',
  root: null,
  error: null,
  init: async () => {
    if (get().status !== 'idle' && get().status !== 'error') return;
    set({ status: 'checking', error: null });
    try {
      const saved = await getVaultRoot();
      if (saved) {
        set({ status: 'ready', root: saved });
        return;
      }
      // Fallback: if a vault already exists at the default location, adopt it
      // silently. This makes app re-launches resilient even if the saved
      // config was lost.
      const existing = await detectExistingVault();
      if (existing) {
        const info = await initializeVault(existing);
        set({ status: 'ready', root: info.root });
        return;
      }
      set({ status: 'unconfigured' });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
  setRoot: async (root) => {
    set({ status: 'checking', error: null });
    try {
      const info = await initializeVault(root);
      set({ status: 'ready', root: info.root });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
  pickAndSet: async () => {
    const seed = (await getDefaultVaultRoot().catch(() => undefined)) ?? undefined;
    const choice = await pickVaultFolder(seed);
    if (!choice) return false;
    await get().setRoot(choice);
    return true;
  },
  useDefault: async () => {
    const def = await getDefaultVaultRoot();
    await get().setRoot(def);
  },
}));
