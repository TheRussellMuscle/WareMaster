import * as React from 'react';
import { ParchmentDialog } from '@/components/dialogs/ParchmentDialog';
import { FormError } from '@/components/forms/FormPrimitives';
import {
  MonsterTemplateForm,
  emptyMonsterTemplate,
} from './forms/MonsterTemplateForm';
import {
  RyudeTemplateForm,
  emptyRyudeTemplate,
} from './forms/RyudeTemplateForm';
import { NpcTemplateForm } from './forms/NpcTemplateForm';
import { useTemplateStore } from '@/stores/template-store';
import {
  createTemplate,
  newTemplateId,
  updateTemplate,
  type TemplateOf,
  type TemplateScope,
} from '@/persistence/template-repo';
import type { TemplateKind } from '@/persistence/paths';
import type { MonsterTemplate } from '@/domain/monster';
import type { RyudeTemplate } from '@/domain/ryude';
import type { NpcTemplate, SimpleNpc } from '@/domain/npc';

interface TemplateFormDialogProps<K extends TemplateKind> {
  open: boolean;
  onClose: () => void;
  kind: K;
  scope: TemplateScope;
  /** When provided, edit this template; otherwise create a new one. */
  existing?: TemplateOf<K> | null;
  onSaved?: (saved: TemplateOf<K>) => void;
}

export function TemplateFormDialog<K extends TemplateKind>({
  open,
  onClose,
  kind,
  scope,
  existing,
  onSaved,
}: TemplateFormDialogProps<K>): React.JSX.Element {
  const [draft, setDraft] = React.useState<TemplateOf<K> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const invalidateGlobal = useTemplateStore((s) => s.invalidateGlobal);
  const invalidateCampaign = useTemplateStore((s) => s.invalidateCampaign);

  // Initialize / reset draft when the dialog opens.
  React.useEffect(() => {
    if (!open) {
      setDraft(null);
      setError(null);
      setSaving(false);
      return;
    }
    if (existing) {
      setDraft(existing);
    } else {
      setDraft(emptyForKind(kind) as TemplateOf<K>);
    }
  }, [open, existing, kind]);

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const saved = existing
        ? await updateTemplate(scope, kind, draft)
        : await createTemplate(scope, kind, draft);
      if (scope.kind === 'global') invalidateGlobal(kind);
      else invalidateCampaign(scope.campaignDir, kind);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(formatZodError(e));
    } finally {
      setSaving(false);
    }
  };

  const title = existing
    ? `Edit ${kindLabel(kind)} template`
    : `New ${kindLabel(kind)} template`;

  return (
    <ParchmentDialog
      open={open}
      onClose={onClose}
      title={title}
      description={
        scope.kind === 'campaign'
          ? `Campaign-scoped — overrides bundled and vault templates with the same id.`
          : 'Vault-scoped — available across every campaign.'
      }
      widthClass="w-[min(96vw,56rem)]"
      footer={
        <>
          <FormError error={error} />
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || !draft || !canSave(draft)}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create template'}
          </button>
        </>
      }
    >
      {draft ? renderForm(kind, draft, setDraft as (v: TemplateOf<K>) => void) : null}
    </ParchmentDialog>
  );
}

function emptyForKind(kind: TemplateKind): TemplateOf<TemplateKind> {
  if (kind === 'monster') {
    return emptyMonsterTemplate(newTemplateId('monster'));
  }
  if (kind === 'ryude') {
    return emptyRyudeTemplate(newTemplateId('ryude'));
  }
  return emptyNpcTemplate(newTemplateId('npc'));
}

function emptyNpcTemplate(id: string): NpcTemplate {
  // Default to a Simple NPC — the lightest archetype.
  const simple: SimpleNpc = {
    archetype: 'simple',
    id,
    name: '',
    source: 'user',
    role: 'merchant',
    cha_modifier: 0,
    reaction_value: null,
    notable_skills: [],
    description: '',
  };
  return simple;
}

function renderForm<K extends TemplateKind>(
  kind: K,
  draft: TemplateOf<K>,
  setDraft: (v: TemplateOf<K>) => void,
): React.JSX.Element {
  if (kind === 'monster') {
    return (
      <MonsterTemplateForm
        value={draft as MonsterTemplate}
        onChange={(next) => setDraft(next as TemplateOf<K>)}
      />
    );
  }
  if (kind === 'ryude') {
    return (
      <RyudeTemplateForm
        value={draft as RyudeTemplate}
        onChange={(next) => setDraft(next as TemplateOf<K>)}
      />
    );
  }
  return (
    <NpcTemplateForm
      value={draft as NpcTemplate}
      onChange={(next) => setDraft(next as TemplateOf<K>)}
    />
  );
}

function canSave(draft: { name: string }): boolean {
  return draft.name.trim().length > 0;
}

function kindLabel(kind: TemplateKind): string {
  switch (kind) {
    case 'monster':
      return 'monster';
    case 'ryude':
      return 'Ryude';
    case 'npc':
      return 'NPC';
  }
}

function formatZodError(e: unknown): string {
  if (e && typeof e === 'object' && 'issues' in e) {
    const issues = (e as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
    return issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
  }
  return e instanceof Error ? e.message : String(e);
}
