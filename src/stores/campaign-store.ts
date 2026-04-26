import { create } from 'zustand';
import {
  createCampaign as repoCreateCampaign,
  getCampaign as repoGetCampaign,
  listCampaigns as repoListCampaigns,
  updateCampaign as repoUpdateCampaign,
} from '@/persistence/campaign-repo';
import type { Campaign } from '@/domain/campaign';

export interface ParseFailure {
  path: string;
  message: string;
}

interface CampaignState {
  list: Campaign[];
  listFailures: ParseFailure[];
  loadingList: boolean;
  current: Campaign | null;
  loadingCurrent: boolean;
  refreshList: () => Promise<void>;
  loadByDir: (dirName: string) => Promise<Campaign | null>;
  create: (input: {
    name: string;
    wm: string;
    description: string;
    setting_region: string | null;
  }) => Promise<Campaign>;
  update: (campaign: Campaign) => Promise<Campaign>;
  setCurrent: (campaign: Campaign | null) => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  list: [],
  listFailures: [],
  loadingList: false,
  current: null,
  loadingCurrent: false,

  refreshList: async () => {
    set({ loadingList: true });
    try {
      const result = await repoListCampaigns();
      set({
        list: result.items,
        listFailures: result.failures,
        loadingList: false,
      });
    } catch {
      set({ loadingList: false });
    }
  },

  loadByDir: async (dirName) => {
    set({ loadingCurrent: true });
    try {
      const c = await repoGetCampaign(dirName);
      set({ current: c, loadingCurrent: false });
      return c;
    } catch {
      set({ loadingCurrent: false });
      return null;
    }
  },

  create: async (input) => {
    const c = await repoCreateCampaign(input);
    set((s) => ({ list: [c, ...s.list] }));
    return c;
  },



  update: async (campaign) => {
    const updated = await repoUpdateCampaign(campaign);
    set((s) => ({
      list: s.list.map((c) => (c.id === updated.id ? updated : c)),
      current: s.current?.id === updated.id ? updated : s.current,
    }));
    return updated;
  },

  setCurrent: (campaign) => set({ current: campaign }),
}));
