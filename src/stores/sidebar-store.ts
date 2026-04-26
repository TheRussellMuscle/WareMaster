import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SidebarState {
  /** Map of node id → expanded?  Persisted via localStorage. */
  expanded: Record<string, boolean>;
  /** Per-campaign character search filters (campaign dir → query string). */
  search: Record<string, string>;
  toggle: (id: string) => void;
  isExpanded: (id: string) => boolean;
  setSearch: (campaignId: string, query: string) => void;
  getSearch: (campaignId: string) => string;
}

/**
 * Persistent sidebar state — what's expanded in the campaign tree and what
 * search query (if any) is filtering each campaign's characters. Stored in
 * `localStorage` under `waremaster:sidebar` so the user's tree position
 * survives reloads.
 */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      expanded: { campaigns: true },
      search: {},
      toggle: (id) =>
        set((s) => ({
          expanded: { ...s.expanded, [id]: !s.expanded[id] },
        })),
      isExpanded: (id) => !!get().expanded[id],
      setSearch: (campaignId, query) =>
        set((s) => ({ search: { ...s.search, [campaignId]: query } })),
      getSearch: (campaignId) => get().search[campaignId] ?? '',
    }),
    {
      name: 'waremaster:sidebar',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
