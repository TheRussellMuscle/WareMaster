import * as React from 'react';
import {
  Field,
  FormSection,
  NumberInput,
  SelectInput,
  StringListEditor,
  TextInput,
  TextareaInput,
} from '@/components/forms/FormPrimitives';
import {
  RyudeTemplateSchema,
  type RyudeTemplate,
  type RyudeType,
} from '@/domain/ryude';

interface RyudeTemplateFormProps {
  value: RyudeTemplate;
  onChange: (next: RyudeTemplate) => void;
}

const TYPE_OPTIONS: ReadonlyArray<{ value: RyudeType; label: string }> = [
  { value: 'Footman', label: 'Footman' },
  { value: 'Courser', label: 'Courser' },
  { value: 'Maledictor', label: 'Maledictor' },
];

export function RyudeTemplateForm({
  value,
  onChange,
}: RyudeTemplateFormProps): React.JSX.Element {
  const set = <K extends keyof RyudeTemplate>(key: K, v: RyudeTemplate[K]) =>
    onChange({ ...value, [key]: v });

  const setAttr = (k: 'spe' | 'pow' | 'arm' | 'bal', v: number) =>
    onChange({ ...value, attributes: { ...value.attributes, [k]: v } });

  return (
    <div className="flex flex-col gap-5">
      <FormSection title="Identity">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Name" required className="md:col-span-2">
            <TextInput value={value.name} onChange={(v) => set('name', v)} />
          </Field>
          <Field label="Type" required>
            <SelectInput
              value={value.type}
              onChange={(v) => set('type', v)}
              options={TYPE_OPTIONS}
            />
          </Field>
          <Field label="Source" required>
            <TextInput
              value={value.source}
              onChange={(v) => set('source', v)}
            />
          </Field>
          <Field label="Persona Rank" required hint="A — H scale">
            <TextInput
              value={value.persona_rank}
              onChange={(v) => set('persona_rank', v)}
            />
          </Field>
          <Field label="Ryude Rank" required>
            <TextInput
              value={value.ryude_rank}
              onChange={(v) => set('ryude_rank', v)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Attributes"
        description="Speed / Power / Armor / Balance — the four ratings rolled when this Ryude acts."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="SPE" required>
            <NumberInput
              value={value.attributes.spe}
              onChange={(v) => setAttr('spe', v ?? 0)}
            />
          </Field>
          <Field label="POW" required>
            <NumberInput
              value={value.attributes.pow}
              onChange={(v) => setAttr('pow', v ?? 0)}
            />
          </Field>
          <Field label="ARM" required>
            <NumberInput
              value={value.attributes.arm}
              onChange={(v) => setAttr('arm', v ?? 0)}
            />
          </Field>
          <Field label="BAL" required>
            <NumberInput
              value={value.attributes.bal}
              onChange={(v) => setAttr('bal', v ?? 0)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Stats">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Durability" required>
            <NumberInput
              value={value.durability}
              onChange={(v) => set('durability', v ?? 0)}
            />
          </Field>
          <Field label="Required Drive" required>
            <NumberInput
              value={value.required_drive}
              onChange={(v) => set('required_drive', v ?? 0)}
            />
          </Field>
          <Field label="Attunement Value" required>
            <NumberInput
              value={value.attunement_value}
              onChange={(v) => set('attunement_value', v ?? 0)}
            />
          </Field>
          <Field label="Ego" hint="Optional, Maledictor-only.">
            <NumberInput
              value={value.ego ?? null}
              nullable
              onChange={(v) => set('ego', v)}
            />
          </Field>
          <Field label="Numetic modifier" hint="Optional Courser perk.">
            <NumberInput
              value={value.numetic_modifier ?? null}
              nullable
              onChange={(v) => set('numetic_modifier', v ?? undefined)}
            />
          </Field>
          <Field label="Binding modifier">
            <NumberInput
              value={value.binding_modifier ?? null}
              nullable
              onChange={(v) => set('binding_modifier', v ?? undefined)}
            />
          </Field>
          <Field label="Ryude Mind Durability" hint="Maledictor-only mental track.">
            <NumberInput
              value={value.ryude_mind_durability ?? null}
              nullable
              onChange={(v) => set('ryude_mind_durability', v ?? undefined)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Equipment"
        description="Default loadout — instances may override at spawn time."
      >
        <StringListEditor
          values={value.equipment}
          onChange={(next) => set('equipment', next)}
          placeholder="e.g. Bastard sword"
          addLabel="Add equipment"
        />
      </FormSection>

      {value.type === 'Courser' && (
        <FormSection
          title="Courser perks"
          description="Free-text perks unique to this Courser unit."
        >
          <StringListEditor
            values={value.courser_perks ?? []}
            onChange={(next) =>
              set('courser_perks', next.length > 0 ? next : undefined)
            }
            placeholder="e.g. Self-repair: 1 Durability per day…"
            addLabel="Add perk"
          />
        </FormSection>
      )}

      <FormSection title="Notes">
        <StringListEditor
          values={value.notes ?? []}
          onChange={(next) => set('notes', next.length > 0 ? next : undefined)}
          placeholder="Free-text note"
          addLabel="Add note"
        />
      </FormSection>

      <FormSection title="Description">
        <Field label="Lore / appearance / quirks">
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

export function emptyRyudeTemplate(id: string): RyudeTemplate {
  return RyudeTemplateSchema.parse({
    id,
    name: '',
    source: 'user',
    type: 'Footman',
    attributes: { spe: 5, pow: 5, arm: 5, bal: 5 },
    durability: 30,
    required_drive: 3,
    persona_rank: 'F',
    attunement_value: 5,
    ryude_rank: 'F',
    equipment: [],
    description: '',
  });
}
