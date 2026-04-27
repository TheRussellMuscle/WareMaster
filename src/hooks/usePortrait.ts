/**
 * Portrait resolution chain (Phase 4 / PLAN.md §B):
 *
 *   1. Custom path (instance.portrait_path) — user-uploaded into the vault
 *   2. Template default custom (portraits/templates/<kind>s/<id>.<ext>)
 *   3. Bundled default — served from src-tauri/resources/portraits via the
 *      Tauri asset protocol
 *   4. CSS placeholder (rendered by `<Portrait>` itself when this returns null)
 *
 * Step 2 is best-effort: we don't currently probe for it (would add an IPC
 * round-trip per render). Templates uploaded via the editor get the same
 * vault path their consumers will read, so callers that know the template id
 * pass it through `templateId` to enable that tier in a future revision.
 */

import * as React from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { useVaultStore } from '@/stores/vault-store';
import type { ClassId } from '@/domain/class';
import type { MonsterRank } from '@/domain/monster';
import type { RyudeType } from '@/domain/ryude';
import type { NpcArchetype, NpcRole } from '@/domain/npc';

export type PortraitFallback =
  | { kind: 'class'; classId: ClassId }
  | { kind: 'monster'; rank?: MonsterRank | null; templateId?: string }
  | { kind: 'ryude'; rType: RyudeType; templateId?: string }
  | {
      kind: 'npc';
      archetype: NpcArchetype;
      role?: NpcRole | null;
      templateId?: string;
    };

export type PortraitTier = 'custom' | 'bundled' | 'placeholder';

export interface UsePortraitResult {
  url: string | null;
  tier: PortraitTier;
  loading: boolean;
}

/** Module-level cache so identical bundled lookups across many components hit the IPC layer once. */
const bundledUrlCache = new Map<string, Promise<string | null>>();

function bundledKeyFor(fallback: PortraitFallback): { kind: string; keys: string[] } {
  switch (fallback.kind) {
    case 'class':
      return { kind: 'classes', keys: [fallback.classId] };
    case 'monster': {
      const keys: string[] = [];
      if (fallback.templateId) keys.push(fallback.templateId);
      if (fallback.rank) keys.push(`rank-${fallback.rank}`);
      keys.push('unknown');
      return { kind: 'monsters', keys };
    }
    case 'ryude': {
      const keys: string[] = [];
      if (fallback.templateId) keys.push(fallback.templateId);
      keys.push(fallback.rType.toLowerCase());
      return { kind: 'ryude', keys };
    }
    case 'npc': {
      const keys: string[] = [];
      if (fallback.role) keys.push(fallback.role);
      keys.push(fallback.archetype);
      return { kind: 'npc', keys };
    }
  }
}

async function loadBundledUrl(kind: string, key: string): Promise<string | null> {
  const cacheKey = `${kind}/${key}`;
  let cached = bundledUrlCache.get(cacheKey);
  if (!cached) {
    cached = invoke<string>('bundled_portrait_url', { kind, key })
      .catch(() => null);
    bundledUrlCache.set(cacheKey, cached);
  }
  return cached;
}

async function loadFirstBundledUrl(kind: string, keys: string[]): Promise<string | null> {
  for (const key of keys) {
    const url = await loadBundledUrl(kind, key);
    if (url !== null) return url;
  }
  return null;
}

function customUrlFromVault(
  vaultPath: string | null | undefined,
  root: string | null,
): string | null {
  if (!vaultPath || !root) return null;
  const sep = root.includes('\\') ? '\\' : '/';
  const trimmedRoot = root.replace(/[\\/]$/, '');
  const trimmedRel = vaultPath.replace(/^[\\/]/, '').replace(/\\/g, '/');
  return convertFileSrc(`${trimmedRoot}${sep}${trimmedRel}`);
}

export function usePortrait(args: {
  vaultPath: string | null | undefined;
  fallback: PortraitFallback;
}): UsePortraitResult {
  const root = useVaultStore((s) => s.root);
  const [bundled, setBundled] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fallbackKey = JSON.stringify(args.fallback);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { kind, keys } = bundledKeyFor(args.fallback);
    void loadFirstBundledUrl(kind, keys).then((url) => {
      if (cancelled) return;
      setBundled(url);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackKey]);

  const customUrl = customUrlFromVault(args.vaultPath, root);

  if (customUrl) {
    return { url: customUrl, tier: 'custom', loading: false };
  }
  if (bundled) {
    return { url: bundled, tier: 'bundled', loading };
  }
  return { url: null, tier: 'placeholder', loading };
}
