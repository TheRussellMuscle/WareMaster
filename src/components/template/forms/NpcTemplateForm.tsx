import * as React from 'react';
import {
  Field,
  FormSection,
  SelectInput,
} from '@/components/forms/FormPrimitives';
import { BeastNpcSubForm } from './BeastNpcSubForm';
import { SimpleNpcSubForm } from './SimpleNpcSubForm';
import { FullCharacterNpcSubForm } from './FullCharacterNpcSubForm';
import { CharacterDuplicator } from '../CharacterDuplicator';
import { emptyMonsterTemplate } from './MonsterTemplateForm';
import {
  type BeastNpc,
  type FullCharacterNpc,
  type NpcArchetype,
  type NpcTemplate,
  type SimpleNpc,
} from '@/domain/npc';
import type { Character } from '@/domain/character';

interface NpcTemplateFormProps {
  value: NpcTemplate;
  onChange: (next: NpcTemplate) => void;
}

const ARCHETYPE_OPTIONS: ReadonlyArray<{ value: NpcArchetype; label: string }> = [
  { value: 'simple', label: 'Simple — light stat block (merchants, NPCs in chatter)' },
  { value: 'beast', label: 'Beast — full monster stat block (named guard dog, etc.)' },
  { value: 'full-character', label: 'Full Character — entire PC sheet (rivals, allies)' },
];

export function NpcTemplateForm({
  value,
  onChange,
}: NpcTemplateFormProps): React.JSX.Element {
  const [duplicatorOpen, setDuplicatorOpen] = React.useState(false);

  const onArchetypeChange = (next: NpcArchetype) => {
    if (next === value.archetype) return;
    onChange(switchArchetype(value, next));
  };

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        title="Archetype"
        description="Pick the shape of the stat block — switching rebuilds the form (and clears archetype-specific fields)."
      >
        <Field label="Archetype" required>
          <SelectInput
            value={value.archetype}
            onChange={onArchetypeChange}
            options={ARCHETYPE_OPTIONS}
          />
        </Field>
      </FormSection>

      {value.archetype === 'simple' && (
        <SimpleNpcSubForm
          value={value as SimpleNpc}
          onChange={(next) => onChange(next)}
        />
      )}
      {value.archetype === 'beast' && (
        <BeastNpcSubForm
          value={value as BeastNpc}
          onChange={(next) => onChange(next)}
        />
      )}
      {value.archetype === 'full-character' && (
        <>
          <FullCharacterNpcSubForm
            value={value as FullCharacterNpc}
            onChange={(next) => onChange(next)}
            onOpenDuplicator={() => setDuplicatorOpen(true)}
          />
          <CharacterDuplicator
            open={duplicatorOpen}
            onClose={() => setDuplicatorOpen(false)}
            onPick={(character) => {
              onChange(characterToFullCharNpc(value as FullCharacterNpc, character));
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Switch the archetype of an NpcTemplate while preserving the id and name
 * (the only fields that survive a structural change). Other fields reset to
 * defaults so the form has a clean slate.
 */
function switchArchetype(
  current: NpcTemplate,
  next: NpcArchetype,
): NpcTemplate {
  const id = (current as { id: string }).id;
  const name = (current as { name: string }).name;
  if (next === 'simple') {
    const result: SimpleNpc = {
      archetype: 'simple',
      id,
      name,
      source: 'user',
      role: 'merchant',
      cha_modifier: 0,
      reaction_value: null,
      notable_skills: [],
      description: '',
    };
    return result;
  }
  if (next === 'beast') {
    const monster = emptyMonsterTemplate(id);
    const result: BeastNpc = {
      ...monster,
      name,
      archetype: 'beast',
      disposition: '',
    };
    return result;
  }
  // full-character — empty Character minus campaign_id/state/notes_path
  const result: FullCharacterNpc = {
    archetype: 'full-character',
    schema_version: 1,
    id,
    name,
    age: null,
    gender: '',
    title: '',
    homeland: '',
    current_home: '',
    family_relationships: '',
    personality_notes: '',
    ryude_name: '',
    class_id: 'warrior',
    word_caster_gate: undefined,
    spiritualist_order: undefined,
    tradesfolk_profession: undefined,
    memory_points_spent: 0,
    spiritualist_doctrine: '',
    spiritualist_restrictions: '',
    spiritualist_special_implements: '',
    skill_package_id: '',
    equipment_package_id: null,
    appearance_modifier: 0,
    abilities: { SEN: 9, AGI: 9, WIL: 9, CON: 9, CHA: 9, LUC: 9 },
    skills: [],
    techniques: [],
    equipment: {
      weapons: [],
      body_armor: null,
      head_armor: null,
      shield: null,
      other: [],
      bastard_sword_grip: '1H',
    },
    golda: 0,
    completion_bonus: 0,
    luc_reserves: 0,
    initial_luc: 9,
    portrait_path: null,
    created_at: '',
    updated_at: '',
  };
  return result;
}

/**
 * Pre-fill a FullCharacter NPC template from an existing character. Preserves
 * the NPC's existing id (so the template file stays in place) but overwrites
 * everything else with the source character's values. Strips per-instance
 * fields (campaign_id, state, notes_path) that don't exist on the NPC schema.
 */
function characterToFullCharNpc(
  current: FullCharacterNpc,
  character: Character,
): FullCharacterNpc {
  const {
    campaign_id: _campaign_id,
    state: _state,
    notes_path: _notes_path,
    ...rest
  } = character;
  return {
    ...rest,
    archetype: 'full-character',
    id: current.id,
    // Use the source character's portrait if it has one — but the user may
    // want to upload a different one separately (templates store their own
    // portrait under portraits/templates/npcs/<id>.png).
    portrait_path: rest.portrait_path,
    created_at: current.created_at,
    updated_at: current.updated_at,
  };
}
