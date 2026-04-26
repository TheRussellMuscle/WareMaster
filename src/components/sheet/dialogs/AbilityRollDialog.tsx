import * as React from 'react';
import { actionRoll } from '@/engine/dice/action-roll';
import { ABILITY_CODES, type AbilityCode } from '@/domain/attributes';
import type { Character } from '@/domain/character';
import type { ActionLogEntry } from '@/domain/action-log';
import { RollDialogShell } from './RollDialogShell';
import { RollControls } from './RollControls';
import { DialogActions } from './DialogActions';
import { ResultDisplay } from './ResultDisplay';

interface AbilityRollDialogProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  initialAbility?: AbilityCode;
  availableLuc: number;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    lucSpent: number,
  ) => Promise<void>;
}

export function AbilityRollDialog({
  open,
  onClose,
  character,
  initialAbility,
  availableLuc,
  onResolve,
}: AbilityRollDialogProps): React.JSX.Element {
  const [ability, setAbility] = React.useState<AbilityCode>(
    initialAbility ?? 'SEN',
  );
  const [difficulty, setDifficulty] = React.useState(8);
  const [skillBonus, setSkillBonus] = React.useState(0);
  const [lucDice, setLucDice] = React.useState(0);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualValues, setManualValues] = React.useState<number[]>([1]);
  const [result, setResult] = React.useState<ReturnType<typeof actionRoll> | null>(null);

  React.useEffect(() => {
    if (!open) {
      setAbility(initialAbility ?? 'SEN');
      setDifficulty(8);
      setSkillBonus(0);
      setLucDice(0);
      setManualMode(false);
      setManualValues([1]);
      setResult(null);
    } else if (initialAbility) {
      setAbility(initialAbility);
    }
  }, [open, initialAbility]);

  const diceCount = 1 + lucDice;
  const score = character.abilities[ability];
  const base = ability === 'LUC' ? 0 : Math.floor(score / 3);

  const onRoll = () => {
    const r = actionRoll({
      baseAttribute: base,
      skillLevel: skillBonus,
      difficulty,
      lucDice,
      manual: manualMode ? manualValues.slice(0, diceCount) : undefined,
    });
    setResult(r);
  };

  const onAdd = async () => {
    if (!result) return;
    const notes: string[] = [];
    if (result.outcome === 'perfect-success') notes.push('Perfect Success.');
    if (result.outcome === 'total-failure') notes.push('Total Failure.');
    if (lucDice > 0) notes.push(`Spent ${lucDice} LUC.`);
    await onResolve(
      {
        kind: 'ability',
        label: `${ability} Roll vs DC ${difficulty}`,
        dice: result.diceRolled,
        modifier: base + skillBonus,
        total: result.total,
        difficulty,
        outcome: result.outcome,
        is_critical: false,
        notes: notes.join(' '),
      },
      lucDice,
    );
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Ability Roll"
      ruleNote={
        <>
          1D10 + Base Value (floor of Score / 3) + relevant Skill Level (if
          applicable). All 1s ⇒ Total Failure (overrides success); all 10s and
          total ≥ Difficulty ⇒ Perfect Success. (Rule §07.)
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2 text-sm">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Ability
          </span>
          <select
            value={ability}
            onChange={(e) => setAbility(e.target.value as AbilityCode)}
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          >
            {ABILITY_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Skill bonus
          </span>
          <input
            type="number"
            min={0}
            value={skillBonus}
            onChange={(e) =>
              setSkillBonus(Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
          />
        </label>
      </div>
      <div className="text-xs text-[var(--color-ink-soft)]">
        {ability} score {score} → Base {base}. Final modifier added once:{' '}
        {base + skillBonus}.
      </div>
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
      />
    </RollDialogShell>
  );
}
