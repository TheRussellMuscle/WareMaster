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

function bundledKeyFor(fallback: PortraitFallback): { kind: string; key: string } {
  switch (fallback.kind) {
    case 'class':
      return { kind: 'classes', key: fallback.classId };
    case 'monster': {
      const rank = fallback.rank;
      return rank
        ? { kind: 'monsters', key: `rank-${rank}` }
        : { kind: 'monsters', key: 'unknown' };
    }
    case 'ryude':
      return { kind: 'ryude', key: fallback.rType.toLowerCase() };
    case 'npc': {
      // Prefer the explicit role; fall back to archetype.
      if (fallback.role) {
        return { kind: 'npc', key: fallback.role };
      }
      return { kind: 'npc', key: fallback.archetype };
    }
  }
}

async function loadBundledUrl(kind: string, key: string): Promise<string | null> {
  const cacheKey = `${kind}/${key}`;
  let cached = bundledUrlCache.get(cacheKey);
  if (!cached) {
    cached = invoke<string>('bundled_portrait_url', { kind, key })
      .then((path) => convertFileSrc(path))
      .catch(() => null);
    bundledUrlCache.set(cacheKey, cached);
  }
  return cached;
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
    const { kind, key } = bundledKeyFor(args.fallback);
    void loadBundledUrl(kind, key).then((url) => {
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
