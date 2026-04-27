import * as React from 'react';
import {
  Field,
  FormSection,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
} from '@/components/forms/FormPrimitives';
import {
  MonsterTemplateSchema,
  type MonsterRank,
  type MonsterReaction,
  type MonsterTemplate,
} from '@/domain/monster';

interface MonsterTemplateFormProps {
  value: MonsterTemplate;
  onChange: (next: MonsterTemplate) => void;
}

const RANK_OPTIONS: ReadonlyArray<{ value: MonsterRank; label: string }> = [
  { value: 'A', label: 'A — exceptional' },
  { value: 'B', label: 'B — rare' },
  { value: 'C', label: 'C — typical' },
  { value: 'D', label: 'D — common' },
  { value: 'E', label: 'E — minor' },
];

const REACTION_OPTIONS: ReadonlyArray<{ value: MonsterReaction; label: string }> = [
  { value: 'Attack', label: 'Attack' },
  { value: 'Flee or Attack', label: 'Flee or Attack' },
  { value: 'Ignore or Flee', label: 'Ignore or Flee' },
  { value: 'Behavior depends on commands', label: 'Behavior depends on commands' },
];

const INTELLIGENCE_OPTIONS = [
  { value: 'None' as const, label: 'None' },
  { value: 'Low' as const, label: 'Low' },
  { value: 'High' as const, label: 'High' },
];

export function MonsterTemplateForm({
  value,
  onChange,
}: MonsterTemplateFormProps): React.JSX.Element {
  const set = <K extends keyof MonsterTemplate>(key: K, v: MonsterTemplate[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-col gap-5">
      <FormSection title="Identity">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Name" required>
            <TextInput value={value.name} onChange={(v) => set('name', v)} />
          </Field>
          <Field label="Rank" required>
            <SelectInput
              value={value.rank}
              onChange={(v) => set('rank', v)}
              options={RANK_OPTIONS}
            />
          </Field>
          <Field label="Type" hint="Free-text label, e.g. 'Beast', 'Construct'.">
            <TextInput
              value={value.type ?? ''}
              onChange={(v) => set('type', v || undefined)}
            />
          </Field>
          <Field label="Source" required hint="Playkit page or 'user'.">
            <TextInput
              value={value.source}
              onChange={(v) => set('source', v)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Combat — vs Character"
        description="Base ability scores when this monster acts against PCs. Leave blank for monsters that don't roll the stat (e.g. mindless constructs and CON)."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Base SEN">
            <NumberInput
              value={value.base_sen ?? null}
              nullable
              onChange={(v) => set('base_sen', v ?? null)}
            />
          </Field>
          <Field label="Base AGI">
            <NumberInput
              value={value.base_agi ?? null}
              nullable
              onChange={(v) => set('base_agi', v ?? null)}
            />
          </Field>
          <Field label="Base CON">
            <NumberInput
              value={value.base_con ?? null}
              nullable
              onChange={(v) => set('base_con', v ?? null)}
            />
          </Field>
          <Field label="Base WIL">
            <NumberInput
              value={value.base_wil ?? null}
              nullable
              onChange={(v) => set('base_wil', v ?? null)}
            />
          </Field>
          <Field label="Base CHA">
            <NumberInput
              value={value.base_cha ?? null}
              nullable
              onChange={(v) => set('base_cha', v ?? null)}
            />
          </Field>
          <Field label="Base CON notes">
            <TextInput
              value={value.base_con_notes ?? ''}
              onChange={(v) => set('base_con_notes', v || undefined)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Damage Value" required hint="e.g. '1D10+3', '2D5+5'.">
            <TextInput
              value={String(value.damage_value)}
              onChange={(v) => set('damage_value', v)}
            />
          </Field>
          <Field label="Total Absorption">
            <TextInput
              value={value.total_absorption == null ? '' : String(value.total_absorption)}
              onChange={(v) => set('total_absorption', v === '' ? null : v)}
            />
          </Field>
          <Field label="Anti-LUC" hint="Optional anti-LUC die / effect.">
            <TextInput
              value={value.anti_luc ?? ''}
              onChange={(v) => set('anti_luc', v || undefined)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Combat — vs Ryude"
        description="Bracketed stat block when this monster fights mecha. Leave blank if not applicable."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Base SEN vs Ryude">
            <NumberInput
              value={value.base_sen_vs_ryude ?? null}
              nullable
              onChange={(v) => set('base_sen_vs_ryude', v ?? null)}
            />
          </Field>
          <Field label="Base AGI vs Ryude">
            <NumberInput
              value={value.base_agi_vs_ryude ?? null}
              nullable
              onChange={(v) => set('base_agi_vs_ryude', v ?? null)}
            />
          </Field>
          <Field label="Base CON vs Ryude">
            <NumberInput
              value={value.base_con_vs_ryude ?? null}
              nullable
              onChange={(v) => set('base_con_vs_ryude', v ?? null)}
            />
          </Field>
          <Field label="Base WIL vs Ryude">
            <NumberInput
              value={value.base_wil_vs_ryude ?? null}
              nullable
              onChange={(v) => set('base_wil_vs_ryude', v ?? null)}
            />
          </Field>
          <Field label="CHA mod vs Ryude">
            <NumberInput
              value={value.cha_modifier_vs_ryude ?? null}
              nullable
              onChange={(v) => set('cha_modifier_vs_ryude', v ?? null)}
            />
          </Field>
          <Field label="Damage × vs Ryude">
            <NumberInput
              value={value.damage_value_multiplier_vs_ryude ?? null}
              nullable
              onChange={(v) =>
                set('damage_value_multiplier_vs_ryude', v ?? undefined)
              }
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Damage Value vs Ryude" hint="Override notation if it differs.">
            <TextInput
              value={
                value.damage_value_vs_ryude == null
                  ? ''
                  : String(value.damage_value_vs_ryude)
              }
              onChange={(v) =>
                set('damage_value_vs_ryude', v === '' ? undefined : v)
              }
            />
          </Field>
          <Field label="Total Absorption vs Ryude">
            <TextInput
              value={
                value.total_absorption_vs_ryude == null
                  ? ''
                  : String(value.total_absorption_vs_ryude)
              }
              onChange={(v) =>
                set('total_absorption_vs_ryude', v === '' ? null : v)
              }
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Behavior & Habitat">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Reaction" required>
            <SelectInput
              value={value.reaction}
              onChange={(v) => set('reaction', v)}
              options={REACTION_OPTIONS}
            />
          </Field>
          <Field label="Intelligence" required>
            <SelectInput
              value={value.intelligence}
              onChange={(v) => set('intelligence', v)}
              options={INTELLIGENCE_OPTIONS}
            />
          </Field>
          <Field label="Movement Speed" required>
            <NumberInput
              value={value.movement_speed}
              onChange={(v) => set('movement_speed', v ?? 0)}
            />
          </Field>
          <Field label="Sprint Speed">
            <NumberInput
              value={value.sprint_speed ?? null}
              nullable
              onChange={(v) => set('sprint_speed', v ?? undefined)}
            />
          </Field>
          <Field label="Encounter Rate" required hint="0–100">
            <NumberInput
              value={value.encounter_rate}
              min={0}
              max={100}
              onChange={(v) => set('encounter_rate', v ?? 0)}
            />
          </Field>
          <Field label="Encounter Rate vs Ryude">
            <NumberInput
              value={value.encounter_rate_vs_ryude ?? null}
              nullable
              onChange={(v) => set('encounter_rate_vs_ryude', v ?? undefined)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Number Encountered" required hint="e.g. '1', '1D5', 'Per attack'.">
            <TextInput
              value={String(value.number_encountered)}
              onChange={(v) => set('number_encountered', v)}
            />
          </Field>
          <Field label="Primary Habitat" required>
            <TextInput
              value={value.primary_habitat}
              onChange={(v) => set('primary_habitat', v)}
            />
          </Field>
          <Field label="Encounter Rate Notes" className="md:col-span-2">
            <TextInput
              value={value.encounter_rate_notes ?? ''}
              onChange={(v) => set('encounter_rate_notes', v || undefined)}
            />
          </Field>
          <Field label="Physical Durability Notes" className="md:col-span-2">
            <TextInput
              value={value.physical_durability_notes ?? ''}
              onChange={(v) => set('physical_durability_notes', v || undefined)}
            />
          </Field>
          <Field label="Mental Durability Notes" className="md:col-span-2">
            <TextInput
              value={value.mental_durability_notes ?? ''}
              onChange={(v) => set('mental_durability_notes', v || undefined)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Description">
        <Field label="Lore / appearance / behavior">
          <TextareaInput
            value={value.description}
            onChange={(v) => set('description', v)}
            rows={6}
          />
        </Field>
      </FormSection>
    </div>
  );
}

export function emptyMonsterTemplate(id: string): MonsterTemplate {
  return MonsterTemplateSchema.parse({
    id,
    name: '',
    rank: 'C',
    source: 'user',
    reaction: 'Attack',
    damage_value: '1D5+1',
    movement_speed: 1,
    intelligence: 'Low',
    primary_habitat: '',
    encounter_rate: 0,
    number_encountered: 1,
    description: '',
  });
}
