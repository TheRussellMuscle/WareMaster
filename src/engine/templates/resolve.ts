/**
 * Template resolution chain (PLAN.md §B lines 152-157):
 *
 *   campaign-scoped → global vault → bundled reference → "missing" repair UI
 *
 * Campaign overrides wins. The resolver is pure — it takes pre-loaded indexes
 * and a template id, and returns either the resolved template tagged with its
 * source, or a "missing" marker so the UI can render a yellow repair banner
 * (PLAN.md line 157: "not crashed").
 */

import type { TemplateKind } from '@/persistence/paths';
import type { MonsterTemplate } from '@/domain/monster';
import type { RyudeTemplate } from '@/domain/ryude';
import type { NpcTemplate } from '@/domain/npc';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export type TemplateSource = 'bundled' | 'vault' | 'campaign';

export interface ResolvedTemplate<T> {
  kind: 'resolved';
  source: TemplateSource;
  template: T;
}

export interface MissingTemplate {
  kind: 'missing';
  templateKind: TemplateKind;
  templateId: string;
}

export type ResolveResult<T> = ResolvedTemplate<T> | MissingTemplate;

/**
 * Generic resolver over `<T extends { id: string }>`. The tier indexes are
 * passed as Maps so the call site can build them once per render and reuse
 * them across many lookups.
 */
function resolveByTier<T extends { id: string }>(
  templateKind: TemplateKind,
  templateId: string,
  campaignIndex: ReadonlyMap<string, T>,
  vaultIndex: ReadonlyMap<string, T>,
  bundledIndex: ReadonlyMap<string, T>,
): ResolveResult<T> {
  const campaign = campaignIndex.get(templateId);
  if (campaign) return { kind: 'resolved', source: 'campaign', template: campaign };
  const vault = vaultIndex.get(templateId);
  if (vault) return { kind: 'resolved', source: 'vault', template: vault };
  const bundled = bundledIndex.get(templateId);
  if (bundled) return { kind: 'resolved', source: 'bundled', template: bundled };
  return { kind: 'missing', templateKind, templateId };
}

/** Build a lookup Map from an array of templates. */
export function indexTemplates<T extends { id: string }>(
  templates: ReadonlyArray<T>,
): Map<string, T> {
  const m = new Map<string, T>();
  for (const t of templates) m.set(t.id, t);
  return m;
}

export function resolveMonsterTemplate(
  templateId: string,
  catalog: ReferenceCatalog | null,
  vaultIndex: ReadonlyMap<string, MonsterTemplate>,
  campaignIndex: ReadonlyMap<string, MonsterTemplate>,
): ResolveResult<MonsterTemplate> {
  const bundledIndex = catalog
    ? indexTemplates(catalog.beastiary.monsters)
    : new Map<string, MonsterTemplate>();
  return resolveByTier(
    'monster',
    templateId,
    campaignIndex,
    vaultIndex,
    bundledIndex,
  );
}

export function resolveRyudeTemplate(
  templateId: string,
  catalog: ReferenceCatalog | null,
  vaultIndex: ReadonlyMap<string, RyudeTemplate>,
  campaignIndex: ReadonlyMap<string, RyudeTemplate>,
): ResolveResult<RyudeTemplate> {
  const bundledIndex = catalog
    ? indexTemplates(catalog.ryudeUnits.ryude_units)
    : new Map<string, RyudeTemplate>();
  return resolveByTier(
    'ryude',
    templateId,
    campaignIndex,
    vaultIndex,
    bundledIndex,
  );
}

/**
 * NPCs have no bundled tier — they are entirely user-authored. The bundled
 * map is always empty; the chain collapses to vault → campaign.
 */
export function resolveNpcTemplate(
  templateId: string,
  vaultIndex: ReadonlyMap<string, NpcTemplate>,
  campaignIndex: ReadonlyMap<string, NpcTemplate>,
): ResolveResult<NpcTemplate> {
  return resolveByTier(
    'npc',
    templateId,
    campaignIndex,
    vaultIndex,
    new Map<string, NpcTemplate>(),
  );
}
