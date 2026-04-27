import { create } from 'zustand';
import {
  listTemplates,
  type TemplateOf,
} from '@/persistence/template-repo';
import type { TemplateKind } from '@/persistence/paths';

/**
 * Lazy-loaded cache of user-authored templates (vault + per-campaign). Bundled
 * templates live in `useReferenceStore` and don't go through here.
 */
export interface ParseFailure {
  path: string;
  message: string;
}

interface TemplateBranch {
  monster?: TemplateOf<'monster'>[];
  ryude?: TemplateOf<'ryude'>[];
  npc?: TemplateOf<'npc'>[];
}

interface TemplateState {
  globalTemplates: TemplateBranch;
  campaignTemplates: Record<string, TemplateBranch>;
  globalFailures: Record<TemplateKind, ParseFailure[]>;
  campaignFailures: Record<string, Partial<Record<TemplateKind, ParseFailure[]>>>;
  loadGlobal: <K extends TemplateKind>(
    kind: K,
    options?: { force?: boolean },
  ) => Promise<TemplateOf<K>[]>;
  loadCampaign: <K extends TemplateKind>(
    campaignDir: string,
    kind: K,
    options?: { force?: boolean },
  ) => Promise<TemplateOf<K>[]>;
  invalidateGlobal: (kind?: TemplateKind) => void;
  invalidateCampaign: (campaignDir: string, kind?: TemplateKind) => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  globalTemplates: {},
  campaignTemplates: {},
  globalFailures: { monster: [], ryude: [], npc: [] },
  campaignFailures: {},

  loadGlobal: async <K extends TemplateKind>(
    kind: K,
    options?: { force?: boolean },
  ): Promise<TemplateOf<K>[]> => {
    if (!options?.force) {
      const cached = get().globalTemplates[kind];
      if (cached) return cached as TemplateOf<K>[];
    }
    try {
      const result = await listTemplates({ kind: 'global' }, kind);
      set((s) => ({
        globalTemplates: { ...s.globalTemplates, [kind]: result.items },
        globalFailures: { ...s.globalFailures, [kind]: result.failures },
      }));
      return result.items as TemplateOf<K>[];
    } catch {
      return [];
    }
  },

  loadCampaign: async <K extends TemplateKind>(
    campaignDir: string,
    kind: K,
    options?: { force?: boolean },
  ): Promise<TemplateOf<K>[]> => {
    if (!options?.force) {
      const cached = get().campaignTemplates[campaignDir]?.[kind];
      if (cached) return cached as TemplateOf<K>[];
    }
    try {
      const result = await listTemplates(
        { kind: 'campaign', campaignDir },
        kind,
      );
      set((s) => ({
        campaignTemplates: {
          ...s.campaignTemplates,
          [campaignDir]: {
            ...(s.campaignTemplates[campaignDir] ?? {}),
            [kind]: result.items,
          },
        },
        campaignFailures: {
          ...s.campaignFailures,
          [campaignDir]: {
            ...(s.campaignFailures[campaignDir] ?? {}),
            [kind]: result.failures,
          },
        },
      }));
      return result.items as TemplateOf<K>[];
    } catch {
      return [];
    }
  },

  invalidateGlobal: (kind) =>
    set((s) => {
      if (kind === undefined) return { globalTemplates: {} };
      const next = { ...s.globalTemplates };
      delete next[kind];
      return { globalTemplates: next };
    }),

  invalidateCampaign: (campaignDir, kind) =>
    set((s) => {
      const next = { ...s.campaignTemplates };
      if (kind === undefined) {
        delete next[campaignDir];
      } else if (next[campaignDir]) {
        const branch = { ...next[campaignDir] };
        delete branch[kind];
        next[campaignDir] = branch;
      }
      return { campaignTemplates: next };
    }),
}));
