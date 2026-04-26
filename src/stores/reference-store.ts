import { create } from 'zustand';
import {
  loadReferenceCatalog,
  type ReferenceCatalog,
  type ReferenceLoadFailure,
} from '@/persistence/reference-loader';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface ReferenceState {
  status: Status;
  catalog: ReferenceCatalog | null;
  failures: ReferenceLoadFailure[];
  load: () => Promise<void>;
}

export const useReferenceStore = create<ReferenceState>((set, get) => ({
  status: 'idle',
  catalog: null,
  failures: [],
  load: async () => {
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading', failures: [] });
    try {
      const { catalog, failures } = await loadReferenceCatalog();
      set({
        catalog,
        failures,
        status: catalog ? 'ready' : 'error',
      });
    } catch (err) {
      set({
        status: 'error',
        failures: [
          {
            file: 'reference-loader',
            message: err instanceof Error ? err.message : String(err),
          },
        ],
      });
    }
  },
}));
