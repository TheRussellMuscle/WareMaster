import * as React from 'react';
import { actionRoll } from '@/engine/dice/action-roll';
import {
  simpleNpcSkillContext,
  type GoverningAttribute,
} from '@/engine/derive/instance-rolls';
import type { ActionLogEntry } from '@/domain/action-log';
import type { NpcInstance } from '@/domain/npc-instance';
import type { SimpleNpc } from '@/domain/npc';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import { RollDialogShell } from '@/components/sheet/dialogs/RollDialogShell';
import { DialogActions } from '@/components/sheet/dialogs/DialogActions';
import { ResultDisplay } from '@/components/sheet/dialogs/ResultDisplay';

interface Props {
  open: boolean;
  onClose: () => void;
  template: SimpleNpc;
  instance: NpcInstance;
  catalog: ReferenceCatalog | null;
  initialSkillId?: string;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
  ) => Promise<void>;
}

const ATTRIBUTES: GoverningAttribute[] = ['AGI', 'SEN', 'WIL', 'CON', 'CHA', 'LUC'];

export function InstanceSkillDialog({
  open,
  onClose,
  template,
  instance,
  catalog,
  initialSkillId,
  onResolve,
}: Props): React.JSX.Element {
  const skillOptions = template.notable_skills;
  const [skillId, setSkillId] = React.useState(
    initialSkillId ?? skillOptions[0]?.skill_id ?? '',
  );
  const [difficulty, setDifficulty] = React.useState(8);
  const [overrideAbility, setOverrideAbility] = React.useState<number>(0);
  const [result, setResult] = React.useState<ReturnType<typeof actionRoll> | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) {
      setSkillId(initialSkillId ?? skillOptions[0]?.skill_id ?? '');
      setDifficulty(8);
      setOverrideAbility(0);
      setResult(null);
    } else if (initialSkillId) {
      setSkillId(initialSkillId);
    }
  }, [open, initialSkillId, skillOptions]);

  const ctx = simpleNpcSkillContext(template, skillId, catalog);
  const baseValue = ctx.baseAttributeValue ?? overrideAbility;

  const onRoll = () => {
    setResult(
      actionRoll({
        baseAttribute: baseValue,
        skillLevel: ctx.level,
        difficulty,
      }),
    );
  };

  const onAdd = async () => {
    if (!result) return;
    await onResolve({
      kind: 'skill',
      label: `${ctx.label} vs DC ${difficulty}`,
      dice: result.diceRolled,
      modifier: baseValue + ctx.level,
      total: result.total,
      difficulty,
      outcome: result.outcome,
      is_critical: false,
      notes:
        result.outcome === 'perfect-success'
          ? 'Perfect Success.'
          : result.outcome === 'total-failure'
            ? 'Total Failure.'
            : '',
    });
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Skill Roll"
      ruleNote={
        <>
          1D10 + Base Ability + Skill Level vs DC (Rule §07). Simple NPCs lack
          a full ability spread — for non-CHA skills the WM enters the base
          value at roll time.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Skill
          </span>
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
          >
            {skillOptions.length === 0 && (
              <option value="">— no notable skills —</option>
            )}
            {skillOptions.map((s) => (
              <option key={s.skill_id} value={s.skill_id}>
                {s.skill_id} (Lv {s.level})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            DC
          </span>
          <input
            type="number"
            min={1}
            value={difficulty}
            onChange={(e) =>
              setDifficulty(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
      </div>
      <div className="text-xs text-[var(--color-ink-soft)]">
        Skill level {ctx.level}{' '}
        {ctx.governingAttribute && `· ${ctx.governingAttribute}`}{' '}
        {ctx.baseAttributeValue !== null && `· base ${ctx.baseAttributeValue}`}
      </div>
      {ctx.baseAttributeValue === null && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Base{' '}
            <select
              value={ctx.governingAttribute ?? 'AGI'}
              onChange={() => {}}
              disabled
              className="h-7 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1 font-mono text-xs uppercase opacity-60"
            >
              {ATTRIBUTES.map((a) => (
                <option key={a} value={a ?? 'AGI'}>
                  {a}
                </option>
              ))}
            </select>
          </span>
          <input
            type="number"
            value={overrideAbility}
            onChange={(e) =>
              setOverrideAbility(parseInt(e.target.value, 10) || 0)
            }
            className="h-8 w-20 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
      )}
      {instance.id /* keep prop referenced */}
      {result && (
        <ResultDisplay
          dice={result.diceRolled}
          total={result.total}
          outcome={result.outcome}
          difficulty={difficulty}
        />
      )}
      <DialogActions
        hasResult={result != null}
        onRoll={onRoll}
        onAdd={() => void onAdd()}
        onDiscard={() => setResult(null)}
        disabledReason={skillId ? undefined : 'No skill selected'}
      />
    </RollDialogShell>
  );
}
