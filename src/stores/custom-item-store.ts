import { create } from 'zustand';
import {
  listCustomItems,
  createCustomItem,
  updateCustomItem,
  deleteCustomItem,
} from '@/persistence/custom-item-repo';
import type { CustomItem } from '@/domain/custom-item';
import type { ParseFailure } from './template-store';

interface CustomItemState {
  items: CustomItem[] | undefined;
  failures: ParseFailure[];
  load: (opts?: { force?: boolean }) => Promise<CustomItem[]>;
  invalidate: () => void;
  create: (item: CustomItem) => Promise<CustomItem>;
  update: (item: CustomItem) => Promise<CustomItem>;
  remove: (itemId: string) => Promise<void>;
}

export const useCustomItemStore = create<CustomItemState>((set, get) => ({
  items: undefined,
  failures: [],

  load: async (opts) => {
    if (!opts?.force && get().items !== undefined) {
      return get().items!;
    }
    try {
      const result = await listCustomItems();
      set({ items: result.items, failures: result.failures });
      return result.items;
    } catch {
      set({ items: [], failures: [] });
      return [];
    }
  },

  invalidate: () => set({ items: undefined }),

  create: async (item) => {
    const saved = await createCustomItem(item);
    await get().load({ force: true });
    return saved;
  },

  update: async (item) => {
    const saved = await updateCustomItem(item);
    await get().load({ force: true });
    return saved;
  },

  remove: async (itemId) => {
    await deleteCustomItem(itemId);
    await get().load({ force: true });
  },
}));
