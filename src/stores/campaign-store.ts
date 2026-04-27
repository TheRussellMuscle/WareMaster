import { create } from 'zustand';
import {
  createCampaign as repoCreateCampaign,
  getCampaign as repoGetCampaign,
  listCampaigns as repoListCampaigns,
  updateCampaign as repoUpdateCampaign,
} from '@/persistence/campaign-repo';
import { listCharacters } from '@/persistence/character-repo';
import { listInstances } from '@/persistence/instance-repo';
import type { Campaign } from '@/domain/campaign';
import type { Character } from '@/domain/character';
import type { MonsterInstance } from '@/domain/monster-instance';
import type { RyudeInstance } from '@/domain/ryude-instance';
import type { NpcInstance } from '@/domain/npc-instance';
import type { TemplateKind } from '@/persistence/paths';

export interface CampaignInstances {
  monster?: MonsterInstance[];
  ryude?: RyudeInstance[];
  npc?: NpcInstance[];
}

type InstanceForKind<K extends TemplateKind> = K extends 'monster'
  ? MonsterInstance
  : K extends 'ryude'
    ? RyudeInstance
    : NpcInstance;

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
  /**
   * Character lists per campaign dir. Populated lazily by the sidebar tree
   * when a campaign is expanded; callers can also refresh after create/delete.
   */
  charactersByCampaign: Record<string, Character[]>;
  /**
   * Phase 4 instance lists per campaign dir, segmented by kind. Populated
   * lazily; the sidebar branches and the campaign instance routes both call
   * `loadInstancesFor`.
   */
  instancesByCampaign: Record<string, CampaignInstances>;
  refreshList: () => Promise<void>;
  loadByDir: (dirName: string) => Promise<Campaign | null>;
  loadCharactersFor: (
    campaignDir: string,
    options?: { force?: boolean },
  ) => Promise<Character[]>;
  invalidateCharactersFor: (campaignDir: string) => void;
  loadInstancesFor: <K extends TemplateKind>(
    campaignDir: string,
    kind: K,
    options?: { force?: boolean },
  ) => Promise<InstanceForKind<K>[]>;
  invalidateInstancesFor: (campaignDir: string, kind?: TemplateKind) => void;
  create: (input: {
    name: string;
    wm: string;
    description: string;
    setting_region: string | null;
  }) => Promise<Campaign>;
  update: (campaign: Campaign) => Promise<Campaign>;
  setCurrent: (campaign: Campaign | null) => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  list: [],
  listFailures: [],
  loadingList: false,
  current: null,
  loadingCurrent: false,
  charactersByCampaign: {},
  instancesByCampaign: {},

  loadInstancesFor: async <K extends TemplateKind>(
    campaignDir: string,
    kind: K,
    options?: { force?: boolean },
  ): Promise<InstanceForKind<K>[]> => {
    if (!options?.force) {
      const cached = get().instancesByCampaign[campaignDir]?.[kind];
      if (cached) return cached as InstanceForKind<K>[];
    }
    try {
      const result = await listInstances(campaignDir, kind);
      set((s) => ({
        instancesByCampaign: {
          ...s.instancesByCampaign,
          [campaignDir]: {
            ...(s.instancesByCampaign[campaignDir] ?? {}),
            [kind]: result.items,
          },
        },
      }));
      return result.items as InstanceForKind<K>[];
    } catch {
      return [];
    }
  },

  invalidateInstancesFor: (campaignDir, kind) =>
    set((s) => {
      const next = { ...s.instancesByCampaign };
      if (kind === undefined) {
        delete next[campaignDir];
      } else if (next[campaignDir]) {
        const branch = { ...next[campaignDir] };
        delete branch[kind];
        next[campaignDir] = branch;
      }
      return { instancesByCampaign: next };
    }),

  loadCharactersFor: async (campaignDir, options) => {
    if (!options?.force) {
      const cached = get().charactersByCampaign[campaignDir];
      if (cached) return cached;
    }
    try {
      const result = await listCharacters(campaignDir);
      set((s) => ({
        charactersByCampaign: {
          ...s.charactersByCampaign,
          [campaignDir]: result.items,
        },
      }));
      return result.items;
    } catch {
      return [];
    }
  },

  invalidateCharactersFor: (campaignDir) =>
    set((s) => {
      const next = { ...s.charactersByCampaign };
      delete next[campaignDir];
      return { charactersByCampaign: next };
    }),

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
