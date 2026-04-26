import { create } from 'zustand';
import {
  appendActionLog as repoAppend,
  clearActionLog as repoClear,
  getActionLog as repoGet,
} from '@/persistence/action-log-repo';
import type { ActionLogEntry } from '@/domain/action-log';

interface ActionLogState {
  /** Cached entries per campaign dir. */
  entriesByCampaign: Record<string, ActionLogEntry[]>;
  /** True while a campaign's log is being read off disk for the first time. */
  loading: Record<string, boolean>;
  /** Read the log (cached after first call). */
  load: (
    campaignDir: string,
    options?: { force?: boolean },
  ) => Promise<ActionLogEntry[]>;
  /** Append + persist one entry. */
  append: (campaignDir: string, entry: ActionLogEntry) => Promise<void>;
  /** Empty the log and persist. */
  clear: (campaignDir: string) => Promise<void>;
  /** Synchronous getter for what's already cached. */
  get: (campaignDir: string) => ActionLogEntry[];
}

/**
 * Campaign-wide action log state. Lazily loaded per-campaign on first
 * subscribe, then maintained in memory + on disk via the action-log-repo.
 *
 * Distinct from the per-campaign event log (Phase 6 — `events.ndjson`).
 * This is the convenience surface for live play; the canonical undo/rewind
 * mechanism is the future event log.
 */
export const useActionLogStore = create<ActionLogState>((set, getState) => ({
  entriesByCampaign: {},
  loading: {},

  load: async (campaignDir, options) => {
    if (!options?.force) {
      const cached = getState().entriesByCampaign[campaignDir];
      if (cached) return cached;
    }
    set((s) => ({ loading: { ...s.loading, [campaignDir]: true } }));
    try {
      const entries = await repoGet(campaignDir);
      set((s) => ({
        entriesByCampaign: {
          ...s.entriesByCampaign,
          [campaignDir]: entries,
        },
        loading: { ...s.loading, [campaignDir]: false },
      }));
      return entries;
    } catch {
      set((s) => ({ loading: { ...s.loading, [campaignDir]: false } }));
      return [];
    }
  },

  append: async (campaignDir, entry) => {
    const next = await repoAppend(campaignDir, entry);
    set((s) => ({
      entriesByCampaign: {
        ...s.entriesByCampaign,
        [campaignDir]: next,
      },
    }));
  },

  clear: async (campaignDir) => {
    await repoClear(campaignDir);
    set((s) => ({
      entriesByCampaign: {
        ...s.entriesByCampaign,
        [campaignDir]: [],
      },
    }));
  },

  get: (campaignDir) => getState().entriesByCampaign[campaignDir] ?? [],
}));
