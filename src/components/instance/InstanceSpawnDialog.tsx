import * as React from 'react';
import { ParchmentDialog } from '@/components/dialogs/ParchmentDialog';
import { TemplateBrowser, type BrowsableTemplate } from './TemplateBrowser';
import { TemplatePreview } from './TemplatePreview';
import { PortraitPicker } from '@/components/portraits/PortraitPicker';
import {
  createInstance,
  type NewInstance,
} from '@/persistence/instance-repo';
import { importPortrait } from '@/persistence/portrait-repo';
import { useCampaignStore } from '@/stores/campaign-store';
import type { TemplateKind } from '@/persistence/paths';
import type { MonsterTemplate } from '@/domain/monster';
import type { RyudeTemplate } from '@/domain/ryude';
import type { Character } from '@/domain/character';
import type { PortraitFallback } from '@/hooks/usePortrait';

interface InstanceSpawnDialogProps {
  open: boolean;
  onClose: () => void;
  kind: TemplateKind;
  campaignId: string;
  campaignDir: string;
  characters: Character[];
  /** Refresh the campaign instance list after a successful spawn. */
  onSpawned?: () => void;
  /**
   * Pre-select a template (e.g. when opened from the templates page). When
   * set, the dialog hides the browser and shows the chosen template with a
   * "Change template" link.
   */
  preselectedTemplate?: BrowsableTemplate | null;
}

export function InstanceSpawnDialog({
  open,
  onClose,
  kind,
  campaignId,
  campaignDir,
  characters,
  onSpawned,
  preselectedTemplate,
}: InstanceSpawnDialogProps): React.JSX.Element {
  const [selected, setSelected] = React.useState<BrowsableTemplate | null>(
    preselectedTemplate ?? null,
  );
  const [browserOpen, setBrowserOpen] = React.useState(!preselectedTemplate);
  const [name, setName] = React.useState('');
  const [operatorId, setOperatorId] = React.useState<string>('');
  const [unmanned, setUnmanned] = React.useState(false);
  const [pendingPortrait, setPendingPortrait] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const invalidate = useCampaignStore((s) => s.invalidateInstancesFor);

  React.useEffect(() => {
    if (!open) {
      setSelected(preselectedTemplate ?? null);
      setBrowserOpen(!preselectedTemplate);
      setName('');
      setOperatorId('');
      setUnmanned(false);
      setPendingPortrait(null);
      setQuantity(1);
      setSubmitting(false);
      setError(null);
    } else if (preselectedTemplate) {
      setSelected(preselectedTemplate);
      setBrowserOpen(false);
    }
  }, [open, preselectedTemplate]);

  React.useEffect(() => {
    if (selected) {
      setName((selected.template as { name: string }).name);
    }
  }, [selected]);

  const fallback: PortraitFallback = React.useMemo(() => {
    if (kind === 'monster') {
      const t = selected?.template as MonsterTemplate | undefined;
      return { kind: 'monster', rank: t?.rank ?? null, templateId: t?.id };
    }
    if (kind === 'ryude') {
      const t = selected?.template as RyudeTemplate | undefined;
      return { kind: 'ryude', rType: t?.type ?? 'Footman', templateId: t?.id };
    }
    return { kind: 'npc', archetype: 'simple' };
  }, [kind, selected]);

  const operatorRequired = kind === 'ryude' && !unmanned;
  const operatorMissing = operatorRequired && !operatorId;

  const submitDisabled =
    !selected ||
    name.trim().length === 0 ||
    operatorMissing ||
    submitting ||
    (kind === 'monster' && (quantity < 1 || quantity > 50));

  const buildDraft = (
    instanceName: string,
  ): NewInstance<TemplateKind> => {
    if (!selected) throw new Error('No template selected');
    const t = selected.template as { id: string };
    if (kind === 'monster') {
      return {
        campaign_id: campaignId,
        template_id: t.id,
        name: instanceName,
        overrides: {},
        state: {
          current_physical_damage: 0,
          current_mental_damage: 0,
          status: 'fine',
          status_override: false,
          active_effects: [],
          last_recovery_tick: 0,
          location: '',
          segment: null,
          current_segment_index: 0,
        },
        portrait_path: null,
      } as NewInstance<'monster'>;
    }
    if (kind === 'ryude') {
      const tpl = selected.template as RyudeTemplate;
      return {
        campaign_id: campaignId,
        template_id: t.id,
        name: instanceName,
        equipped_operator: unmanned
          ? null
          : { kind: 'character', id: operatorId },
        overrides: {},
        state: {
          current_unit_durability: tpl.durability,
          attribute_damage: { spe: 0, pow: 0, arm: 0, bal: 0 },
          attunement_state: 'unattuned',
          repair_queue: [],
          active_effects: [],
          last_recovery_tick: 0,
          location: '',
          segment: null,
          current_segment_index: 0,
        },
        portrait_path: null,
      } as NewInstance<'ryude'>;
    }
    // npc
    return {
      campaign_id: campaignId,
      template_id: t.id,
      name: instanceName,
      overrides: {},
      state: {
        current_physical_damage: 0,
        current_mental_damage: 0,
        status: 'fine',
        status_override: false,
        active_effects: [],
        last_recovery_tick: 0,
        location: '',
        segment: null,
        current_segment_index: 0,
      },
      portrait_path: null,
      notes_path: null,
    } as NewInstance<'npc'>;
  };

  const onSubmit = async () => {
    if (submitDisabled || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      const count = kind === 'monster' ? Math.max(1, Math.min(50, quantity)) : 1;
      const portraitTargetKindMap: Record<TemplateKind, 'monster-instance' | 'ryude-instance' | 'npc-instance'> = {
        monster: 'monster-instance',
        ryude: 'ryude-instance',
        npc: 'npc-instance',
      };
      for (let i = 0; i < count; i += 1) {
        const instanceName = count > 1 ? `${trimmedName} ${i + 1}` : trimmedName;
        const draft = buildDraft(instanceName);
        const created = await createInstance(campaignDir, kind, draft);
        // Import the portrait — only on the first spawn so the user can pick
        // unique portraits afterwards, and to avoid 50 duplicates.
        if (pendingPortrait && i === 0) {
          try {
            const path = await importPortrait(
              { kind: portraitTargetKindMap[kind], id: created.id },
              pendingPortrait,
            );
            const updated = { ...created, portrait_path: path };
            // Persist the portrait_path back — use the repo's update.
            const { updateInstance } = await import('@/persistence/instance-repo');
            await updateInstance(campaignDir, kind, updated);
          } catch (e) {
            // Portrait failure is non-fatal — log it but keep the instance.
            console.error('Portrait import failed', e);
          }
        }
      }
      invalidate(campaignDir, kind);
      onSpawned?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const titleByKind: Record<TemplateKind, string> = {
    monster: 'Spawn Monster',
    ryude: 'Spawn Ryude',
    npc: 'Spawn NPC',
  };

  return (
    <ParchmentDialog
      open={open}
      onClose={onClose}
      title={titleByKind[kind]}
      description="Pick a template, name the instance, and (for Ryude) assign an operator. Portrait is optional."
      footer={
        <>
          {error && (
            <span className="mr-auto text-xs text-[var(--color-rust)]">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitDisabled}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Spawning…' : kind === 'monster' && quantity > 1 ? `Spawn ${quantity}` : 'Spawn'}
          </button>
        </>
      }
    >
      {browserOpen ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
              Choose template
            </h3>
            <TemplateBrowser
              kind={kind}
              campaignDir={campaignDir}
              selected={selected}
              onSelect={(t) => {
                setSelected(t);
                setBrowserOpen(false);
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
              Preview
            </h3>
            <TemplatePreview kind={kind} selected={selected} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
              Selected template
            </h3>
            <button
              type="button"
              onClick={() => setBrowserOpen(true)}
              className="text-xs text-[var(--color-ink-faint)] underline hover:text-[var(--color-rust)]"
            >
              Change template
            </button>
          </div>
          <TemplatePreview kind={kind} selected={selected} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Instance name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={selected ? (selected.template as { name: string }).name : 'Select a template'}
            disabled={!selected}
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm disabled:opacity-50"
          />
        </label>

        {kind === 'ryude' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Operator
            </label>
            <div className="flex items-center gap-2">
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                disabled={unmanned}
                className="h-8 flex-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm disabled:opacity-50"
              >
                <option value="">— Pick a character —</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.class_id})
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-soft)]">
                <input
                  type="checkbox"
                  checked={unmanned}
                  onChange={(e) => setUnmanned(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Unmanned
              </label>
            </div>
            {operatorMissing && (
              <span className="text-[10px] text-[var(--color-rust)]">
                Pick an operator (or check "Unmanned").
              </span>
            )}
          </div>
        )}

        {kind === 'monster' && (
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Quantity
            </span>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))
              }
              className="h-8 w-24 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
            />
            {quantity > 1 && (
              <span className="text-[10px] italic text-[var(--color-ink-faint)]">
                Spawns "{name.trim()} 1", "…2", … up to {quantity}.
              </span>
            )}
          </label>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
          Portrait
        </h3>
        <div className="mt-1.5">
          <PortraitPicker
            fallback={fallback}
            name={name || 'New instance'}
            mode={{
              kind: 'deferred',
              pendingSource: pendingPortrait,
              onPendingChange: setPendingPortrait,
            }}
          />
        </div>
      </div>
    </ParchmentDialog>
  );
}
