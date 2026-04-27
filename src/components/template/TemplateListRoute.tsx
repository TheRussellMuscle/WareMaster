import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ChevronDown,
  Copy,
  Edit2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Portrait } from '@/components/portraits/Portrait';
import { TemplatePreview } from '@/components/instance/TemplatePreview';
import { TemplateFormDialog } from './TemplateFormDialog';
import { CampaignPicker } from '@/components/instance/CampaignPicker';
import { InstanceSpawnDialog } from '@/components/instance/InstanceSpawnDialog';
import { listCharacters } from '@/persistence/character-repo';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useTemplateStore } from '@/stores/template-store';
import { useCampaignStore } from '@/stores/campaign-store';
import {
  deleteTemplate,
  newTemplateId,
  type TemplateOf,
} from '@/persistence/template-repo';
import type { TemplateKind } from '@/persistence/paths';
import type { TemplateSource } from '@/engine/templates/resolve';
import type { Campaign } from '@/domain/campaign';
import type { Character } from '@/domain/character';
import type { MonsterTemplate, MonsterRank } from '@/domain/monster';
import type { RyudeTemplate, RyudeType } from '@/domain/ryude';
import type {
  NpcArchetype,
  NpcRole,
  NpcTemplate,
  SimpleNpc,
} from '@/domain/npc';
import type { PortraitFallback } from '@/hooks/usePortrait';
import { cn } from '@/lib/cn';

interface TemplateListRouteProps {
  kind: TemplateKind;
  title: string;
  description: string;
}

interface Row {
  id: string;
  name: string;
  source: 'bundled' | 'vault';
  template: MonsterTemplate | RyudeTemplate | NpcTemplate;
}

export function TemplateListRoute({
  kind,
  title,
  description,
}: TemplateListRouteProps): React.JSX.Element {
  const { catalog } = useReferenceData();
  const globalTemplates = useTemplateStore((s) => s.globalTemplates);
  const loadGlobal = useTemplateStore((s) => s.loadGlobal);
  const invalidateGlobal = useTemplateStore((s) => s.invalidateGlobal);
  const campaignList = useCampaignStore((s) => s.list);
  const refreshCampaignList = useCampaignStore((s) => s.refreshList);
  const navigate = useNavigate();

  const [editing, setEditing] = React.useState<TemplateOf<TemplateKind> | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<TemplateOf<TemplateKind> | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Spawn flow state
  const [spawnTemplate, setSpawnTemplate] = React.useState<{
    source: TemplateSource;
    template: MonsterTemplate | RyudeTemplate | NpcTemplate;
  } | null>(null);
  const [spawnCampaign, setSpawnCampaign] = React.useState<Campaign | null>(null);
  const [campaignPickerOpen, setCampaignPickerOpen] = React.useState(false);
  const [spawnCharacters, setSpawnCharacters] = React.useState<Character[]>([]);

  React.useEffect(() => {
    void loadGlobal(kind);
    void refreshCampaignList();
  }, [kind, loadGlobal, refreshCampaignList]);

  const rows = React.useMemo<Row[]>(() => {
    const all: Row[] = [];
    if (kind === 'monster' && catalog) {
      for (const t of catalog.beastiary.monsters) {
        all.push({ id: t.id, name: t.name, source: 'bundled', template: t });
      }
    }
    if (kind === 'ryude' && catalog) {
      for (const t of catalog.ryudeUnits.ryude_units) {
        all.push({ id: t.id, name: t.name, source: 'bundled', template: t });
      }
    }
    for (const t of globalTemplates[kind] ?? []) {
      const name = (t as { name: string }).name;
      const id = (t as { id: string }).id;
      all.push({ id, name, source: 'vault', template: t });
    }
    return all.sort((a, b) => {
      if (a.source !== b.source) return a.source === 'vault' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [catalog, globalTemplates, kind]);

  const onConfirmDelete = async () => {
    if (!deleting) return;
    await deleteTemplate(
      { kind: 'global' },
      kind,
      (deleting as { id: string }).id,
    );
    invalidateGlobal(kind);
    setDeleting(null);
  };

  const toggleExpanded = (rowKey: string) => {
    setExpandedId((cur) => (cur === rowKey ? null : rowKey));
  };

  const fallbackForRow = (row: Row): PortraitFallback => {
    if (kind === 'monster') {
      const t = row.template as MonsterTemplate;
      const rank: MonsterRank | null = t.rank ?? null;
      return { kind: 'monster', rank, templateId: row.id };
    }
    if (kind === 'ryude') {
      const t = row.template as RyudeTemplate;
      const rType: RyudeType = t.type ?? 'Footman';
      return { kind: 'ryude', rType, templateId: row.id };
    }
    const t = row.template as NpcTemplate;
    const archetype: NpcArchetype = t.archetype;
    const role: NpcRole | null =
      t.archetype === 'simple' ? (t as SimpleNpc).role : null;
    return { kind: 'npc', archetype, role, templateId: row.id };
  };

  const onClickSpawn = async (row: Row) => {
    setSpawnTemplate({ source: row.source, template: row.template });
    if (campaignList.length === 1) {
      // Only one campaign — skip the picker
      const c = campaignList[0]!;
      setSpawnCampaign(c);
      const result = await listCharacters(c.dir_name);
      setSpawnCharacters(result.items);
    } else {
      setCampaignPickerOpen(true);
    }
  };

  const onPickCampaign = async (c: Campaign) => {
    setSpawnCampaign(c);
    const result = await listCharacters(c.dir_name);
    setSpawnCharacters(result.items);
  };

  const onSpawned = () => {
    if (!spawnCampaign) return;
    // Navigate to the campaign's instance list for this kind
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
    setSpawnTemplate(null);
    setSpawnCampaign(null);
  };

  const closeSpawn = () => {
    setSpawnTemplate(null);
    setSpawnCampaign(null);
    setCampaignPickerOpen(false);
  };

  const spawnDialogOpen = spawnTemplate != null && spawnCampaign != null;

  return (
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
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25"
        >
          <Plus className="h-4 w-4" aria-hidden /> New
        </button>
      </header>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm italic text-[var(--color-ink-faint)]">
          No templates yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--color-parchment-300)] rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40">
          {rows.map((row) => {
            const rowKey = `${row.source}:${row.id}`;
            const expanded = expandedId === rowKey;
            const fallback = fallbackForRow(row);
            return (
              <li key={rowKey}>
                {/* Collapsed header — always visible, clickable to expand */}
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                    expanded
                      ? 'bg-[var(--color-parchment-200)]/60'
                      : 'hover:bg-[var(--color-parchment-200)]/40',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(rowKey)}
                    aria-expanded={expanded}
                    aria-label={expanded ? `Collapse ${row.name}` : `Expand ${row.name}`}
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
                      vaultPath={null}
                      fallback={fallback}
                      name={row.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[var(--color-ink)]">
                        {row.name}
                      </div>
                      <div className="truncate font-mono text-[10px] text-[var(--color-ink-faint)]">
                        {row.id}
                      </div>
                    </div>
                  </button>
                  <span
                    className={
                      row.source === 'bundled'
                        ? 'rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-200)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)]'
                        : 'rounded-sm border border-[var(--color-verdigris)]/40 bg-[var(--color-verdigris)]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-verdigris)]'
                    }
                  >
                    {row.source}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onClickSpawn(row);
                    }}
                    title="Spawn into a campaign"
                    className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-[var(--color-gilt)]/25"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden /> Spawn
                  </button>
                </div>

                {/* Expanded card — full stat block + actions */}
                {expanded && (
                  <div className="border-t border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-4 py-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <Portrait
                        vaultPath={null}
                        fallback={fallback}
                        name={row.name}
                        size="lg"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <TemplatePreview
                          kind={kind}
                          selected={{
                            source: row.source,
                            template: row.template,
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void onClickSpawn(row)}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Spawn into campaign
                      </button>
                      {row.source === 'vault' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(row.template)}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
                          >
                            <Edit2 className="h-3.5 w-3.5" aria-hidden /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(row.template)}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = {
                              ...(row.template as object),
                              id: newTemplateId(kind),
                              source: `user (from ${(row.template as { id: string }).id})`,
                            } as TemplateOf<TemplateKind>;
                            setEditing(copy);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden /> Duplicate to vault
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <TemplateFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        kind={kind}
        scope={{ kind: 'global' }}
      />

      <TemplateFormDialog
        open={editing != null}
        onClose={() => setEditing(null)}
        kind={kind}
        scope={{ kind: 'global' }}
        existing={editing}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete template?"
        description="The template YAML file will be removed. Existing instances that reference this template will fall back to vault → bundled, or show a missing-template banner. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirmDelete}
      />

      <CampaignPicker
        open={campaignPickerOpen}
        onClose={() => setCampaignPickerOpen(false)}
        title={`Spawn into a campaign`}
        description={`Choose where to spawn ${spawnTemplate ? (spawnTemplate.template as { name: string }).name : 'this template'}.`}
        onPick={(c) => void onPickCampaign(c)}
      />

      {spawnDialogOpen && spawnTemplate && spawnCampaign && (
        <InstanceSpawnDialog
          open
          onClose={closeSpawn}
          kind={kind}
          campaignId={spawnCampaign.id}
          campaignDir={spawnCampaign.dir_name}
          characters={spawnCharacters}
          preselectedTemplate={spawnTemplate}
          onSpawned={onSpawned}
        />
      )}
    </ParchmentCard>
  );
}
