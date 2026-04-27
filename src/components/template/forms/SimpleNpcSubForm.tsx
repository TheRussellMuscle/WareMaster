import * as React from 'react';
import { Plus, X } from 'lucide-react';
import {
  Field,
  FormSection,
  INPUT_CLASS,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
} from '@/components/forms/FormPrimitives';
import { useReferenceStore } from '@/stores/reference-store';
import { NpcRoleSchema, type SimpleNpc } from '@/domain/npc';

interface SimpleNpcSubFormProps {
  value: SimpleNpc;
  onChange: (next: SimpleNpc) => void;
}

const EMPTY_SKILLS: NonNullable<
  ReturnType<typeof useReferenceStore.getState>['catalog']
>['skills']['skills'] = [];

const ROLE_OPTIONS = NpcRoleSchema.options.map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));

export function SimpleNpcSubForm({
  value,
  onChange,
}: SimpleNpcSubFormProps): React.JSX.Element {
  // Get the catalog reference once; derive skills from it. Avoid `?? []` inside
  // the selector since that returns a fresh array each render and breaks
  // Zustand's identity check (causes infinite re-renders).
  const catalog = useReferenceStore((s) => s.catalog);
  const skills = catalog?.skills.skills ?? EMPTY_SKILLS;
  const set = <K extends keyof SimpleNpc>(key: K, v: SimpleNpc[K]) =>
    onChange({ ...value, [key]: v });

  const addSkill = () =>
    onChange({
      ...value,
      notable_skills: [
        ...value.notable_skills,
        { skill_id: skills[0]?.id ?? '', level: 1 },
      ],
    });

  const updateSkill = (i: number, patch: Partial<SimpleNpc['notable_skills'][number]>) => {
    const next = value.notable_skills.map((s, idx) =>
      idx === i ? { ...s, ...patch } : s,
    );
    onChange({ ...value, notable_skills: next });
  };

  const removeSkill = (i: number) =>
    onChange({
      ...value,
      notable_skills: value.notable_skills.filter((_, idx) => idx !== i),
    });

  return (
    <div className="flex flex-col gap-5">
      <FormSection title="Identity">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Name" required className="md:col-span-2">
            <TextInput value={value.name} onChange={(v) => set('name', v)} />
          </Field>
          <Field label="Role" required>
            <SelectInput
              value={value.role}
              onChange={(v) => set('role', v)}
              options={ROLE_OPTIONS}
            />
          </Field>
          <Field label="Source" hint="Default 'user'.">
            <TextInput
              value={value.source}
              onChange={(v) => set('source', v)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Reaction stats"
        description="Just enough to roll first-impression / reaction checks against. Skip if you'll handwave."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="CHA modifier">
            <NumberInput
              value={value.cha_modifier}
              onChange={(v) => set('cha_modifier', v ?? 0)}
            />
          </Field>
          <Field label="Reaction Value" hint="Optional, overrides defaults if set.">
            <NumberInput
              value={value.reaction_value}
              nullable
              onChange={(v) => set('reaction_value', v)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Notable skills"
        description="Skills the NPC is known for — for ability rolls vs PCs that cross-check skills."
      >
        <div className="flex flex-col gap-1.5">
          {value.notable_skills.length === 0 && (
            <p className="text-[10px] italic text-[var(--color-ink-faint)]">
              (none)
            </p>
          )}
          {value.notable_skills.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_2rem] items-center gap-1.5">
              <select
                value={s.skill_id}
                onChange={(e) => updateSkill(i, { skill_id: e.target.value })}
                className={INPUT_CLASS}
              >
                {skills.length === 0 && (
                  <option value="">— no skills loaded —</option>
                )}
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

      <FormSection title="Description">
        <Field label="Lore / appearance / quirks">
          <TextareaInput
            value={value.description}
            onChange={(v) => set('description', v)}
            rows={5}
          />
        </Field>
      </FormSection>
    </div>
  );
}
