import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Edit2, Sparkles, Trash2, Copy } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { Portrait } from '@/components/portraits/Portrait';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TemplateFormDialog } from './TemplateFormDialog';
import { TemplatePreview } from '@/components/instance/TemplatePreview';
import { CampaignPicker } from '@/components/instance/CampaignPicker';
import { InstanceSpawnDialog } from '@/components/instance/InstanceSpawnDialog';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useTemplateStore } from '@/stores/template-store';
import { useCampaignStore } from '@/stores/campaign-store';
import {
  deleteTemplate,
  newTemplateId,
  type TemplateOf,
} from '@/persistence/template-repo';
import { listCharacters } from '@/persistence/character-repo';
import type { TemplateKind } from '@/persistence/paths';
import type { TemplateSource } from '@/engine/templates/resolve';
import type { Campaign } from '@/domain/campaign';
import type { Character } from '@/domain/character';
import type { MonsterTemplate, MonsterRank } from '@/domain/monster';
import type { RyudeTemplate, RyudeType } from '@/domain/ryude';
import type { NpcTemplate, NpcArchetype, NpcRole } from '@/domain/npc';
import type { PortraitFallback } from '@/hooks/usePortrait';

interface TemplateDetailRouteProps {
  kind: TemplateKind;
  templateId: string;
  /** Route to navigate back to (the kind's template list). */
  backTo:
    | '/templates/monsters'
    | '/templates/ryude'
    | '/templates/npcs';
}

type AnyTemplate = MonsterTemplate | RyudeTemplate | NpcTemplate;

export function TemplateDetailRoute({
  kind,
  templateId,
  backTo,
}: TemplateDetailRouteProps): React.JSX.Element {
  const { catalog } = useReferenceData();
  const globalTemplates = useTemplateStore((s) => s.globalTemplates);
  const loadGlobal = useTemplateStore((s) => s.loadGlobal);
  const invalidateGlobal = useTemplateStore((s) => s.invalidateGlobal);
  const campaignList = useCampaignStore((s) => s.list);
  const refreshCampaignList = useCampaignStore((s) => s.refreshList);
  const navigate = useNavigate();

  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Spawn flow state
  const [spawnCampaign, setSpawnCampaign] = React.useState<Campaign | null>(null);
  const [campaignPickerOpen, setCampaignPickerOpen] = React.useState(false);
  const [spawnCharacters, setSpawnCharacters] = React.useState<Character[]>([]);
  const [spawnOpen, setSpawnOpen] = React.useState(false);

  React.useEffect(() => {
    void loadGlobal(kind);
    void refreshCampaignList();
  }, [kind, loadGlobal, refreshCampaignList]);

  const resolved = React.useMemo<{
    source: TemplateSource;
    template: AnyTemplate;
  } | null>(() => {
    // Try vault first.
    const vault = (globalTemplates[kind] ?? []) as AnyTemplate[];
    const vaultMatch = vault.find((t) => (t as { id: string }).id === templateId);
    if (vaultMatch) return { source: 'vault', template: vaultMatch };
    // Then bundled.
    if (kind === 'monster' && catalog) {
      const m = catalog.beastiary.monsters.find((t) => t.id === templateId);
      if (m) return { source: 'bundled', template: m };
    }
    if (kind === 'ryude' && catalog) {
      const r = catalog.ryudeUnits.ryude_units.find((t) => t.id === templateId);
      if (r) return { source: 'bundled', template: r };
    }
    return null;
  }, [globalTemplates, kind, templateId, catalog]);

  const fallback: PortraitFallback = React.useMemo(() => {
    if (kind === 'monster') {
      const t = resolved?.template as MonsterTemplate | undefined;
      const rank: MonsterRank | null = t?.rank ?? null;
      return { kind: 'monster', rank, templateId };
    }
    if (kind === 'ryude') {
      const t = resolved?.template as RyudeTemplate | undefined;
      const rType: RyudeType = t?.type ?? 'Footman';
      return { kind: 'ryude', rType, templateId };
    }
    const t = resolved?.template as NpcTemplate | undefined;
    const archetype: NpcArchetype = t?.archetype ?? 'simple';
    const role: NpcRole | null =
      t?.archetype === 'simple' ? t.role : null;
    return { kind: 'npc', archetype, role, templateId };
  }, [kind, resolved, templateId]);

  const onConfirmDelete = async () => {
    if (!resolved || resolved.source !== 'vault') return;
    await deleteTemplate({ kind: 'global' }, kind, templateId);
    invalidateGlobal(kind);
    setDeleting(false);
    void navigate({ to: backTo });
  };

  const onClickSpawn = async () => {
    if (campaignList.length === 1) {
      const c = campaignList[0]!;
      setSpawnCampaign(c);
      const result = await listCharacters(c.dir_name);
      setSpawnCharacters(result.items);
      setSpawnOpen(true);
    } else {
      setCampaignPickerOpen(true);
    }
  };

  const onPickCampaign = async (c: Campaign) => {
    setSpawnCampaign(c);
    const result = await listCharacters(c.dir_name);
    setSpawnCharacters(result.items);
    setSpawnOpen(true);
  };

  const onSpawned = () => {
    if (!spawnCampaign) return;
    if (kind === 'monster') {
      void navigate({
        to: '/campaigns/$cid/monsters',
        params: { cid: spawnCampaign.dir_name },
      });
    } else if (kind === 'ryude') {
      void navigate({
        to: '/campaigns/$cid/ryude',
        params: { cid: spawnCampaign.dir_name },
      });
    } else {
      void navigate({
        to: '/campaigns/$cid/npcs',
        params: { cid: spawnCampaign.dir_name },
      });
    }
    setSpawnOpen(false);
    setSpawnCampaign(null);
  };

  const onDuplicate = () => {
    if (!resolved) return;
    // Open the editor with a fresh id and modified source
    // The form dialog handles a new template via its `existing` slot if we
    // pass a duplicate; or we navigate to /templates/<kind>?new with state.
    // Simplest: trigger the editor dialog with the duplicate as `existing`
    // (form treats it as edit, but since the id is new it'll be created on save).
    // For UX simplicity, just open the form pre-filled.
    setDuplicateOpen(true);
  };

  const [duplicateOpen, setDuplicateOpen] = React.useState(false);
  const duplicateDraft = React.useMemo<TemplateOf<TemplateKind> | null>(() => {
    if (!resolved || !duplicateOpen) return null;
    const original = resolved.template as { id: string; name: string };
    return {
      ...(resolved.template as object),
      id: newTemplateId(kind),
      name: `${original.name} (copy)`,
      source: `user (from ${original.id})`,
    } as TemplateOf<TemplateKind>;
  }, [resolved, duplicateOpen, kind]);

  if (!resolved) {
    return (
      <ParchmentCard>
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <p className="mt-3 text-sm text-[var(--color-rust)]">
          Template <code className="font-mono">{templateId}</code> not found.
        </p>
      </ParchmentCard>
    );
  }

  const isVault = resolved.source === 'vault';

  return (
    <ParchmentCard>
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]"
      >
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>

      <header className="mt-3 flex items-start gap-4">
        <Portrait
          fallback={fallback}
          name={(resolved.template as { name: string }).name}
          size="lg"
        />
        <div className="flex-1">
          <IlluminatedHeading level={1}>
            {(resolved.template as { name: string }).name}
          </IlluminatedHeading>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-ink-faint)]">
            <span className="font-mono">{templateId}</span>
            <span
              className={
                isVault
                  ? 'rounded-sm border border-[var(--color-verdigris)]/40 bg-[var(--color-verdigris)]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-verdigris)]'
                  : 'rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-200)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)]'
              }
            >
              {resolved.source}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onClickSpawn()}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Spawn into campaign
            </button>
            {isVault ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
                >
                  <Edit2 className="h-3.5 w-3.5" aria-hidden /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(true)}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onDuplicate}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden /> Duplicate to vault
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6">
        <h3 className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
          Stat block
        </h3>
        <div className="mt-2">
          <TemplatePreview
            kind={kind}
            selected={{ source: resolved.source, template: resolved.template }}
          />
        </div>
      </div>

      {isVault && (
        <TemplateFormDialog
          open={editing}
          onClose={() => setEditing(false)}
          kind={kind}
          scope={{ kind: 'global' }}
          existing={resolved.template as TemplateOf<TemplateKind>}
        />
      )}

      <TemplateFormDialog
        open={duplicateOpen && duplicateDraft != null}
        onClose={() => setDuplicateOpen(false)}
        kind={kind}
        scope={{ kind: 'global' }}
        existing={duplicateDraft}
        onSaved={(saved) => {
          // Navigate to the new template's detail page
          const id = (saved as { id: string }).id;
          if (kind === 'monster') {
            void navigate({ to: '/templates/monsters/$tid', params: { tid: id } });
          } else if (kind === 'ryude') {
            void navigate({ to: '/templates/ryude/$tid', params: { tid: id } });
          } else {
            void navigate({ to: '/templates/npcs/$tid', params: { tid: id } });
          }
        }}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete template?"
        description="The template YAML file will be removed. Existing instances that reference this template will fall back to bundled (where applicable) or show a missing-template banner. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirmDelete}
      />

      <CampaignPicker
        open={campaignPickerOpen}
        onClose={() => setCampaignPickerOpen(false)}
        title="Spawn into a campaign"
        description={`Choose where to spawn ${(resolved.template as { name: string }).name}.`}
        onPick={(c) => void onPickCampaign(c)}
      />

      {spawnOpen && spawnCampaign && (
        <InstanceSpawnDialog
          open
          onClose={() => {
            setSpawnOpen(false);
            setSpawnCampaign(null);
          }}
          kind={kind}
          campaignId={spawnCampaign.id}
          campaignDir={spawnCampaign.dir_name}
          characters={spawnCharacters}
          preselectedTemplate={resolved}
          onSpawned={onSpawned}
        />
      )}
    </ParchmentCard>
  );
}
