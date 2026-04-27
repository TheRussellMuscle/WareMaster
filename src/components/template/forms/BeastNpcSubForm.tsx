import * as React from 'react';
import {
  Field,
  FormSection,
  TextInput,
} from '@/components/forms/FormPrimitives';
import { MonsterTemplateForm } from './MonsterTemplateForm';
import type { BeastNpc } from '@/domain/npc';
import type { MonsterTemplate } from '@/domain/monster';

interface BeastNpcSubFormProps {
  value: BeastNpc;
  onChange: (next: BeastNpc) => void;
}

/**
 * BeastNpc reuses the full MonsterTemplate stat block (4-armed chimaera-style
 * NPCs that need to roll combat the same way wild monsters do) plus a
 * disposition note for behavioral / loyalty cues.
 */
export function BeastNpcSubForm({
  value,
  onChange,
}: BeastNpcSubFormProps): React.JSX.Element {
  // Wrap MonsterTemplateForm — its onChange returns a MonsterTemplate which we
  // splice back together with the BeastNpc-specific fields (archetype, disposition).
  const onMonsterChange = (next: MonsterTemplate) => {
    onChange({
      ...next,
      archetype: 'beast',
      disposition: value.disposition,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        title="Disposition"
        description="Behavioral / loyalty cues. Free-text — e.g. 'fiercely loyal to its handler', 'skittish around fire'."
      >
        <Field label="Disposition">
          <TextInput
            value={value.disposition}
            onChange={(v) => onChange({ ...value, disposition: v })}
          />
        </Field>
      </FormSection>

      <MonsterTemplateForm value={value} onChange={onMonsterChange} />
    </div>
  );
}
