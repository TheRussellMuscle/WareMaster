import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { Portrait } from '@/components/portraits/Portrait';
import { PortraitPicker } from '@/components/portraits/PortraitPicker';
import { InstanceStatBlock } from './InstanceStatBlock';
import { FullCharacterNpcSheet } from './FullCharacterNpcSheet';
import {
  getInstance,
  updateInstance,
} from '@/persistence/instance-repo';
import { useCampaignStore } from '@/stores/campaign-store';
import { useReferenceStore } from '@/stores/reference-store';
import { useTemplateStore } from '@/stores/template-store';
import { useActionLogStore } from '@/stores/action-log-store';
import { useCustomItemStore } from '@/stores/custom-item-store';
import { ActionLog } from '@/components/sheet/ActionLog';
import type { ActionLogEntry } from '@/domain/action-log';
import {
  indexTemplates,
  resolveMonsterTemplate,
  resolveNpcTemplate,
  resolveRyudeTemplate,
  type ResolveResult,
} from '@/engine/templates/resolve';
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
import type { Campaign } from '@/domain/campaign';
import type { PortraitFallback } from '@/hooks/usePortrait';
import type { PortraitTarget } from '@/persistence/portrait-repo';

type Instance = MonsterInstance | RyudeInstance | NpcInstance;
type Template = MonsterTemplate | RyudeTemplate | NpcTemplate;

interface InstanceDetailProps {
  campaign: Campaign;
  kind: TemplateKind;
  instanceId: string;
  /** Route to navigate back to (instance list). */
  backTo:
    | '/campaigns/$cid/monsters'
    | '/campaigns/$cid/ryude'
    | '/campaigns/$cid/npcs';
}

// Stable empty array — see InstanceList.tsx for the why.
const EMPTY_CHARACTERS: ReturnType<typeof useCampaignStore.getState>['charactersByCampaign'][string] = [];
const EMPTY_LOG: ActionLogEntry[] = [];

export function InstanceDetail({
  campaign,
  kind,
  instanceId,
  backTo,
}: InstanceDetailProps): React.JSX.Element {
  const campaignDir = campaign.dir_name;
  const [instance, setInstance] = React.useState<Instance | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const catalog = useReferenceStore((s) => s.catalog);
  const globalTemplates = useTemplateStore((s) => s.globalTemplates);
  const campaignTemplates = useTemplateStore((s) => s.campaignTemplates);
  const loadGlobal = useTemplateStore((s) => s.loadGlobal);
  const loadCampaignTemplates = useTemplateStore((s) => s.loadCampaign);
  const charactersRaw = useCampaignStore(
    (s) => s.charactersByCampaign[campaignDir],
  );
  const characters = charactersRaw ?? EMPTY_CHARACTERS;
  const loadCharactersFor = useCampaignStore((s) => s.loadCharactersFor);
  const invalidate = useCampaignStore((s) => s.invalidateInstancesFor);
  const customItems = useCustomItemStore((s) => s.items ?? []);

  const cachedEntries = useActionLogStore((s) => s.entriesByCampaign[campaignDir]);
  const logEntries = cachedEntries ?? EMPTY_LOG;
  const logLoading = useActionLogStore((s) => !!s.loading[campaignDir]);
  const loadLog = useActionLogStore((s) => s.load);
  const clearLog = useActionLogStore((s) => s.clear);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getInstance(campaignDir, kind, instanceId).then((inst) => {
      if (cancelled) return;
      setInstance(inst);
      setLoading(false);
    });
    void loadGlobal(kind);
    void loadCampaignTemplates(campaignDir, kind);
    void loadCharactersFor(campaignDir);
    return () => {
      cancelled = true;
    };
  }, [
    campaignDir,
    kind,
    instanceId,
    loadGlobal,
    loadCampaignTemplates,
    loadCharactersFor,
  ]);

  React.useEffect(() => {
    void loadLog(campaignDir);
  }, [campaignDir, loadLog]);

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

  const resolved = React.useMemo<ResolveResult<Template> | null>(() => {
    if (!instance) return null;
    if (kind === 'monster') {
      return resolveMonsterTemplate(
        instance.template_id,
        catalog,
        vaultMonsters,
        campaignMonsters,
      ) as ResolveResult<Template>;
    }
    if (kind === 'ryude') {
      return resolveRyudeTemplate(
        instance.template_id,
        catalog,
        vaultRyude,
        campaignRyude,
      ) as ResolveResult<Template>;
    }
    return resolveNpcTemplate(
      instance.template_id,
      vaultNpcs,
      campaignNpcs,
    ) as ResolveResult<Template>;
  }, [
    catalog,
    vaultMonsters,
    vaultRyude,
    vaultNpcs,
    campaignMonsters,
    campaignRyude,
    campaignNpcs,
    instance,
    kind,
  ]);

  const fallback: PortraitFallback = React.useMemo(() => {
    if (!instance) return { kind: 'class', classId: 'tradesfolk' };
    const tpl = resolved?.kind === 'resolved' ? resolved.template : null;
    if (kind === 'monster') {
      const m = (tpl ?? null) as MonsterTemplate | null;
      const inst = instance as MonsterInstance;
      const rank: MonsterRank | null = inst.overrides.rank ?? m?.rank ?? null;
      return { kind: 'monster', rank, templateId: inst.template_id };
    }
    if (kind === 'ryude') {
      const r = (tpl ?? null) as RyudeTemplate | null;
      const inst = instance as RyudeInstance;
      const rType: RyudeType = inst.overrides.type ?? r?.type ?? 'Footman';
      return { kind: 'ryude', rType, templateId: inst.template_id };
    }
    const n = (tpl ?? null) as NpcTemplate | null;
    const archetype: NpcArchetype = n?.archetype ?? 'simple';
    const role: NpcRole | null = n?.archetype === 'simple' ? n.role : null;
    return { kind: 'npc', archetype, role };
  }, [instance, resolved, kind]);

  const portraitTarget: PortraitTarget | null = React.useMemo(() => {
    if (!instance) return null;
    if (kind === 'monster') return { kind: 'monster-instance', id: instance.id };
    if (kind === 'ryude') return { kind: 'ryude-instance', id: instance.id };
    return { kind: 'npc-instance', id: instance.id };
  }, [instance, kind]);

  const persist = async (next: Instance) => {
    setSaveError(null);
    try {
      const saved = await updateInstance(campaignDir, kind, next as never);
      setInstance(saved);
      invalidate(campaignDir, kind);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <ParchmentCard>
        <p className="text-sm italic text-[var(--color-ink-faint)]">Loading…</p>
      </ParchmentCard>
    );
  }
  if (!instance) {
    return (
      <ParchmentCard>
        <Link
          to={backTo}
          params={{ cid: campaignDir }}
          search={{ open: undefined }}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <p className="mt-3 text-sm text-[var(--color-rust)]">
          Instance not found.
        </p>
      </ParchmentCard>
    );
  }

  const resolvedTemplate =
    resolved?.kind === 'resolved' ? resolved.template : null;
  const isFullCharNpc =
    kind === 'npc' &&
    resolvedTemplate !== null &&
    (resolvedTemplate as NpcTemplate).archetype === 'full-character';

  return (
    <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex w-full flex-col gap-4">
        <ParchmentCard>
          <Link
            to={backTo}
            params={{ cid: campaignDir }}
            search={{ open: undefined }}
            className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </Link>

          <div className="mt-3 flex items-start gap-4">
            <Portrait
              vaultPath={instance.portrait_path}
              fallback={fallback}
              name={instance.name}
              size="2xl"
              clickable
            />
            <div className="flex-1">
              <input
                type="text"
                value={instance.name}
                onChange={(e) =>
                  setInstance({ ...instance, name: e.target.value } as Instance)
                }
                onBlur={() => void persist(instance)}
                className="w-full bg-transparent font-display text-3xl text-[var(--color-ink)] outline-none focus:bg-[var(--color-parchment-100)]/40 focus:px-1"
              />
              <div className="mt-1 text-xs text-[var(--color-ink-faint)]">
                <span className="font-mono">{instance.id}</span>
                {' · template '}
                <span className="font-mono">{instance.template_id}</span>
                {resolved?.kind === 'resolved' && ` · ${resolved.source}`}
              </div>
              {portraitTarget && (
                <div className="mt-3">
                  <PortraitPicker
                    fallback={fallback}
                    name={instance.name}
                    mode={{
                      kind: 'live',
                      target: portraitTarget,
                      vaultPath: instance.portrait_path,
                      onChange: (path) => {
                        void persist({ ...instance, portrait_path: path } as Instance);
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {resolved?.kind === 'missing' && (
            <div className="mt-4 rounded-sm border-2 border-[var(--color-gilt)]/40 bg-[var(--color-gilt)]/10 p-3 text-sm text-[var(--color-ink-soft)]">
              <strong>Template missing.</strong> The template{' '}
              <code>{resolved.templateId}</code> is not present in the campaign,
              vault, or bundled reference. Add it to your vault or this campaign's
              templates folder, or delete this instance.
            </div>
          )}

          {saveError && (
            <div className="mt-3 rounded-sm border border-[var(--color-rust)]/60 bg-[var(--color-rust)]/10 p-2 text-xs text-[var(--color-rust)]">
              Save failed: {saveError}
            </div>
          )}
        </ParchmentCard>

        {isFullCharNpc ? (
          <FullCharacterNpcSheet
            campaign={campaign}
            instance={instance as NpcInstance}
            template={resolvedTemplate as FullCharacterNpc}
            catalog={catalog}
            onPersist={async (next) => {
              setInstance(next);
              await persist(next);
            }}
          />
        ) : (
          <ParchmentCard>
            <InstanceStatBlock
              kind={kind}
              campaign={campaign}
              instance={instance}
              template={resolvedTemplate}
              characters={characters}
              npcTemplates={[...vaultNpcs.values(), ...campaignNpcs.values()]}
              catalog={catalog}
              customItems={customItems}
              onPersist={async (next) => {
                setInstance(next);
                await persist(next);
              }}
            />
          </ParchmentCard>
        )}
      </div>

      <aside className="sticky top-0 hidden max-h-[calc(100vh-6rem)] self-start overflow-y-auto xl:block">
        <ActionLog
          entries={logEntries}
          loading={logLoading}
          campaignDir={campaignDir}
          currentCharacterId={instance.id}
          onClear={() => clearLog(campaignDir)}
        />
      </aside>
    </div>
  );
}

