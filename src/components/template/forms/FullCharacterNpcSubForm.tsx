import * as React from 'react';
import { Plus, X, Users } from 'lucide-react';
import {
  Field,
  FormSection,
  INPUT_CLASS,
  NumberInput,
  SelectInput,
  StringListEditor,
  TextInput,
  TextareaInput,
} from '@/components/forms/FormPrimitives';
import { useReferenceStore } from '@/stores/reference-store';
import { GateSchema, type Gate } from '@/domain/technique';
import type { ClassId } from '@/domain/class';
import {
  type SpiritualistOrder,
  type TradesfolkProfession,
} from '@/domain/character';
import type { FullCharacterNpc } from '@/domain/npc';

interface FullCharacterNpcSubFormProps {
  value: FullCharacterNpc;
  onChange: (next: FullCharacterNpc) => void;
  onOpenDuplicator: () => void;
}

const CLASS_OPTIONS: ReadonlyArray<{ value: ClassId; label: string }> = [
  { value: 'warrior', label: 'Warrior' },
  { value: 'word-caster', label: 'Word-Caster' },
  { value: 'spiritualist', label: 'Spiritualist' },
  { value: 'tradesfolk', label: 'Tradesfolk' },
];

const GATE_OPTIONS: ReadonlyArray<{ value: Gate; label: string }> =
  GateSchema.options.map((g) => ({
    value: g,
    label: g.charAt(0).toUpperCase() + g.slice(1),
  }));

const ORDER_OPTIONS: ReadonlyArray<{ value: SpiritualistOrder; label: string }> = [
  { value: 'monk-votarist', label: 'Monk · Votarist' },
  { value: 'monk-militant', label: 'Monk · Militant' },
  { value: 'invoker-evangelist', label: 'Invoker · Evangelist' },
  { value: 'invoker-denouncer', label: 'Invoker · Denouncer' },
];

const PROFESSION_OPTIONS: ReadonlyArray<{
  value: TradesfolkProfession;
  label: string;
}> = [
  { value: 'thief', label: 'Thief' },
  { value: 'bard', label: 'Bard' },
  { value: 'alchemist', label: 'Alchemist' },
  { value: 'doctor', label: 'Doctor' },
];

const GRIP_OPTIONS = [
  { value: '1H' as const, label: '1H — 1D10+3' },
  { value: '2H' as const, label: '2H — 1D10+5 (suspends shield)' },
];

export function FullCharacterNpcSubForm({
  value,
  onChange,
  onOpenDuplicator,
}: FullCharacterNpcSubFormProps): React.JSX.Element {
  const catalog = useReferenceStore((s) => s.catalog);
  const classes = catalog?.classes.classes ?? [];
  const skills = catalog?.skills.skills ?? [];
  const weapons = catalog?.weapons.weapons ?? [];
  const armor = catalog?.armor ?? [];
  const goods = catalog?.generalGoods ?? null;

  const set = <K extends keyof FullCharacterNpc>(
    key: K,
    v: FullCharacterNpc[K],
  ) => onChange({ ...value, [key]: v });

  const setAbility = (
    k: 'SEN' | 'AGI' | 'WIL' | 'CON' | 'CHA' | 'LUC',
    v: number,
  ) => onChange({ ...value, abilities: { ...value.abilities, [k]: v } });

  const klass = classes.find((c) => c.id === value.class_id);
  const skillPackages = klass?.skill_packages ?? [];
  const equipmentPackages = klass?.equipment_packages ?? [];

  // ---- Skills editor ----
  const addSkill = () =>
    onChange({
      ...value,
      skills: [
        ...value.skills,
        { skill_id: skills[0]?.id ?? '', level: 1, pp: 0 },
      ],
    });

  const updateSkill = (
    i: number,
    patch: Partial<FullCharacterNpc['skills'][number]>,
  ) => {
    const next = value.skills.map((s, idx) =>
      idx === i ? { ...s, ...patch } : s,
    );
    onChange({ ...value, skills: next });
  };

  const removeSkill = (i: number) =>
    onChange({
      ...value,
      skills: value.skills.filter((_, idx) => idx !== i),
    });

  // ---- Inventory editor (other items) ----
  const addInventoryItem = () =>
    onChange({
      ...value,
      equipment: {
        ...value.equipment,
        other: [
          ...value.equipment.other,
          { item_id: '', quantity: 1 },
        ],
      },
    });

  const updateInventoryItem = (
    i: number,
    patch: Partial<FullCharacterNpc['equipment']['other'][number]>,
  ) => {
    const next = value.equipment.other.map((it, idx) =>
      idx === i ? { ...it, ...patch } : it,
    );
    onChange({ ...value, equipment: { ...value.equipment, other: next } });
  };

  const removeInventoryItem = (i: number) =>
    onChange({
      ...value,
      equipment: {
        ...value.equipment,
        other: value.equipment.other.filter((_, idx) => idx !== i),
      },
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm uppercase tracking-wider text-[var(--color-ink)]">
              Quick start
            </h3>
            <p className="mt-0.5 text-xs italic text-[var(--color-ink-soft)]">
              Pre-fill this template from any existing character (across any
              campaign). You can keep editing afterwards.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDuplicator}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-xs hover:bg-[var(--color-parchment-200)]/60"
          >
            <Users className="h-3.5 w-3.5" aria-hidden /> Duplicate from character
          </button>
        </div>
      </div>

      <FormSection title="Identity">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Name" required className="md:col-span-2">
            <TextInput value={value.name} onChange={(v) => set('name', v)} />
          </Field>
          <Field label="Age">
            <NumberInput
              value={value.age}
              nullable
              onChange={(v) => set('age', v)}
            />
          </Field>
          <Field label="Title">
            <TextInput value={value.title} onChange={(v) => set('title', v)} />
          </Field>
          <Field label="Gender">
            <TextInput value={value.gender} onChange={(v) => set('gender', v)} />
          </Field>
          <Field label="Ryude name" hint="If they pilot a Ryude.">
            <TextInput
              value={value.ryude_name}
              onChange={(v) => set('ryude_name', v)}
            />
          </Field>
          <Field label="Homeland">
            <TextInput
              value={value.homeland}
              onChange={(v) => set('homeland', v)}
            />
          </Field>
          <Field label="Current home">
            <TextInput
              value={value.current_home}
              onChange={(v) => set('current_home', v)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Family / relationships">
            <TextareaInput
              value={value.family_relationships}
              onChange={(v) => set('family_relationships', v)}
              rows={3}
            />
          </Field>
          <Field label="Personality notes">
            <TextareaInput
              value={value.personality_notes}
              onChange={(v) => set('personality_notes', v)}
              rows={3}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Class">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Class" required>
            <SelectInput
              value={value.class_id}
              onChange={(v) => {
                // Reset class-specific fields when class changes
                onChange({
                  ...value,
                  class_id: v,
                  word_caster_gate:
                    v === 'word-caster' ? value.word_caster_gate ?? 'gateless' : undefined,
                  spiritualist_order:
                    v === 'spiritualist'
                      ? value.spiritualist_order ?? 'monk-votarist'
                      : undefined,
                  tradesfolk_profession:
                    v === 'tradesfolk'
                      ? value.tradesfolk_profession ?? 'thief'
                      : undefined,
                });
              }}
              options={CLASS_OPTIONS}
            />
          </Field>
          {value.class_id === 'word-caster' && (
            <Field label="Gate" required>
              <SelectInput
                value={value.word_caster_gate ?? 'gateless'}
                onChange={(v) => set('word_caster_gate', v)}
                options={GATE_OPTIONS}
              />
            </Field>
          )}
          {value.class_id === 'spiritualist' && (
            <Field label="Spiritualist order" required>
              <SelectInput
                value={value.spiritualist_order ?? 'monk-votarist'}
                onChange={(v) => set('spiritualist_order', v)}
                options={ORDER_OPTIONS}
              />
            </Field>
          )}
          {value.class_id === 'tradesfolk' && (
            <Field label="Profession" required>
              <SelectInput
                value={value.tradesfolk_profession ?? 'thief'}
                onChange={(v) => set('tradesfolk_profession', v)}
                options={PROFESSION_OPTIONS}
              />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Skill package" hint="Class-defined skill bundle.">
            <select
              value={value.skill_package_id}
              onChange={(e) => set('skill_package_id', e.target.value)}
              className={INPUT_CLASS}
            >
              {skillPackages.length === 0 && (
                <option value="">— pick a class first —</option>
              )}
              {skillPackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipment package" hint="Optional starting kit.">
            <select
              value={value.equipment_package_id ?? ''}
              onChange={(e) =>
                set('equipment_package_id', e.target.value || null)
              }
              className={INPUT_CLASS}
            >
              <option value="">— none —</option>
              {equipmentPackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      {value.class_id === 'word-caster' && (
        <FormSection title="Word-Caster details">
          <Field label="Memory Points spent">
            <NumberInput
              value={value.memory_points_spent}
              onChange={(v) => set('memory_points_spent', v ?? 0)}
            />
          </Field>
        </FormSection>
      )}

      {value.class_id === 'spiritualist' && (
        <FormSection title="Spiritualist details">
          <Field label="Doctrine">
            <TextareaInput
              value={value.spiritualist_doctrine}
              onChange={(v) => set('spiritualist_doctrine', v)}
              rows={2}
            />
          </Field>
          <Field label="Restrictions">
            <TextareaInput
              value={value.spiritualist_restrictions}
              onChange={(v) => set('spiritualist_restrictions', v)}
              rows={2}
            />
          </Field>
          <Field label="Special implements">
            <TextareaInput
              value={value.spiritualist_special_implements}
              onChange={(v) => set('spiritualist_special_implements', v)}
              rows={2}
            />
          </Field>
        </FormSection>
      )}

      <FormSection title="Abilities" description="Score from rule §04 — not Base.">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {(['SEN', 'AGI', 'WIL', 'CON', 'CHA', 'LUC'] as const).map((k) => (
            <Field key={k} label={k} required>
              <NumberInput
                value={value.abilities[k]}
                min={0}
                onChange={(v) => setAbility(k, v ?? 0)}
              />
            </Field>
          ))}
        </div>
        <Field label="Appearance modifier" hint="Added to CHA for First Impression Rolls.">
          <NumberInput
            value={value.appearance_modifier}
            onChange={(v) => set('appearance_modifier', v ?? 0)}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Skills"
        description="Trained skills with their level and PP. PP is normally per-skill progress; default 0 is fine for templates."
      >
        <div className="flex flex-col gap-1.5">
          {value.skills.length === 0 && (
            <p className="text-[10px] italic text-[var(--color-ink-faint)]">
              (no trained skills)
            </p>
          )}
          {value.skills.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_4rem_4rem_2rem] items-center gap-1.5"
            >
              <select
                value={s.skill_id}
                onChange={(e) => updateSkill(i, { skill_id: e.target.value })}
                className={INPUT_CLASS}
              >
                {skills.map((sk) => (
                  <option key={sk.id} value={sk.id}>
                    {sk.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={s.level}
                min={0}
                onChange={(e) =>
                  updateSkill(i, { level: parseInt(e.target.value, 10) || 0 })
                }
                className={`${INPUT_CLASS} font-mono`}
                title="Level"
              />
              <input
                type="number"
                value={s.pp}
                min={0}
                onChange={(e) =>
                  updateSkill(i, { pp: parseInt(e.target.value, 10) || 0 })
                }
                className={`${INPUT_CLASS} font-mono`}
                title="PP"
              />
              <button
                type="button"
                onClick={() => removeSkill(i)}
                aria-label="Remove skill"
                className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSkill}
            className="inline-flex w-fit items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
          >
            <Plus className="h-3 w-3" aria-hidden /> Add skill
          </button>
        </div>
      </FormSection>

      <FormSection
        title="Techniques"
        description="Free-text technique ids. Cross-reference docs/data/techniques/* for the catalogue."
      >
        <StringListEditor
          values={value.techniques}
          onChange={(next) => set('techniques', next)}
          placeholder="e.g. word-casting/sun/illuminate"
          addLabel="Add technique"
        />
      </FormSection>

      <FormSection title="Equipment">
        <Field label="Weapons" hint="Weapon ids from the catalog.">
          <div className="flex flex-col gap-1.5">
            {value.equipment.weapons.length === 0 && (
              <p className="text-[10px] italic text-[var(--color-ink-faint)]">
                (no weapons)
              </p>
            )}
            {value.equipment.weapons.map((wid, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <select
                  value={wid}
                  onChange={(e) => {
                    const next = [...value.equipment.weapons];
                    next[i] = e.target.value;
                    onChange({
                      ...value,
                      equipment: { ...value.equipment, weapons: next },
                    });
                  }}
                  className={INPUT_CLASS}
                >
                  {weapons.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      equipment: {
                        ...value.equipment,
                        weapons: value.equipment.weapons.filter(
                          (_, idx) => idx !== i,
                        ),
                      },
                    })
                  }
                  aria-label="Remove weapon"
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  equipment: {
                    ...value.equipment,
                    weapons: [
                      ...value.equipment.weapons,
                      weapons[0]?.id ?? '',
                    ],
                  },
                })
              }
              className="inline-flex w-fit items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
            >
              <Plus className="h-3 w-3" aria-hidden /> Add weapon
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Body armor">
            <select
              value={value.equipment.body_armor ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  equipment: {
                    ...value.equipment,
                    body_armor: e.target.value || null,
                  },
                })
              }
              className={INPUT_CLASS}
            >
              <option value="">— none —</option>
              {armor
                .filter((a) => a.slot === 'body')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Head armor">
            <select
              value={value.equipment.head_armor ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  equipment: {
                    ...value.equipment,
                    head_armor: e.target.value || null,
                  },
                })
              }
              className={INPUT_CLASS}
            >
              <option value="">— none —</option>
              {armor
                .filter((a) => a.slot === 'head')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Shield">
            <select
              value={value.equipment.shield ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  equipment: {
                    ...value.equipment,
                    shield: e.target.value || null,
                  },
                })
              }
              className={INPUT_CLASS}
            >
              <option value="">— none —</option>
              {armor
                .filter((a) => a.slot === 'shield')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        {value.equipment.weapons.includes('bastard-sword') && (
          <Field label="Bastard sword grip">
            <SelectInput
              value={value.equipment.bastard_sword_grip}
              onChange={(v) =>
                onChange({
                  ...value,
                  equipment: { ...value.equipment, bastard_sword_grip: v },
                })
              }
              options={GRIP_OPTIONS}
            />
          </Field>
        )}

        <Field label="Other inventory">
          <div className="flex flex-col gap-1.5">
            {value.equipment.other.length === 0 && (
              <p className="text-[10px] italic text-[var(--color-ink-faint)]">
                (none)
              </p>
            )}
            {value.equipment.other.map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_4rem_2rem] items-center gap-1.5"
              >
                <input
                  type="text"
                  value={it.item_id}
                  onChange={(e) =>
                    updateInventoryItem(i, { item_id: e.target.value })
                  }
                  placeholder="item id"
                  className={INPUT_CLASS}
                />
                <input
                  type="number"
                  value={it.quantity}
                  min={1}
                  onChange={(e) =>
                    updateInventoryItem(i, {
                      quantity: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className={`${INPUT_CLASS} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => removeInventoryItem(i)}
                  aria-label="Remove item"
                  className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addInventoryItem}
              className="inline-flex w-fit items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
            >
              <Plus className="h-3 w-3" aria-hidden /> Add item
            </button>
          </div>
        </Field>
      </FormSection>

      <FormSection title="Wealth & LUC">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Golda">
            <NumberInput
              value={value.golda}
              min={0}
              onChange={(v) => set('golda', v ?? 0)}
            />
          </Field>
          <Field label="Completion bonus">
            <NumberInput
              value={value.completion_bonus}
              onChange={(v) => set('completion_bonus', v ?? 0)}
            />
          </Field>
          <Field label="LUC reserves">
            <NumberInput
              value={value.luc_reserves}
              min={0}
              onChange={(v) => set('luc_reserves', v ?? 0)}
            />
          </Field>
          <Field label="Initial LUC" required>
            <NumberInput
              value={value.initial_luc}
              min={0}
              onChange={(v) => set('initial_luc', v ?? 0)}
            />
          </Field>
        </div>
      </FormSection>

      {goods && (
        <FormSection
          title="Reference"
          description="Loaded catalog entries — read-only summary so the form can resolve picker IDs."
        >
          <p className="text-[10px] italic text-[var(--color-ink-faint)]">
            {weapons.length} weapons · {armor.length} armor · {skills.length}{' '}
            skills available.
          </p>
        </FormSection>
      )}
    </div>
  );
}
