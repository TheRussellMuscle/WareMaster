import * as React from 'react';
import { ulid } from 'ulid';
import { ChevronRight, Swords, Skull, Heart, Wrench, Zap } from 'lucide-react';
import {
  effectiveMonsterStatus,
  endSegment,
  ryudeOperationalStatus,
  type RyudeOperationalStatus,
} from '@/engine/derive/instance-bookkeeping';
import {
  ryudeOperatorRoll,
  ryudeInContext,
  ryudeEgoValue,
  resolveOperatorStats,
  type OperatorStats,
} from '@/engine/derive/instance-rolls';
import {
  resolveRyudeItem,
  equippedRyudeArmors,
  normalizeRyudeItemId,
} from '@/engine/derive/ryude-equipment';
import { useActionLogStore } from '@/stores/action-log-store';
import { useCustomItemStore } from '@/stores/custom-item-store';
import type { CustomItem } from '@/domain/custom-item';
import { ItemCreatorDialog } from '@/components/stat/ItemCreatorDialog';
import type { ActionLogEntry, CurrentSegment } from '@/domain/action-log';
import type { MonsterTemplate, MonsterRank } from '@/domain/monster';
import type {
  MonsterInstance,
  MonsterInstanceStatus,
} from '@/domain/monster-instance';
import type { RyudeTemplate, RyudeType } from '@/domain/ryude';
import type {
  RyudeAttunementState,
  RyudeInstance,
} from '@/domain/ryude-instance';
import type { NpcInstance } from '@/domain/npc-instance';
import type { NpcTemplate, NpcArchetype, NpcRole, SimpleNpc, BeastNpc } from '@/domain/npc';
import type { Character } from '@/domain/character';
import type { Campaign } from '@/domain/campaign';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { TemplateKind } from '@/persistence/paths';
import { InstanceAbilityDialog } from './dialogs/InstanceAbilityDialog';
import { InstanceAttackDialog } from './dialogs/InstanceAttackDialog';
import { InstanceSkillDialog } from './dialogs/InstanceSkillDialog';
import { InstanceSetInDnDialog } from './dialogs/InstanceSetInDnDialog';
import { RyudeOperatorDialog } from './dialogs/RyudeOperatorDialog';
import { RyudeAttunementDialog } from './dialogs/RyudeAttunementDialog';
import { RyudeAttackDialog } from './dialogs/RyudeAttackDialog';
import { DurabilityTracks } from '@/components/stat/DurabilityTracks';
import { Portrait } from '@/components/portraits/Portrait';
import type { PortraitFallback } from '@/hooks/usePortrait';

type Instance = MonsterInstance | RyudeInstance | NpcInstance;
type Template = MonsterTemplate | RyudeTemplate | NpcTemplate;

interface Props {
  kind: TemplateKind;
  campaign: Campaign;
  instance: Instance;
  template: Template | null;
  characters: Character[];
  /** Full-character NPC templates available as Ryude operators. */
  npcTemplates?: NpcTemplate[];
  catalog: ReferenceCatalog | null;
  customItems?: CustomItem[];
  onPersist: (next: Instance) => Promise<void>;
}

type DialogState =
  | { kind: 'attack-monster' }
  | { kind: 'ability-monster' }
  | { kind: 'skill-simple'; skillId?: string }
  | { kind: 'set-in-dn' }
  | { kind: 'ryude-operator' }
  | { kind: 'ryude-attunement' }
  | { kind: 'ryude-attack' }
  | null;

function portraitFallback(
  kind: TemplateKind,
  instance: Instance,
  template: Template,
): PortraitFallback {
  if (kind === 'monster') {
    const t = template as MonsterTemplate;
    const rank: MonsterRank | null = (instance as MonsterInstance).overrides.rank ?? t.rank ?? null;
    return { kind: 'monster', rank, templateId: instance.template_id };
  }
  if (kind === 'ryude') {
    const t = template as RyudeTemplate;
    const rType: RyudeType = (instance as RyudeInstance).overrides.type ?? t.type ?? 'Footman';
    return { kind: 'ryude', rType, templateId: instance.template_id };
  }
  const t = template as NpcTemplate;
  const archetype: NpcArchetype = t.archetype;
  const role: NpcRole | null = t.archetype === 'simple' ? (t as { role?: NpcRole }).role ?? null : null;
  return { kind: 'npc', archetype, role };
}

export function InstanceStatBlock({
  kind,
  campaign,
  instance,
  template,
  characters,
  npcTemplates = [],
  catalog,
  customItems = [],
  onPersist,
}: Props): React.JSX.Element {
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [tickToast, setTickToast] = React.useState<string | null>(null);
  const appendLog = useActionLogStore((s) => s.append);

  const close = () => setDialog(null);

  const newEntry = (
    raw: Omit<ActionLogEntry, 'id' | 'timestamp_real' | 'character_id' | 'character_name'>,
  ): ActionLogEntry => ({
    id: ulid(),
    timestamp_real: new Date().toISOString(),
    character_id: instance.id,
    character_name: instance.name,
    ...raw,
  });

  const logResolve = async (
    entry: Omit<ActionLogEntry, 'id' | 'timestamp_real' | 'character_id' | 'character_name'>,
  ) => {
    await appendLog(campaign.dir_name, newEntry(entry));
  };

  const onEndSegment = async () => {
    if (kind === 'monster' || kind === 'npc') {
      const inst = instance as MonsterInstance | NpcInstance;
      const result = endSegment(inst.state);
      const next: Instance = {
        ...inst,
        state: result.state,
      } as Instance;
      await onPersist(next);
      if (result.expired.length > 0) {
        setTickToast(
          `Effects ticked: ${result.expired.map((e) => e.label).join(', ')}`,
        );
        setTimeout(() => setTickToast(null), 2500);
      }
    } else if (kind === 'ryude') {
      const inst = instance as RyudeInstance;
      const result = endSegment(inst.state);
      const next: RyudeInstance = { ...inst, state: result.state };
      await onPersist(next);
      if (result.expired.length > 0) {
        setTickToast(
          `Effects ticked: ${result.expired.map((e) => e.label).join(', ')}`,
        );
        setTimeout(() => setTickToast(null), 2500);
      }
    }
  };

  if (!template) {
    // Missing template — caller already shows a banner; render nothing.
    return <div className="text-sm italic text-[var(--color-ink-faint)]">No stat block (template missing).</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {tickToast && (
        <div className="rounded-sm border border-[var(--color-gilt)]/40 bg-[var(--color-gilt)]/10 p-2 text-xs text-[var(--color-ink-soft)]">
          {tickToast}
        </div>
      )}

      <div className="flex justify-center">
        <Portrait
          vaultPath={instance.portrait_path}
          fallback={portraitFallback(kind, instance, template)}
          name={instance.name}
          size="xl"
          clickable
        />
      </div>

      {kind === 'monster' && (
        <MonsterSections
          instance={instance as MonsterInstance}
          template={template as MonsterTemplate}
          onPersist={onPersist}
          openDialog={setDialog}
          onEndSegment={onEndSegment}
        />
      )}

      {kind === 'ryude' && (
        <RyudeSections
          instance={instance as RyudeInstance}
          template={template as RyudeTemplate}
          characters={characters}
          npcTemplates={npcTemplates}
          catalog={catalog}
          customItems={customItems}
          onPersist={onPersist}
          openDialog={setDialog}
          onEndSegment={onEndSegment}
        />
      )}

      {kind === 'npc' && template && (template as NpcTemplate).archetype === 'beast' && (
        <MonsterSections
          instance={instance as MonsterInstance}
          template={template as BeastNpc}
          onPersist={onPersist}
          openDialog={setDialog}
          onEndSegment={onEndSegment}
          dispositionLine={(template as BeastNpc).disposition || undefined}
        />
      )}

      {kind === 'npc' && template && (template as NpcTemplate).archetype === 'simple' && (
        <SimpleNpcSections
          instance={instance as NpcInstance}
          template={template as SimpleNpc}
          onPersist={onPersist}
          openDialog={setDialog}
          onEndSegment={onEndSegment}
        />
      )}

      {/* Dialogs ----------------------------------------------------------- */}
      {kind === 'monster' && template && (
        <>
          <InstanceAttackDialog
            open={dialog?.kind === 'attack-monster'}
            onClose={close}
            template={template as MonsterTemplate}
            instance={instance as MonsterInstance}
            onResolve={logResolve}
          />
          <InstanceAbilityDialog
            open={dialog?.kind === 'ability-monster'}
            onClose={close}
            template={template as MonsterTemplate}
            instance={instance as MonsterInstance}
            onResolve={logResolve}
          />
          <InstanceSetInDnDialog
            open={dialog?.kind === 'set-in-dn'}
            onClose={close}
            actorName={instance.name}
            baseIN={(template as MonsterTemplate).base_sen ?? 0}
            baseDN={(template as MonsterTemplate).base_agi ?? 0}
            ruleSuffix={<>(monster: Base SEN/AGI per Rule §08)</>}
            onResolve={async (entry, segment) => {
              await logResolve(entry);
              const inst = instance as MonsterInstance;
              await onPersist({ ...inst, state: { ...inst.state, segment } });
            }}
          />
        </>
      )}
      {kind === 'npc' && template && (template as NpcTemplate).archetype === 'beast' && (
        <>
          <InstanceAttackDialog
            open={dialog?.kind === 'attack-monster'}
            onClose={close}
            template={template as MonsterTemplate}
            instance={instance as unknown as MonsterInstance}
            onResolve={logResolve}
          />
          <InstanceAbilityDialog
            open={dialog?.kind === 'ability-monster'}
            onClose={close}
            template={template as MonsterTemplate}
            instance={instance as unknown as MonsterInstance}
            onResolve={logResolve}
          />
          <InstanceSetInDnDialog
            open={dialog?.kind === 'set-in-dn'}
            onClose={close}
            actorName={instance.name}
            baseIN={(template as BeastNpc).base_sen ?? 0}
            baseDN={(template as BeastNpc).base_agi ?? 0}
            onResolve={async (entry, segment) => {
              await logResolve(entry);
              const inst = instance as NpcInstance;
              await onPersist({ ...inst, state: { ...inst.state, segment } });
            }}
          />
        </>
      )}
      {kind === 'npc' && template && (template as NpcTemplate).archetype === 'simple' && (
        <>
          <InstanceSkillDialog
            open={dialog?.kind === 'skill-simple'}
            onClose={close}
            template={template as SimpleNpc}
            instance={instance as NpcInstance}
            catalog={catalog}
            initialSkillId={dialog?.kind === 'skill-simple' ? dialog.skillId : undefined}
            onResolve={logResolve}
          />
          <InstanceSetInDnDialog
            open={dialog?.kind === 'set-in-dn'}
            onClose={close}
            actorName={instance.name}
            baseIN={0}
            baseDN={0}
            ruleSuffix={<>(simple NPC — WM enters bases at roll time)</>}
            onResolve={async (entry, segment) => {
              await logResolve(entry);
              const inst = instance as NpcInstance;
              await onPersist({ ...inst, state: { ...inst.state, segment } });
            }}
          />
        </>
      )}
      {kind === 'ryude' && template && (
        <RyudeDialogs
          dialog={dialog}
          close={close}
          template={template as RyudeTemplate}
          instance={instance as RyudeInstance}
          characters={characters}
          npcTemplates={npcTemplates}
          catalog={catalog}
          customItems={customItems}
          logResolve={logResolve}
          onPersist={onPersist}
        />
      )}
    </div>
  );
}

/* ---------------- Section primitives ---------------- */

interface StatSectionProps {
  title: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

function StatSection({
  title,
  defaultOpen,
  icon,
  children,
  rightSlot,
}: StatSectionProps): React.JSX.Element {
  // Self-managed open state. Using `open={defaultOpen}` directly makes the
  // <details> controlled, so every parent re-render (status/segment/damage
  // edits all trigger one) clobbers the user's click. Track the open state
  // here and bind to the native `toggle` event instead.
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-ink)]">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
        {icon}
        <span className="flex-1">{title}</span>
        {rightSlot}
      </summary>
      <div className="border-t border-[var(--color-parchment-300)] px-3 py-3">
        {children}
      </div>
    </details>
  );
}

function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-2 py-1 text-xs">
      <div className="text-[9px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="font-mono text-[var(--color-ink)]">{value}</div>
    </div>
  );
}

function RollButton({
  onClick,
  label,
  disabled,
  title,
}: {
  onClick: () => void;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-gilt)]/25 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function SegmentChip({ segment }: { segment: CurrentSegment }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-gilt)]/40 bg-[var(--color-gilt)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--color-ink)]">
      IN {segment.in} · DN {segment.dn} · Abs{' '}
      {segment.absorption_modifier === 2
        ? '×2'
        : segment.absorption_modifier === 0.5
          ? '÷2'
          : '×1'}
    </div>
  );
}

function StatusChip({
  status,
  override,
  onClearOverride,
  onApplyDerived,
  derived,
}: {
  status: MonsterInstanceStatus;
  override: boolean;
  derived: MonsterInstanceStatus;
  onClearOverride: () => void;
  onApplyDerived: () => void;
}) {
  const color =
    status === 'dead'
      ? 'text-[var(--color-rust)]'
      : status === 'incapacitated'
        ? 'text-[var(--color-rust)]'
        : status === 'wounded'
          ? 'text-[var(--color-gilt)]'
          : 'text-[var(--color-ink-soft)]';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`font-mono uppercase ${color}`}>{status}</span>
      {override ? (
        <>
          <span className="text-[10px] italic text-[var(--color-ink-faint)]">(override)</span>
          <button
            type="button"
            onClick={onClearOverride}
            className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-rust)]"
          >
            Use derived
          </button>
        </>
      ) : (
        derived !== status && (
          <button
            type="button"
            onClick={onApplyDerived}
            className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-rust)]"
          >
            Auto-update to {derived}
          </button>
        )
      )}
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  width = 'w-16',
}: {
  value: number;
  onChange: (v: number) => void;
  width?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className={`h-7 ${width} rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 font-mono text-xs`}
    />
  );
}

/* ---------------- Monster / Beast NPC sections ---------------- */

interface MonsterSectionsProps {
  instance: MonsterInstance | NpcInstance;
  template: MonsterTemplate | BeastNpc;
  onPersist: (next: Instance) => Promise<void>;
  openDialog: (d: DialogState) => void;
  onEndSegment: () => void;
  dispositionLine?: string;
}

function MonsterSections({
  instance,
  template,
  onPersist,
  openDialog,
  onEndSegment,
  dispositionLine,
}: MonsterSectionsProps): React.JSX.Element {
  // Synthesize a MonsterInstance-shape view of the state for derivation helpers.
  // Beast NPCs share the same stat block; we only use the state slice.
  const state = instance.state as MonsterInstance['state'];
  const durability = parseDurability(template);
  const rank =
    (instance as MonsterInstance).overrides?.rank ??
    (template as MonsterTemplate).rank;
  const derived = effectiveMonsterStatus(
    {
      status: state.status,
      status_override: state.status_override,
      current_physical_damage: state.current_physical_damage,
      current_mental_damage: state.current_mental_damage,
    },
    durability,
  );

  const setStateField = <K extends keyof MonsterInstance['state']>(
    key: K,
    value: MonsterInstance['state'][K],
  ) => {
    void onPersist({
      ...(instance as MonsterInstance),
      state: { ...state, [key]: value },
    } as Instance);
  };

  return (
    <>
      <StatSection
        title="Combat"
        defaultOpen
        icon={<Swords className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}
        rightSlot={
          state.segment ? <SegmentChip segment={state.segment} /> : null
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-1.5">
            <StatPill label="SEN" value={template.base_sen ?? '—'} />
            <StatPill label="AGI" value={template.base_agi ?? '—'} />
            <StatPill label="CON" value={template.base_con ?? '—'} />
            <StatPill label="WIL" value={template.base_wil ?? '—'} />
            <StatPill label="CHA" value={template.base_cha ?? '—'} />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <StatPill label="Damage" value={String(template.damage_value)} />
            <StatPill
              label="Absorption"
              value={String(template.total_absorption ?? '—')}
            />
            <StatPill label="Reaction" value={template.reaction} />
            {rank && <StatPill label="Rank" value={rank} />}
          </div>
          {(template.base_sen_vs_ryude != null ||
            template.damage_value_vs_ryude != null ||
            template.total_absorption_vs_ryude != null) && (
            <div className="flex flex-col gap-0.5">
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                vs Ryude
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <StatPill
                  label="SEN"
                  value={
                    template.base_sen_vs_ryude != null
                      ? String(template.base_sen_vs_ryude)
                      : '—'
                  }
                />
                <StatPill
                  label="Damage"
                  value={
                    template.damage_value_vs_ryude != null
                      ? String(template.damage_value_vs_ryude)
                      : '—'
                  }
                />
                <StatPill
                  label="Absorption"
                  value={
                    template.total_absorption_vs_ryude != null
                      ? String(template.total_absorption_vs_ryude)
                      : '—'
                  }
                />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <RollButton onClick={() => openDialog({ kind: 'set-in-dn' })} label="Set IN/DN" />
            <RollButton onClick={() => openDialog({ kind: 'attack-monster' })} label="Attack" />
            <RollButton onClick={() => openDialog({ kind: 'ability-monster' })} label="Ability" />
            <RollButton onClick={onEndSegment} label="End Segment" />
          </div>
          <DurabilityTracks
            durability={durability}
            current={state.current_physical_damage}
            label="Physical"
            onChange={(v) => setStateField('current_physical_damage', v)}
          />
          <DurabilityTracks
            durability={durability}
            current={state.current_mental_damage}
            label="Mental"
            onChange={(v) => setStateField('current_mental_damage', v)}
          />
          <div className="text-[10px] italic text-[var(--color-ink-faint)]">
            Derived from damage + Durability {durability}:
          </div>
          <StatusChip
            status={state.status}
            override={state.status_override}
            derived={derived}
            onClearOverride={() => {
              void onPersist({
                ...(instance as MonsterInstance),
                state: { ...state, status_override: false, status: derived },
              } as Instance);
            }}
            onApplyDerived={() => {
              void onPersist({
                ...(instance as MonsterInstance),
                state: { ...state, status: derived },
              } as Instance);
            }}
          />
          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Location
            </span>
            <input
              type="text"
              value={state.location}
              onChange={(e) => setStateField('location', e.target.value)}
              className="h-7 flex-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
            />
          </label>
        </div>
      </StatSection>

      <StatSection title="Details" icon={<Heart className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Detail label="Movement" value={`${template.movement_speed} liet/Seg`} />
          {template.sprint_speed !== undefined && (
            <Detail label="Sprint" value={`${template.sprint_speed} liet/Seg`} />
          )}
          <Detail label="Intelligence" value={template.intelligence} />
          <Detail label="Habitat" value={template.primary_habitat} />
          {dispositionLine && <Detail label="Disposition" value={dispositionLine} />}
        </div>
      </StatSection>

      <ActiveEffectsSection
        effects={state.active_effects}
        currentSegment={state.current_segment_index}
        onAdd={(eff) =>
          void onPersist({
            ...(instance as MonsterInstance),
            state: { ...state, active_effects: [...state.active_effects, eff] },
          } as Instance)
        }
        onRemove={(id) =>
          void onPersist({
            ...(instance as MonsterInstance),
            state: {
              ...state,
              active_effects: state.active_effects.filter((e) => e.id !== id),
            },
          } as Instance)
        }
      />
      <NotesSection notes={(instance as MonsterInstance).overrides?.notes} />
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </span>{' '}
      <span className="text-xs text-[var(--color-ink-soft)]">{value}</span>
    </div>
  );
}

function NotesSection({ notes }: { notes: string | undefined }) {
  if (!notes?.trim()) return null;
  return (
    <StatSection title="Notes">
      <p className="whitespace-pre-wrap text-xs text-[var(--color-ink-soft)]">{notes}</p>
    </StatSection>
  );
}

function ActiveEffectsSection({
  effects,
  currentSegment,
  onAdd,
  onRemove,
}: {
  effects: MonsterInstance['state']['active_effects'];
  currentSegment: number;
  onAdd?: (effect: { id: string; label: string; expires_at_segment: number | null }) => void;
  onRemove?: (id: string) => void;
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');
  const [newExpiry, setNewExpiry] = React.useState('');

  const handleAdd = () => {
    if (!newLabel.trim() || !onAdd) return;
    const expiry = newExpiry.trim() !== '' ? parseInt(newExpiry, 10) : null;
    onAdd({ id: ulid(), label: newLabel.trim(), expires_at_segment: expiry });
    setNewLabel('');
    setNewExpiry('');
    setShowForm(false);
  };

  return (
    <StatSection
      defaultOpen={effects.length > 0}
      title="Active Effects"
      icon={<Zap className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}
      rightSlot={
        <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
          seg {currentSegment}
        </span>
      }
    >
      {effects.length > 0 && (
        <ul className="flex flex-col gap-1 mb-2">
          {effects.map((eff) => (
            <li
              key={eff.id}
              className="flex items-center gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-2 py-1 text-xs"
            >
              <span className="font-medium text-[var(--color-ink)]">{eff.label}</span>
              {eff.expires_at_segment !== null && (
                <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                  until seg {eff.expires_at_segment}
                </span>
              )}
              {eff.source && (
                <span className="text-[10px] italic text-[var(--color-ink-faint)]">
                  {eff.source}
                </span>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(eff.id)}
                  className="ml-auto text-[10px] text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]"
                  aria-label="Remove effect"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {onAdd && (
        showForm ? (
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              placeholder="Effect label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
            />
            <input
              type="number"
              placeholder="Expires at seg (blank = permanent)"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-xs"
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={!newLabel.trim()}
                onClick={handleAdd}
                className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-2 py-0.5 text-[10px] disabled:opacity-50 hover:bg-[var(--color-gilt)]/25"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewLabel(''); setNewExpiry(''); }}
                className="text-[10px] text-[var(--color-ink-faint)] underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-ink)]"
          >
            + Add effect
          </button>
        )
      )}
    </StatSection>
  );
}

/* ---------------- Ryude ---------------- */

interface RyudeSectionsProps {
  instance: RyudeInstance;
  template: RyudeTemplate;
  characters: Character[];
  npcTemplates: NpcTemplate[];
  catalog: ReferenceCatalog | null;
  customItems: CustomItem[];
  onPersist: (next: Instance) => Promise<void>;
  openDialog: (d: DialogState) => void;
  onEndSegment: () => void;
}

function RyudeSections({
  instance,
  template,
  characters,
  npcTemplates,
  catalog,
  customItems,
  onPersist,
  openDialog,
  onEndSegment,
}: RyudeSectionsProps): React.JSX.Element {
  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [addPickerOpen, setAddPickerOpen] = React.useState(false);
  const createCustomItem = useCustomItemStore((s) => s.create);
  const state = instance.state;
  const operator = resolveOperatorStats(instance.equipped_operator, characters, npcTemplates);
  const unmanned = !operator;
  const opStatus = ryudeOperationalStatus(
    state.current_unit_durability,
    template.durability,
  );
  const ratio = template.durability > 0
    ? Math.max(0, Math.min(1, state.current_unit_durability / template.durability))
    : 0;
  const setStateField = <K extends keyof RyudeInstance['state']>(
    key: K,
    value: RyudeInstance['state'][K],
  ) => {
    void onPersist({
      ...instance,
      state: { ...state, [key]: value },
    });
  };
  const setAttrDamage = (
    attr: 'spe' | 'pow' | 'arm' | 'bal',
    value: number,
  ) => {
    void onPersist({
      ...instance,
      state: {
        ...state,
        attribute_damage: { ...state.attribute_damage, [attr]: value },
      },
    });
  };

  // Normalize legacy human-readable names to catalog IDs on first mutation.
  const equippedIds = state.equipped_item_ids.map(normalizeRyudeItemId);
  const templateIds = template.equipment.map(normalizeRyudeItemId);
  const stowedIds = templateIds.filter((id) => !equippedIds.includes(id));

  const equipItem = (id: string) => {
    const nid = normalizeRyudeItemId(id);
    if (equippedIds.includes(nid)) return;
    void onPersist({
      ...instance,
      state: { ...state, equipped_item_ids: [...equippedIds, nid] },
    });
  };
  const unequipItem = (id: string) => {
    const nid = normalizeRyudeItemId(id);
    void onPersist({
      ...instance,
      state: { ...state, equipped_item_ids: equippedIds.filter((x) => x !== nid) },
    });
  };
  // Drop permanently removes from the equipped list (for items not on the template).
  const dropItem = (id: string) => {
    const nid = normalizeRyudeItemId(id);
    void onPersist({
      ...instance,
      state: { ...state, equipped_item_ids: equippedIds.filter((x) => x !== nid) },
    });
  };

  // All catalog ryude items available to add (not already equipped).
  const catalogAddable: Array<{ id: string; label: string }> = React.useMemo(() => {
    if (!catalog) return [];
    const items: Array<{ id: string; label: string }> = [];
    for (const w of catalog.ryudeEquipment.ryude_weapons) {
      if (!equippedIds.includes(w.id)) items.push({ id: w.id, label: `${w.name} (weapon)` });
    }
    for (const a of catalog.ryudeEquipment.ryude_armor) {
      if (!equippedIds.includes(a.id)) items.push({ id: a.id, label: `${a.name} (armor)` });
    }
    for (const ci of customItems) {
      if ((ci.kind === 'ryude-weapon' || ci.kind === 'ryude-armor') && !equippedIds.includes(ci.id)) {
        items.push({ id: ci.id, label: `${ci.name} (custom ${ci.kind})` });
      }
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, equippedIds, customItems]);

  return (
    <>
      <StatSection
        title="Combat"
        defaultOpen
        icon={<Wrench className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}
        rightSlot={
          state.segment ? <SegmentChip segment={state.segment} /> : null
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-1.5">
            {(['spe', 'pow', 'arm', 'bal'] as const).map((attr) => (
              <StatPill
                key={attr}
                label={attr.toUpperCase()}
                value={
                  state.attribute_damage[attr] > 0 ? (
                    <>
                      {template.attributes[attr]}
                      <span className="text-[var(--color-rust)]">
                        {' '}(-{state.attribute_damage[attr]})
                      </span>
                    </>
                  ) : (
                    template.attributes[attr]
                  )
                }
              />
            ))}
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Durability {state.current_unit_durability} / {template.durability}
              </span>
              <span
                className={`font-mono uppercase text-[10px] ${operationalColor(opStatus)}`}
              >
                {opStatus}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-100)]/60">
              <div
                className={`h-full ${ratio > 0.74 ? 'bg-[var(--color-gilt)]/70' : ratio > 0.24 ? 'bg-[var(--color-gilt)]/40' : 'bg-[var(--color-rust)]/60'}`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <StatPill label="Required Drive" value={template.required_drive} />
            <StatPill label="Attunement" value={template.attunement_value} />
            <StatPill label="Persona" value={template.persona_rank} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <RollButton
              onClick={() => openDialog({ kind: 'set-in-dn' })}
              label="Set IN/DN"
              disabled={unmanned}
              title={unmanned ? 'Equip an operator to roll' : undefined}
            />
            <RollButton
              onClick={() => openDialog({ kind: 'ryude-operator' })}
              label="Operator Roll"
              disabled={unmanned}
              title={unmanned ? 'Equip an operator to roll' : undefined}
            />
            <RollButton
              onClick={() => openDialog({ kind: 'ryude-attunement' })}
              label="Attunement"
              disabled={unmanned}
              title={unmanned ? 'Equip an operator to roll' : undefined}
            />
            <RollButton
              onClick={() => openDialog({ kind: 'ryude-attack' })}
              label="Attack"
              disabled={unmanned || equippedIds.length === 0}
              title={unmanned ? 'Equip an operator to roll' : undefined}
            />
            <RollButton onClick={onEndSegment} label="End Segment" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Current Durability
              </span>
              <NumberCell
                value={state.current_unit_durability}
                onChange={(v) => setStateField('current_unit_durability', v)}
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Attunement
              </span>
              <select
                value={state.attunement_state}
                onChange={(e) =>
                  setStateField(
                    'attunement_state',
                    e.target.value as RyudeAttunementState,
                  )
                }
                className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 text-xs"
              >
                {(['unattuned', 'attuning', 'attuned', 'rejected'] as const).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Operator
              </span>
              <select
                value={
                  instance.equipped_operator
                    ? `${instance.equipped_operator.kind}:${instance.equipped_operator.id}`
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    void onPersist({ ...instance, equipped_operator: null });
                    return;
                  }
                  const [kind, id] = val.split(':') as ['character' | 'npc', string];
                  void onPersist({ ...instance, equipped_operator: { kind, id } });
                }}
                className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
              >
                <option value="">— Unmanned —</option>
                {characters.length > 0 && (
                  <optgroup label="Characters">
                    {characters.map((c) => (
                      <option key={c.id} value={`character:${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {npcTemplates.filter((n) => n.archetype === 'full-character').length > 0 && (
                  <optgroup label="NPCs">
                    {npcTemplates
                      .filter((n) => n.archetype === 'full-character')
                      .map((n) => (
                        <option key={n.id} value={`npc:${n.id}`}>
                          {n.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              {instance.equipped_operator && !operator && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-rust)]">
                    ⚠ operator "{instance.equipped_operator.id}" no longer resolves
                    {instance.equipped_operator.kind === 'npc' ? ' (NPC template not loaded)' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onPersist({ ...instance, equipped_operator: null })}
                    className="text-[10px] underline text-[var(--color-rust)] hover:opacity-70"
                  >
                    Clear operator
                  </button>
                </div>
              )}
            </label>
            <label className="col-span-2 flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Location
              </span>
              <input
                type="text"
                value={state.location}
                onChange={(e) => setStateField('location', e.target.value)}
                className="h-7 flex-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
              />
            </label>
          </div>
          {/* Maledictor mind durability pool (Rule §14:229) */}
          {template.type === 'Maledictor' && template.ryude_mind_durability != null && (
            <div className="col-span-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Mind Durability
              </span>
              <div className="flex items-center gap-1">
                <NumberCell
                  value={state.current_ryude_mind_durability ?? template.ryude_mind_durability}
                  onChange={(v) => setStateField('current_ryude_mind_durability', Math.max(0, v))}
                  width="w-12"
                />
                <span className="text-[var(--color-ink-faint)]">/ {template.ryude_mind_durability}</span>
                {(state.current_ryude_mind_durability ?? template.ryude_mind_durability) <= 0 && (
                  <span className="ml-1 font-medium text-[var(--color-rust)]">Persona Destroyed</span>
                )}
              </div>
            </div>
          )}
          {/* Drive reduction from attunement penalties (Rule §14:50-57) */}
          {(state.drive_reduction ?? 0) > 0 && (
            <div className="col-span-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-rust)]">
                Drive Reduction
              </span>
              <div className="flex items-center gap-1">
                <NumberCell
                  value={state.drive_reduction ?? 0}
                  onChange={(v) => setStateField('drive_reduction', Math.max(0, v))}
                  width="w-12"
                />
                <span className="text-[var(--color-ink-faint)]">(attunement penalty)</span>
              </div>
            </div>
          )}
          {/* Dashing sustainability counter (Rule §14:22) */}
          <div className="col-span-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Dashing Segs Left
            </span>
            <div className="flex items-center gap-1">
              <NumberCell
                value={state.dashing_segments_remaining ?? 5}
                onChange={(v) => setStateField('dashing_segments_remaining', Math.max(0, Math.min(5, v)))}
                width="w-12"
              />
              <button
                type="button"
                onClick={() => setStateField('dashing_segments_remaining', 5)}
                className="text-[10px] underline text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
                title="Reset to 5"
              >
                reset
              </button>
              {(state.dashing_segments_remaining ?? 5) === 0 && (
                <span className="ml-1 text-[var(--color-rust)]">must rest</span>
              )}
            </div>
          </div>
          {operator && (
            <RyudeBreakdownPreview
              template={template}
              instance={instance}
              operator={operator}
            />
          )}
        </div>
      </StatSection>

      <StatSection
        title="Attribute damage"
        icon={<Skull className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}
      >
        <div className="grid grid-cols-4 gap-2 text-xs">
          {(['spe', 'pow', 'arm', 'bal'] as const).map((attr) => (
            <label key={attr} className="flex items-center justify-between gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                {attr.toUpperCase()}
              </span>
              <NumberCell
                value={state.attribute_damage[attr]}
                onChange={(v) => setAttrDamage(attr, Math.max(0, v))}
                width="w-12"
              />
            </label>
          ))}
        </div>
        <div className="mt-2 text-[10px] italic text-[var(--color-ink-faint)]">
          Subtracted from base attributes in Operator + Attack rolls (Rule §14:140-160).
        </div>
      </StatSection>

      <StatSection
        title="Equipment"
        rightSlot={
          <div className="flex gap-2">
            {catalogAddable.length > 0 && (
              <button
                type="button"
                onClick={() => setAddPickerOpen((o) => !o)}
                className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-ink)]"
              >
                + Add item
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreatorOpen(true)}
              className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-ink)]"
            >
              + Create item
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-1">
          {addPickerOpen && (
            <div className="mb-1 flex gap-1.5">
              <select
                id="ryude-add-picker"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    equipItem(e.target.value);
                    setAddPickerOpen(false);
                  }
                }}
                className="flex-1 h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 text-xs"
              >
                <option value="" disabled>Pick an item…</option>
                {catalogAddable.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAddPickerOpen(false)}
                className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-rust)]"
              >
                Cancel
              </button>
            </div>
          )}

          {equippedIds.length === 0 && stowedIds.length === 0 && (
            <p className="text-xs italic text-[var(--color-ink-faint)]">No equipment.</p>
          )}

          {equippedIds.map((id) => {
            const resolved = resolveRyudeItem(id, catalog, customItems);
            const isTemplateItem = templateIds.includes(id);
            return (
              <div
                key={id}
                className="flex items-start justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-2 py-1 text-xs"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{resolved?.item.name ?? id}</span>
                  {resolved?.kind === 'weapon' && (
                    <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                      melee {resolved.item.bn_modifier.melee ?? '—'} · dmg {resolved.item.damage_value.melee ?? '—'} · crit ≥{resolved.item.critical_value}
                    </span>
                  )}
                  {resolved?.kind === 'armor' && (
                    <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                      ARM {resolved.item.arm_modifier >= 0 ? '+' : ''}{resolved.item.arm_modifier} · SPE {resolved.item.spe_modifier >= 0 ? '+' : ''}{resolved.item.spe_modifier}
                      {resolved.item.notes ? ` · ${resolved.item.notes}` : ''}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => isTemplateItem ? unequipItem(id) : dropItem(id)}
                  className="shrink-0 text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-rust)]"
                >
                  {isTemplateItem ? 'Unequip' : 'Drop'}
                </button>
              </div>
            );
          })}

          {stowedIds.length > 0 && (
            <>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Stowed
              </p>
              {stowedIds.map((id) => {
                const resolved = resolveRyudeItem(id, catalog, customItems);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)]/60 bg-[var(--color-parchment-50)]/40 px-2 py-0.5 text-xs opacity-70"
                  >
                    <span>{resolved?.item.name ?? id}</span>
                    <button
                      type="button"
                      onClick={() => equipItem(id)}
                      className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-ink)]"
                    >
                      Equip
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </StatSection>

      <ItemCreatorDialog
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        defaultKind="ryude-weapon"
        hideAddNow
        onCreate={async (item) => {
          await createCustomItem(item);
          equipItem(item.id);
        }}
      />

      {(template.type === 'Courser') && (
        (template.courser_perks && template.courser_perks.length > 0) || template.courser_wc_immunity
      ) && (
        <StatSection title="Courser perks">
          <ul className="list-disc pl-4 text-xs text-[var(--color-ink-soft)]">
            {template.courser_wc_immunity && (
              <li>
                <strong>Word-Casting Immunity:</strong> operator is immune to WC
                Techniques Lv≤3 (unless physical objects/projectiles) — Rule §14:233.
              </li>
            )}
            {template.courser_perks?.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </StatSection>
      )}

      <RepairQueueSection
        tickets={state.repair_queue}
        onAdd={(t) =>
          void onPersist({
            ...instance,
            state: { ...state, repair_queue: [...state.repair_queue, t] },
          })
        }
        onRemove={(id) =>
          void onPersist({
            ...instance,
            state: {
              ...state,
              repair_queue: state.repair_queue.filter((t) => t.id !== id),
            },
          })
        }
      />

      <ActiveEffectsSection
        effects={state.active_effects}
        currentSegment={state.current_segment_index}
        onAdd={(eff) =>
          void onPersist({
            ...instance,
            state: { ...state, active_effects: [...state.active_effects, eff] },
          })
        }
        onRemove={(id) =>
          void onPersist({
            ...instance,
            state: {
              ...state,
              active_effects: state.active_effects.filter((e) => e.id !== id),
            },
          })
        }
      />
      <NotesSection notes={instance.overrides?.notes} />

    </>
  );
}

function RyudeBreakdownPreview({
  template,
  instance,
  operator,
}: {
  template: RyudeTemplate;
  instance: RyudeInstance;
  operator: OperatorStats;
}) {
  const dnCtx = ryudeOperatorRoll(template, instance, operator);
  const inCtx = ryudeInContext(template, instance, operator);
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-2 text-[10px] text-[var(--color-ink-soft)]">
      <div className="font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
        Roll preview — IN (SEN) / DN+BN (AGI)
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4">
        <div>
          <div className="italic text-[var(--color-ink-faint)]">Base IN</div>
          {inCtx.breakdown.filter((l) => !l.label.startsWith('Ryude Ego')).map((line) => (
            <div key={line.label} className="flex justify-between font-mono">
              <span className="truncate">{line.label}</span>
              <span>{line.value >= 0 ? '+' : ''}{line.value}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="italic text-[var(--color-ink-faint)]">Base DN / BN</div>
          {dnCtx.breakdown.filter((l) => !l.label.startsWith('Ryude Ego')).map((line) => (
            <div key={line.label} className="flex justify-between font-mono">
              <span className="truncate">{line.label}</span>
              <span>{line.value >= 0 ? '+' : ''}{line.value}</span>
            </div>
          ))}
        </div>
      </div>
      {ryudeEgoValue(template) !== null && (
        <div className="mt-1 italic text-[var(--color-ink-faint)]">
          Ego: {ryudeEgoValue(template)} (not yet applied)
        </div>
      )}
    </div>
  );
}

function operationalColor(s: RyudeOperationalStatus): string {
  switch (s) {
    case 'destroyed':
    case 'disabled':
      return 'text-[var(--color-rust)]';
    case 'damaged-heavy':
      return 'text-[var(--color-gilt)]';
    case 'damaged-light':
      return 'text-[var(--color-ink-soft)]';
    default:
      return 'text-[var(--color-ink-soft)]';
  }
}

/* ---------------- Repair Queue (Ryude) ---------------- */

function RepairQueueSection({
  tickets,
  onAdd,
  onRemove,
}: {
  tickets: RyudeInstance['state']['repair_queue'];
  onAdd: (t: {
    id: string;
    description: string;
    segment_started: number;
    segments_remaining: number;
  }) => void;
  onRemove: (id: string) => void;
}): React.JSX.Element {
  const [showForm, setShowForm] = React.useState(false);
  const [newDesc, setNewDesc] = React.useState('');
  const [newSegs, setNewSegs] = React.useState('');

  const handleAdd = () => {
    if (!newDesc.trim()) return;
    onAdd({
      id: ulid(),
      description: newDesc.trim(),
      segment_started: 0,
      segments_remaining: parseInt(newSegs, 10) || 1,
    });
    setNewDesc('');
    setNewSegs('');
    setShowForm(false);
  };

  return (
    <StatSection
      title="Repair Queue"
      icon={<Wrench className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}
      defaultOpen={tickets.length > 0}
    >
      {tickets.length > 0 ? (
        <ul className="flex flex-col gap-1 mb-2">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-2 py-1 text-xs"
            >
              <span className="flex-1 font-medium text-[var(--color-ink)]">{t.description}</span>
              <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                {t.segments_remaining} seg remaining
              </span>
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                className="text-[10px] text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]"
                aria-label="Remove repair ticket"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs italic text-[var(--color-ink-faint)]">No active repairs.</p>
      )}
      {showForm ? (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Repair description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
          />
          <input
            type="number"
            min={1}
            placeholder="Segments remaining"
            value={newSegs}
            onChange={(e) => setNewSegs(e.target.value)}
            className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-xs"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={!newDesc.trim()}
              onClick={handleAdd}
              className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-2 py-0.5 text-[10px] disabled:opacity-50 hover:bg-[var(--color-gilt)]/25"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewDesc(''); setNewSegs(''); }}
              className="text-[10px] text-[var(--color-ink-faint)] underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-[10px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-ink)]"
        >
          + Add repair
        </button>
      )}
    </StatSection>
  );
}

/* ---------------- Simple NPC ---------------- */

interface SimpleNpcSectionsProps {
  instance: NpcInstance;
  template: SimpleNpc;
  onPersist: (next: Instance) => Promise<void>;
  openDialog: (d: DialogState) => void;
  onEndSegment: () => void;
}

function SimpleNpcSections({
  instance,
  template,
  onPersist,
  openDialog,
  onEndSegment,
}: SimpleNpcSectionsProps): React.JSX.Element {
  const state = instance.state;
  const setStateField = <K extends keyof NpcInstance['state']>(
    key: K,
    value: NpcInstance['state'][K],
  ) => {
    void onPersist({
      ...instance,
      state: { ...state, [key]: value },
    });
  };

  return (
    <>
      <StatSection
        title="Reaction & Skills"
        defaultOpen
        icon={<Heart className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}
        rightSlot={
          state.segment ? <SegmentChip segment={state.segment} /> : null
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-1.5">
            <StatPill label="CHA Mod" value={template.cha_modifier} />
            <StatPill
              label="Reaction"
              value={template.reaction_value ?? '—'}
            />
            <StatPill label="Role" value={template.role} />
          </div>
          {template.notable_skills.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Notable skills
              </div>
              <ul className="flex flex-col gap-1">
                {template.notable_skills.map((s) => (
                  <li
                    key={s.skill_id}
                    className="flex items-center justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-2 py-1 text-xs"
                  >
                    <span>
                      {s.skill_id}{' '}
                      <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                        Lv {s.level}
                      </span>
                    </span>
                    <RollButton
                      onClick={() => openDialog({ kind: 'skill-simple', skillId: s.skill_id })}
                      label="Roll"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <RollButton onClick={() => openDialog({ kind: 'set-in-dn' })} label="Set IN/DN" />
            <RollButton onClick={() => openDialog({ kind: 'skill-simple' })} label="Skill / Reaction" />
            <RollButton onClick={onEndSegment} label="End Segment" />
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Phys dmg
              </span>
              <div className="flex items-center gap-1 text-[10px] text-[var(--color-ink-faint)]">
                <button
                  type="button"
                  onClick={() => setStateField('current_physical_damage', Math.max(0, state.current_physical_damage - 5))}
                  disabled={state.current_physical_damage === 0}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-verdigris)]/10 px-1.5 py-0 hover:bg-[var(--color-verdigris)]/20 disabled:opacity-30"
                  title="Heal 5"
                >−5</button>
                <button
                  type="button"
                  onClick={() => setStateField('current_physical_damage', Math.max(0, state.current_physical_damage - 1))}
                  disabled={state.current_physical_damage === 0}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-verdigris)]/10 px-1.5 py-0 hover:bg-[var(--color-verdigris)]/20 disabled:opacity-30"
                  title="Heal 1"
                >−1</button>
                <NumberCell
                  value={state.current_physical_damage}
                  onChange={(v) => setStateField('current_physical_damage', Math.max(0, v))}
                />
                <button
                  type="button"
                  onClick={() => setStateField('current_physical_damage', state.current_physical_damage + 1)}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-rust)]/10 px-1.5 py-0 hover:bg-[var(--color-rust)]/20"
                  title="Take 1"
                >+1</button>
                <button
                  type="button"
                  onClick={() => setStateField('current_physical_damage', state.current_physical_damage + 5)}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-rust)]/10 px-1.5 py-0 hover:bg-[var(--color-rust)]/20"
                  title="Take 5"
                >+5</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Mental dmg
              </span>
              <div className="flex items-center gap-1 text-[10px] text-[var(--color-ink-faint)]">
                <button
                  type="button"
                  onClick={() => setStateField('current_mental_damage', Math.max(0, state.current_mental_damage - 5))}
                  disabled={state.current_mental_damage === 0}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-verdigris)]/10 px-1.5 py-0 hover:bg-[var(--color-verdigris)]/20 disabled:opacity-30"
                  title="Heal 5"
                >−5</button>
                <button
                  type="button"
                  onClick={() => setStateField('current_mental_damage', Math.max(0, state.current_mental_damage - 1))}
                  disabled={state.current_mental_damage === 0}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-verdigris)]/10 px-1.5 py-0 hover:bg-[var(--color-verdigris)]/20 disabled:opacity-30"
                  title="Heal 1"
                >−1</button>
                <NumberCell
                  value={state.current_mental_damage}
                  onChange={(v) => setStateField('current_mental_damage', Math.max(0, v))}
                />
                <button
                  type="button"
                  onClick={() => setStateField('current_mental_damage', state.current_mental_damage + 1)}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-rust)]/10 px-1.5 py-0 hover:bg-[var(--color-rust)]/20"
                  title="Take 1"
                >+1</button>
                <button
                  type="button"
                  onClick={() => setStateField('current_mental_damage', state.current_mental_damage + 5)}
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-rust)]/10 px-1.5 py-0 hover:bg-[var(--color-rust)]/20"
                  title="Take 5"
                >+5</button>
              </div>
            </div>
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Status
              </span>
              <select
                value={state.status}
                onChange={(e) => {
                  void onPersist({
                    ...instance,
                    state: {
                      ...state,
                      status: e.target.value as MonsterInstanceStatus,
                      status_override: true,
                    },
                  });
                }}
                className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 text-xs"
              >
                {(['fine', 'wounded', 'incapacitated', 'dead'] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Location
              </span>
              <input
                type="text"
                value={state.location}
                onChange={(e) => setStateField('location', e.target.value)}
                className="h-7 flex-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
              />
            </label>
          </div>
        </div>
      </StatSection>

      {template.description && (
        <StatSection title="Description">
          <p className="text-xs text-[var(--color-ink-soft)] whitespace-pre-wrap">
            {template.description}
          </p>
        </StatSection>
      )}

      <ActiveEffectsSection
        effects={state.active_effects}
        currentSegment={state.current_segment_index}
        onAdd={(eff) =>
          void onPersist({
            ...instance,
            state: { ...state, active_effects: [...state.active_effects, eff] },
          })
        }
        onRemove={(id) =>
          void onPersist({
            ...instance,
            state: {
              ...state,
              active_effects: state.active_effects.filter((e) => e.id !== id),
            },
          })
        }
      />
      <NotesSection notes={(instance.overrides as { notes?: string }).notes} />
    </>
  );
}

/* ---------------- Ryude dialogs sub-tree ---------------- */

interface RyudeDialogsProps {
  dialog: DialogState;
  close: () => void;
  template: RyudeTemplate;
  instance: RyudeInstance;
  characters: Character[];
  npcTemplates: NpcTemplate[];
  catalog: ReferenceCatalog | null;
  customItems: CustomItem[];
  logResolve: (
    entry: Omit<ActionLogEntry, 'id' | 'timestamp_real' | 'character_id' | 'character_name'>,
  ) => Promise<void>;
  onPersist: (next: Instance) => Promise<void>;
}

function RyudeDialogs({
  dialog,
  close,
  template,
  instance,
  characters,
  npcTemplates,
  catalog,
  customItems,
  logResolve,
  onPersist,
}: RyudeDialogsProps): React.JSX.Element | null {
  const operator = instance.equipped_operator
    ? resolveOperatorStats(instance.equipped_operator, characters, npcTemplates)
    : null;

  if (!operator) return null;

  const armors = equippedRyudeArmors(instance.state.equipped_item_ids, catalog, customItems);

  // Base IN = operator SEN base + Ryude SPE + Drive Modifier (Rule §14:149)
  const inCtx = ryudeInContext(template, instance, operator, armors);
  const baseIN = inCtx.base + inCtx.modifier;
  // Base DN/BN = operator AGI base + Ryude SPE + Drive Modifier (Rule §14:124-160)
  const dnCtx = ryudeOperatorRoll(template, instance, operator, armors);
  const baseDN = dnCtx.base + dnCtx.modifier;

  return (
    <>
      <RyudeOperatorDialog
        open={dialog?.kind === 'ryude-operator'}
        onClose={close}
        template={template}
        instance={instance}
        operator={operator}
        onResolve={logResolve}
      />
      <RyudeAttunementDialog
        open={dialog?.kind === 'ryude-attunement'}
        onClose={close}
        template={template}
        instance={instance}
        operator={operator}
        onResolve={async (entry, suggestedNextState, penaltyDelta) => {
          await logResolve(entry);
          const stateUpdates: Partial<typeof instance.state> = {};
          if (suggestedNextState) stateUpdates.attunement_state = suggestedNextState;
          if (penaltyDelta) Object.assign(stateUpdates, penaltyDelta);
          if (Object.keys(stateUpdates).length > 0) {
            await onPersist({
              ...instance,
              state: { ...instance.state, ...stateUpdates },
            });
          }
        }}
      />
      <RyudeAttackDialog
        open={dialog?.kind === 'ryude-attack'}
        onClose={close}
        template={template}
        instance={instance}
        operator={operator}
        catalog={catalog}
        customItems={customItems}
        onResolve={logResolve}
      />
      <InstanceSetInDnDialog
        open={dialog?.kind === 'set-in-dn'}
        onClose={close}
        actorName={instance.name}
        baseIN={baseIN}
        baseDN={baseDN}
        ruleSuffix={
          <>
            IN: operator SEN Base + Ryude SPE + Drive Modifier (Rule §14:149). DN/BN:
            operator AGI Base + Ryude SPE + Drive Modifier (Rule §14:124-160).
          </>
        }
        onResolve={async (entry, segment) => {
          await logResolve(entry);
          await onPersist({
            ...instance,
            state: { ...instance.state, segment },
          });
        }}
      />
    </>
  );
}

/* ---------------- helpers ---------------- */

function parseDurability(template: MonsterTemplate | BeastNpc): number {
  // The bestiary doesn't have an explicit "durability" field — Total Absorption
  // is the closest defensive stat. Use it as a proxy threshold for damage stages
  // (PLAN.md 322-326 + Rule §09:28-30 use "Durability" as the resistance-modified
  // value; for monsters we approximate via total_absorption when present, falling
  // back to base_con as a baseline so status auto-derives sanely).
  const abs = template.total_absorption;
  if (typeof abs === 'number') return Math.max(1, abs);
  if (typeof abs === 'string') {
    const n = parseInt(abs, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Math.max(1, template.base_con ?? 5);
}
