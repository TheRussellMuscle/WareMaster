import * as React from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { Portrait } from '@/components/portraits/Portrait';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InstanceSpawnDialog } from './InstanceSpawnDialog';
import { InstanceStatBlock } from './InstanceStatBlock';
import { FullCharacterNpcSheet } from './FullCharacterNpcSheet';
import { useCampaignStore } from '@/stores/campaign-store';
import { useReferenceStore } from '@/stores/reference-store';
import { useTemplateStore } from '@/stores/template-store';
import { useCustomItemStore } from '@/stores/custom-item-store';
import {
  indexTemplates,
  resolveMonsterTemplate,
  resolveNpcTemplate,
  resolveRyudeTemplate,
} from '@/engine/templates/resolve';
import { deleteInstance, updateInstance } from '@/persistence/instance-repo';
import { useActionLogStore } from '@/stores/action-log-store';
import { ActionLog } from '@/components/sheet/ActionLog';
import type { ActionLogEntry } from '@/domain/action-log';
import type { TemplateKind } from '@/persistence/paths';
import type { MonsterInstance } from '@/domain/monster-instance';
import type { RyudeInstance } from '@/domain/ryude-instance';
import type { NpcInstance } from '@/domain/npc-instance';
import type { MonsterTemplate, MonsterRank } from '@/domain/monster';
import type { RyudeTemplate, RyudeType } from '@/domain/ryude';
import type {
  FullCharacterNpc,
  NpcTemplate,
  NpcArchetype,
  NpcRole,
} from '@/domain/npc';
import type { Character } from '@/domain/character';
import type { Campaign } from '@/domain/campaign';
import type { PortraitFallback } from '@/hooks/usePortrait';
import { cn } from '@/lib/cn';

interface InstanceListProps {
  campaign: Campaign;
  kind: TemplateKind;
  title: string;
  description: string;
  openId?: string;
}

// Stable empty array — Zustand selectors must return the same reference
// across renders for unchanged state, otherwise React re-renders forever.
const EMPTY_CHARACTERS: Character[] = [];
const EMPTY_LOG: ActionLogEntry[] = [];

export function InstanceList({
  campaign,
  kind,
  title,
  description,
  openId,
}: InstanceListProps): React.JSX.Element {
  const campaignDir = campaign.dir_name;
  const instances = useCampaignStore(
    (s) => s.instancesByCampaign[campaignDir]?.[kind],
  );
  const loadInstancesFor = useCampaignStore((s) => s.loadInstancesFor);
  const charactersRaw = useCampaignStore(
    (s) => s.charactersByCampaign[campaignDir],
  );
  const characters = charactersRaw ?? EMPTY_CHARACTERS;
  const loadCharactersFor = useCampaignStore((s) => s.loadCharactersFor);
  const catalog = useReferenceStore((s) => s.catalog);
  const globalTemplates = useTemplateStore((s) => s.globalTemplates);
  const campaignTemplates = useTemplateStore((s) => s.campaignTemplates);
  const loadGlobal = useTemplateStore((s) => s.loadGlobal);
  const loadCampaignTemplates = useTemplateStore((s) => s.loadCampaign);
  const invalidate = useCampaignStore((s) => s.invalidateInstancesFor);
  const customItems = useCustomItemStore((s) => s.items ?? []);

  const cachedEntries = useActionLogStore((s) => s.entriesByCampaign[campaignDir]);
  const logEntries = cachedEntries ?? EMPTY_LOG;
  const logLoading = useActionLogStore((s) => !!s.loading[campaignDir]);
  const loadLog = useActionLogStore((s) => s.load);
  const clearLog = useActionLogStore((s) => s.clear);

  const [spawnOpen, setSpawnOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(openId ?? null);

  // Sync when the sidebar navigates to a different instance.
  React.useEffect(() => {
    if (openId) setExpandedId(openId);
  }, [openId]);

  React.useEffect(() => {
    void loadCharactersFor(campaignDir);
    void loadGlobal(kind);
    void loadCampaignTemplates(campaignDir, kind);
  }, [
    campaignDir,
    kind,
    loadCharactersFor,
    loadGlobal,
    loadCampaignTemplates,
  ]);

  React.useEffect(() => {
    void loadLog(campaignDir);
  }, [campaignDir, loadLog]);

  // Load instances on mount AND whenever the cache is invalidated (sets
  // `instances` back to undefined). Bounded: after load `instances` becomes
  // an array, so the effect doesn't re-fire until the next invalidation.
  React.useEffect(() => {
    if (instances === undefined) {
      void loadInstancesFor(campaignDir, kind);
    }
  }, [instances, campaignDir, kind, loadInstancesFor]);

  const vaultMonsters = React.useMemo(
    () => indexTemplates(globalTemplates.monster ?? []),
    [globalTemplates.monster],
  );
  const vaultRyude = React.useMemo(
    () => indexTemplates(globalTemplates.ryude ?? []),
    [globalTemplates.ryude],
  );
  const vaultNpcs = React.useMemo(
    () => indexTemplates(globalTemplates.npc ?? []),
    [globalTemplates.npc],
  );
  const campaignMonsters = React.useMemo(
    () => indexTemplates(campaignTemplates[campaignDir]?.monster ?? []),
    [campaignTemplates, campaignDir],
  );
  const campaignRyude = React.useMemo(
    () => indexTemplates(campaignTemplates[campaignDir]?.ryude ?? []),
    [campaignTemplates, campaignDir],
  );
  const campaignNpcs = React.useMemo(
    () => indexTemplates(campaignTemplates[campaignDir]?.npc ?? []),
    [campaignTemplates, campaignDir],
  );

  const onConfirmDelete = async () => {
    if (!deleting) return;
    await deleteInstance(campaignDir, kind, deleting);
    invalidate(campaignDir, kind);
    setDeleting(null);
  };

  return (
    <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <ParchmentCard>
        <header className="flex items-start justify-between gap-3">
          <div>
            <IlluminatedHeading level={2}>{title}</IlluminatedHeading>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSpawnOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25"
          >
            <Plus className="h-4 w-4" aria-hidden /> Spawn
          </button>
        </header>

        {instances === undefined ? (
          <p className="mt-6 text-sm italic text-[var(--color-ink-faint)]">
            Loading…
          </p>
        ) : instances.length === 0 ? (
          <div className="mt-6 rounded-sm border border-dashed border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)]/40 p-6 text-center text-sm italic text-[var(--color-ink-faint)]">
            No {title.toLowerCase()} spawned yet. Click <strong>Spawn</strong> to add one.
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--color-parchment-300)] rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40">
            {instances.map((instance) => (
              <InstanceRow
                key={instance.id}
                kind={kind}
                instance={instance}
                campaign={campaign}
                catalog={catalog}
                characters={characters}
                vaultMonsters={vaultMonsters}
                vaultRyude={vaultRyude}
                vaultNpcs={vaultNpcs}
                campaignMonsters={campaignMonsters}
                campaignRyude={campaignRyude}
                campaignNpcs={campaignNpcs}
                customItems={customItems}
                expanded={expandedId === instance.id}
                onToggle={() =>
                  setExpandedId((cur) =>
                    cur === instance.id ? null : instance.id,
                  )
                }
                onDelete={() => setDeleting(instance.id)}
              />
            ))}
          </ul>
        )}

        <InstanceSpawnDialog
          open={spawnOpen}
          onClose={() => setSpawnOpen(false)}
          kind={kind}
          campaignId={campaign.id}
          campaignDir={campaignDir}
          characters={characters}
        />

        <ConfirmDialog
          open={deleting != null}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Delete ${title.toLowerCase().replace(/s$/, '')}?`}
          description="The instance YAML and its custom portrait file will be removed. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={onConfirmDelete}
        />
      </ParchmentCard>

      <aside className="sticky top-0 hidden max-h-[calc(100vh-6rem)] self-start overflow-y-auto xl:block">
        <ActionLog
          entries={logEntries}
          loading={logLoading}
          campaignDir={campaignDir}
          onClear={() => clearLog(campaignDir)}
        />
      </aside>
    </div>
  );
}

interface InstanceRowProps {
  kind: TemplateKind;
  instance: MonsterInstance | RyudeInstance | NpcInstance;
  campaign: Campaign;
  catalog: ReturnType<typeof useReferenceStore.getState>['catalog'];
  characters: Character[];
  vaultMonsters: ReadonlyMap<string, MonsterTemplate>;
  vaultRyude: ReadonlyMap<string, RyudeTemplate>;
  vaultNpcs: ReadonlyMap<string, NpcTemplate>;
  campaignMonsters: ReadonlyMap<string, MonsterTemplate>;
  campaignRyude: ReadonlyMap<string, RyudeTemplate>;
  campaignNpcs: ReadonlyMap<string, NpcTemplate>;
  customItems: import('@/domain/custom-item').CustomItem[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function InstanceRow({
  kind,
  instance,
  campaign,
  catalog,
  characters,
  vaultMonsters,
  vaultRyude,
  vaultNpcs,
  campaignMonsters,
  campaignRyude,
  campaignNpcs,
  customItems,
  expanded,
  onToggle,
  onDelete,
}: InstanceRowProps): React.JSX.Element {
  // Local copy of the instance so the inline stat block can mutate state
  // optimistically without waiting for the parent's cache invalidation
  // round-trip. Synced to the prop on identity change.
  const [localInstance, setLocalInstance] = React.useState(instance);
  React.useEffect(() => {
    setLocalInstance(instance);
  }, [instance]);

  let subtitle = '';
  let fallback: PortraitFallback;
  let resolvedTemplate:
    | MonsterTemplate
    | RyudeTemplate
    | NpcTemplate
    | null = null;
  if (kind === 'monster') {
    const inst = localInstance as MonsterInstance;
    const r = resolveMonsterTemplate(
      inst.template_id,
      catalog,
      vaultMonsters,
      campaignMonsters,
    );
    const tpl = r.kind === 'resolved' ? r.template : null;
    resolvedTemplate = tpl;
    const rank: MonsterRank | null = inst.overrides.rank ?? tpl?.rank ?? null;
    subtitle =
      r.kind === 'missing'
        ? `⚠ template "${inst.template_id}" missing`
        : `${tpl?.name ?? inst.template_id} · Rank ${rank ?? '?'} · ${r.source}`;
    fallback = { kind: 'monster', rank, templateId: inst.template_id };
  } else if (kind === 'ryude') {
    const inst = localInstance as RyudeInstance;
    const r = resolveRyudeTemplate(
      inst.template_id,
      catalog,
      vaultRyude,
      campaignRyude,
    );
    const tpl = r.kind === 'resolved' ? r.template : null;
    resolvedTemplate = tpl;
    const rType: RyudeType = inst.overrides.type ?? tpl?.type ?? 'Footman';
    let opLabel = 'Unmanned';
    if (inst.equipped_operator) {
      const op = characters.find((c) => c.id === inst.equipped_operator!.id);
      opLabel = op ? op.name : '⚠ operator deleted';
    }
    subtitle =
      r.kind === 'missing'
        ? `⚠ template "${inst.template_id}" missing · ${opLabel}`
        : `${tpl?.name ?? inst.template_id} · ${rType} · ${opLabel}`;
    fallback = { kind: 'ryude', rType, templateId: inst.template_id };
  } else {
    const inst = localInstance as NpcInstance;
    const r = resolveNpcTemplate(inst.template_id, vaultNpcs, campaignNpcs);
    const tpl = r.kind === 'resolved' ? r.template : null;
    resolvedTemplate = tpl;
    const archetype: NpcArchetype = tpl?.archetype ?? 'simple';
    const role: NpcRole | null =
      tpl?.archetype === 'simple' ? tpl.role : null;
    subtitle =
      r.kind === 'missing'
        ? `⚠ template "${inst.template_id}" missing`
        : `${tpl?.name ?? inst.template_id} · ${archetype}${role ? ` · ${role}` : ''} · ${r.source}`;
    fallback = { kind: 'npc', archetype, role };
  }

  const persist = async (
    next: MonsterInstance | RyudeInstance | NpcInstance,
  ) => {
    setLocalInstance(next);
    await updateInstance(campaign.dir_name, kind, next as never);
  };

  const isFullCharNpc =
    kind === 'npc' &&
    resolvedTemplate !== null &&
    (resolvedTemplate as NpcTemplate).archetype === 'full-character';

  return (
    <li>
      {/* Collapsed header — always visible, clickable to expand */}
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
          expanded
            ? 'bg-[var(--color-parchment-200)]/60'
            : 'hover:bg-[var(--color-parchment-200)]/40',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={
            expanded ? `Collapse ${instance.name}` : `Expand ${instance.name}`
          }
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[var(--color-ink-faint)] transition-transform',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden
          />
          <Portrait
            vaultPath={instance.portrait_path}
            fallback={fallback}
            name={instance.name}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-[var(--color-ink)]">
              {instance.name}
            </div>
            <div className="truncate text-[10px] text-[var(--color-ink-faint)]">
              {subtitle}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
          aria-label={`Delete ${instance.name}`}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {/* Expanded card — full stat block + roll buttons */}
      {expanded && (
        <div className="border-t border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-4 py-4">
          {isFullCharNpc ? (
            <FullCharacterNpcSheet
              campaign={campaign}
              instance={localInstance as NpcInstance}
              template={resolvedTemplate as FullCharacterNpc}
              catalog={catalog}
              onPersist={async (next) => {
                await persist(next);
              }}
            />
          ) : (
            <InstanceStatBlock
              kind={kind}
              campaign={campaign}
              instance={localInstance}
              template={resolvedTemplate}
              characters={characters}
              npcTemplates={[...vaultNpcs.values(), ...campaignNpcs.values()]}
              catalog={catalog}
              customItems={customItems}
              onPersist={persist}
            />
          )}
        </div>
      )}
    </li>
  );
}
