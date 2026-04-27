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
  monsterAbilityRoll,
  ryudeOperatorRoll,
} from '@/engine/derive/instance-rolls';
import { useActionLogStore } from '@/stores/action-log-store';
import type { ActionLogEntry, CurrentSegment } from '@/domain/action-log';
import type { MonsterTemplate } from '@/domain/monster';
import type {
  MonsterInstance,
  MonsterInstanceStatus,
} from '@/domain/monster-instance';
import type { RyudeTemplate } from '@/domain/ryude';
import type {
  RyudeAttunementState,
  RyudeInstance,
} from '@/domain/ryude-instance';
import type { NpcInstance } from '@/domain/npc-instance';
import type { NpcTemplate, SimpleNpc, BeastNpc } from '@/domain/npc';
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

type Instance = MonsterInstance | RyudeInstance | NpcInstance;
type Template = MonsterTemplate | RyudeTemplate | NpcTemplate;

interface Props {
  kind: TemplateKind;
  campaign: Campaign;
  instance: Instance;
  template: Template | null;
  characters: Character[];
  catalog: ReferenceCatalog | null;
  onPersist: (next: Instance) => Promise<void>;
}

type DialogState =
  | { kind: 'attack-monster' }
  | { kind: 'ability-monster' }
  | { kind: 'skill-simple' }
  | { kind: 'set-in-dn' }
  | { kind: 'ryude-operator' }
  | { kind: 'ryude-attunement' }
  | { kind: 'ryude-attack' }
  | null;

export function InstanceStatBlock({
  kind,
  campaign,
  instance,
  template,
  characters,
  catalog,
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
      const result = endSegment(inst.state as never);
      const next: RyudeInstance = {
        ...inst,
        state: result.state as RyudeInstance['state'],
      };
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
          catalog={catalog}
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
          catalog={catalog}
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
          <div className="grid grid-cols-3 gap-1.5">
            <StatPill label="Damage" value={String(template.damage_value)} />
            <StatPill
              label="Absorption"
              value={String(template.total_absorption ?? '—')}
            />
            <StatPill label="Reaction" value={template.reaction} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <RollButton onClick={() => openDialog({ kind: 'set-in-dn' })} label="Set IN/DN" />
            <RollButton onClick={() => openDialog({ kind: 'attack-monster' })} label="Attack" />
            <RollButton onClick={() => openDialog({ kind: 'ability-monster' })} label="Ability" />
            <RollButton onClick={onEndSegment} label="End Segment" />
          </div>
          <div className="grid grid-cols-3 items-center gap-2 text-xs">
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Phys dmg
              </span>
              <NumberCell
                value={state.current_physical_damage}
                onChange={(v) => setStateField('current_physical_damage', v)}
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Mental dmg
              </span>
              <NumberCell
                value={state.current_mental_damage}
                onChange={(v) => setStateField('current_mental_damage', v)}
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Status
              </span>
              <select
                value={state.status}
                onChange={(e) => {
                  const newStatus = e.target.value as MonsterInstanceStatus;
                  void onPersist({
                    ...(instance as MonsterInstance),
                    state: { ...state, status: newStatus, status_override: true },
                  } as Instance);
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
          </div>
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
          {template.base_sen_vs_ryude !== undefined &&
            template.base_sen_vs_ryude !== null && (
              <Detail label="vs-Ryude SEN" value={String(template.base_sen_vs_ryude)} />
            )}
          {template.damage_value_vs_ryude !== undefined &&
            template.damage_value_vs_ryude !== null && (
              <Detail label="vs-Ryude Damage" value={String(template.damage_value_vs_ryude)} />
            )}
          {template.total_absorption_vs_ryude !== undefined &&
            template.total_absorption_vs_ryude !== null && (
              <Detail
                label="vs-Ryude Absorption"
                value={String(template.total_absorption_vs_ryude)}
              />
            )}
        </div>
      </StatSection>

      {state.active_effects.length > 0 && (
        <ActiveEffectsSection
          effects={state.active_effects}
          currentSegment={state.current_segment_index}
        />
      )}
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

function ActiveEffectsSection({
  effects,
  currentSegment,
}: {
  effects: MonsterInstance['state']['active_effects'];
  currentSegment: number;
}) {
  return (
    <StatSection
      defaultOpen
      title="Active Effects"
      icon={<Zap className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />}
      rightSlot={
        <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
          seg {currentSegment}
        </span>
      }
    >
      <ul className="flex flex-col gap-1">
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
              <span className="ml-auto text-[10px] italic text-[var(--color-ink-faint)]">
                {eff.source}
              </span>
            )}
          </li>
        ))}
      </ul>
    </StatSection>
  );
}

/* ---------------- Ryude ---------------- */

interface RyudeSectionsProps {
  instance: RyudeInstance;
  template: RyudeTemplate;
  characters: Character[];
  catalog: ReferenceCatalog | null;
  onPersist: (next: Instance) => Promise<void>;
  openDialog: (d: DialogState) => void;
  onEndSegment: () => void;
}

function RyudeSections({
  instance,
  template,
  characters,
  catalog,
  onPersist,
  openDialog,
  onEndSegment,
}: RyudeSectionsProps): React.JSX.Element {
  const state = instance.state;
  const operator = instance.equipped_operator
    ? characters.find((c) => c.id === instance.equipped_operator!.id) ?? null
    : null;
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
              disabled={unmanned || template.equipment.length === 0}
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
                value={instance.equipped_operator?.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  void onPersist({
                    ...instance,
                    equipped_operator: id ? { kind: 'character', id } : null,
                  });
                }}
                className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
              >
                <option value="">— Unmanned —</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {instance.equipped_operator && !operator && (
                <span className="text-[10px] text-[var(--color-rust)]">
                  ⚠ operator id "{instance.equipped_operator.id}" no longer resolves
                </span>
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

      <StatSection title="Equipment">
        {template.equipment.length === 0 ? (
          <p className="text-xs italic text-[var(--color-ink-faint)]">No equipment.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {template.equipment.map((id) => {
              const w = catalog?.ryudeEquipment.ryude_weapons.find((x) => x.id === id);
              return (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-2 py-1"
                >
                  <span>{w?.name ?? id}</span>
                  {w && (
                    <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                      melee {w.bn_modifier.melee ?? '—'} · dmg {w.damage_value.melee ?? '—'} · crit ≥{w.critical_value}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </StatSection>

      {template.courser_perks && template.courser_perks.length > 0 && (
        <StatSection title="Courser perks">
          <ul className="list-disc pl-4 text-xs text-[var(--color-ink-soft)]">
            {template.courser_perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </StatSection>
      )}

      {/* Ryude schema doesn't include active_effects today; add a parity field
          in a follow-up if the WM needs to track environment effects on the unit. */}
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
  operator: Character;
}) {
  const ctx = ryudeOperatorRoll(template, instance, operator);
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-2 text-[10px] text-[var(--color-ink-soft)]">
      <div className="font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
        Operator-Roll preview
      </div>
      {ctx.breakdown.map((line) => (
        <div key={line.label} className="flex justify-between font-mono">
          <span>{line.label}</span>
          <span>{line.value >= 0 ? '+' : ''}{line.value}</span>
        </div>
      ))}
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
                      onClick={() => openDialog({ kind: 'skill-simple' })}
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
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Phys dmg
              </span>
              <NumberCell
                value={state.current_physical_damage}
                onChange={(v) => setStateField('current_physical_damage', v)}
              />
            </label>
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
        </div>
      </StatSection>

      {template.description && (
        <StatSection title="Description">
          <p className="text-xs text-[var(--color-ink-soft)] whitespace-pre-wrap">
            {template.description}
          </p>
        </StatSection>
      )}

      {state.active_effects.length > 0 && (
        <ActiveEffectsSection
          effects={state.active_effects}
          currentSegment={state.current_segment_index}
        />
      )}
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
  catalog: ReferenceCatalog | null;
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
  catalog,
  logResolve,
  onPersist,
}: RyudeDialogsProps): React.JSX.Element | null {
  const operator = instance.equipped_operator
    ? characters.find((c) => c.id === instance.equipped_operator!.id) ?? null
    : null;

  if (!operator) return null;

  // For Set IN/DN, compute base IN/DN per Rule §14:124-160:
  // Base IN = operator AGI base + Ryude SPE + Drive Modifier
  const opCtx = ryudeOperatorRoll(template, instance, operator);
  const opAgiBase = opCtx.base; // already floor(AGI/3)
  const opSenBase = monsterAbilityRoll; // unused — sanity import to keep tree-shaker happy
  void opSenBase;
  const baseIN = opAgiBase + opCtx.modifier; // SPE + DriveMod fold into "modifier"
  const baseDN = baseIN; // Same composite for Ryude (Rule §14 doesn't differentiate)

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
        onResolve={async (entry, suggestedNextState) => {
          await logResolve(entry);
          if (suggestedNextState) {
            await onPersist({
              ...instance,
              state: { ...instance.state, attunement_state: suggestedNextState },
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
            (operator AGI Base + Ryude SPE + Drive Modifier per Rule §14:124-160)
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
