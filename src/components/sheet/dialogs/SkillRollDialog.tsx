import * as React from 'react';
import {
  applyLucRestore,
  applyLucSpend,
  applyPpGain,
  skillCheck,
} from '@/engine/skill-check';
import { ABILITY_CODES, type AbilityCode } from '@/domain/attributes';
import type { Character } from '@/domain/character';
import type { ActionLogEntry } from '@/domain/action-log';
import type { SkillCategory } from '@/domain/skill';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import { RollDialogShell } from './RollDialogShell';
import { RollControls } from './RollControls';
import { DialogActions } from './DialogActions';
import { ResultDisplay } from './ResultDisplay';

const CATEGORY_ORDER: Array<{ id: SkillCategory; label: string }> = [
  { id: 'combat', label: 'Combat' },
  { id: 'adventure-physical', label: 'Adventure — Physical' },
  { id: 'adventure-mental', label: 'Adventure — Mental' },
  { id: 'specialized', label: 'Specialized' },
];

interface SkillRollDialogProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  catalog: ReferenceCatalog | null;
  /** Pre-select a skill when opening from a per-skill Roll button. */
  initialSkillId?: string;
  availableLuc: number;
  /**
   * Caller applies PP gain + LUC spend/restore and persists. The dialog
   * provides the structured result (we use `applyLucSpend` / `applyLucRestore`
   * downstream to keep the math + cap consistent).
   */
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    applied: { skillId: string; ppGain: number; lucRestored: number },
    lucSpent: number,
  ) => Promise<void>;
}

export function SkillRollDialog({
  open,
  onClose,
  character,
  catalog,
  initialSkillId,
  availableLuc,
  onResolve,
}: SkillRollDialogProps): React.JSX.Element {
  const allSkills = catalog?.skills.skills ?? [];
  const trainedEntries = character.skills;
  // Default to the first trained skill if any, otherwise the first catalog
  // skill (so the dropdown is never empty when the character is fresh).
  const defaultSkillId =
    initialSkillId ??
    trainedEntries[0]?.skill_id ??
    allSkills[0]?.id ??
    '';
  const [skillId, setSkillId] = React.useState(defaultSkillId);
  const [difficulty, setDifficulty] = React.useState(8);
  const [abilityOverride, setAbilityOverride] = React.useState<AbilityCode>('WIL');
  const [lucDice, setLucDice] = React.useState(0);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualValues, setManualValues] = React.useState<number[]>([1]);
  const [result, setResult] = React.useState<ReturnType<typeof skillCheck> | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSkillId(defaultSkillId);
      setDifficulty(8);
      setAbilityOverride('WIL');
      setLucDice(0);
      setManualMode(false);
      setManualValues([1]);
      setResult(null);
    } else if (initialSkillId) {
      setSkillId(initialSkillId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSkillId]);

  const skill = allSkills.find((s) => s.id === skillId);
  const skillEntry = trainedEntries.find((s) => s.skill_id === skillId);
  const isUntrained = !skillEntry;
  const needsOverride = skill?.attribute == null;
  const diceCount = 1 + lucDice;

  // Group all catalog skills by category for the dropdown's optgroups.
  const grouped = React.useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      ...cat,
      skills: allSkills
        .filter((s) => s.category === cat.id)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [allSkills]);

  const onRoll = () => {
    if (!skill) return;
    const r = skillCheck({
      skill,
      abilities: character.abilities,
      skillEntry,
      abilityOverride: needsOverride ? abilityOverride : undefined,
      difficulty,
      lucDice,
      manual: manualMode ? manualValues.slice(0, diceCount) : undefined,
    });
    setResult(r);
  };

  const onAdd = async () => {
    if (!result || !skill) return;
    const notes: string[] = [];
    if (result.ppGain > 0) notes.push(`+${result.ppGain} PP to ${skill.name}.`);
    if (result.lucRestored > 0)
      notes.push(
        `+${result.lucRestored} Available LUC (Perfect Success on non-combat skill).`,
      );
    if (result.untrained)
      notes.push('Skill was untrained — added at Level 0; PP halved.');
    if (lucDice > 0) notes.push(`Spent ${lucDice} LUC.`);

    await onResolve(
      {
        kind: 'skill',
        label: `${skill.name} vs DC ${difficulty}`,
        dice: result.roll.diceRolled,
        modifier: result.roll.baseAttribute + result.roll.skillLevel,
        total: result.roll.total,
        difficulty,
        outcome: result.roll.outcome,
        is_critical: false,
        notes: notes.join(' '),
      },
      {
        skillId: skill.id,
        ppGain: result.ppGain,
        lucRestored: result.lucRestored,
      },
      lucDice,
    );
    onClose();
  };

  if (!catalog) return <></>;

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Skill Check"
      ruleNote={
        <>
          1D10 + Base Value + Skill Level vs Difficulty. Skill Level ≥ Difficulty
          allows one re-roll of any 1. Perfect Success on a non-combat skill
          restores +1 LUC. <strong>Untrained</strong> skills roll at Level 0;
          on Perfect Success or Total Failure they're added at Lv 0 with{' '}
          <strong>half PP</strong>. (Rule §07.)
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
            {grouped.map((cat) => (
              <optgroup key={cat.id} label={cat.label}>
                {cat.skills.map((s) => {
                  const entry = trainedEntries.find(
                    (e) => e.skill_id === s.id,
                  );
                  const lvl = entry?.level ?? 0;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}{' '}
                      {entry ? `(Lv ${lvl})` : '(untrained)'}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Difficulty
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
        {needsOverride && (
          <label className="col-span-2 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Governing ability (specialized skill)
            </span>
            <select
              value={abilityOverride}
              onChange={(e) =>
                setAbilityOverride(e.target.value as AbilityCode)
              }
              className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
            >
              {ABILITY_CODES.filter((c) => c !== 'LUC').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {skill && (
        <div className="text-xs text-[var(--color-ink-soft)]">
          {skill.name} ({skill.category}) governed by{' '}
          {skill.attribute ?? `caller's choice (${abilityOverride})`}.{' '}
          {skill.category === 'combat'
            ? 'Combat skill — no LUC restored on Perfect Success.'
            : 'Non-combat skill — Perfect Success restores +1 LUC.'}
          {isUntrained && (
            <>
              {' '}
              <strong className="text-[var(--color-rust)]">
                Untrained
              </strong>
              : rolling at Lv 0; PP halved on Perfect / Total Failure.
            </>
          )}
        </div>
      )}
      <RollControls
        lucDice={lucDice}
        onLucDiceChange={setLucDice}
        availableLuc={availableLuc}
        manualMode={manualMode}
        onManualModeChange={setManualMode}
        manualValues={manualValues}
        onManualValuesChange={setManualValues}
        diceCount={diceCount}
        faces={10}
      />
      {result && (
        <ResultDisplay
          dice={result.roll.diceRolled}
          total={result.roll.total}
          outcome={result.roll.outcome}
          difficulty={difficulty}
          extra={
            result.ppGain > 0 || result.lucRestored > 0
              ? `+${result.ppGain} PP${result.lucRestored > 0 ? `, +${result.lucRestored} LUC` : ''}`
              : undefined
          }
        />
      )}
      <DialogActions
        hasResult={result != null}
        onRoll={onRoll}
        onAdd={() => void onAdd()}
        onDiscard={() => setResult(null)}
      />
    </RollDialogShell>
  );
}

// Re-export so the sheet has a single import surface for skill-related helpers.
export { applyPpGain, applyLucRestore, applyLucSpend };
