import * as React from 'react';
import {
  saveRoll,
  suggestedSave,
  type SaveKind,
} from '@/engine/combat/save-roll';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import type { Character } from '@/domain/character';
import type { ActionLogEntry } from '@/domain/action-log';
import { RollDialogShell } from './RollDialogShell';
import { RollControls } from './RollControls';
import { DialogActions } from './DialogActions';
import { ResultDisplay } from './ResultDisplay';

interface SaveRollDialogProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  derived: DerivedCombatValues;
  /**
   * Pre-select a save kind. When opening from the Heavy-row "Save" button,
   * this will be `heavy-state-action`. When opening from the LUC ability cell,
   * `luc-roll`. Otherwise the dialog auto-suggests based on damage state.
   */
  initialKind?: SaveKind;
  availableLuc: number;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    lucSpent: number,
  ) => Promise<void>;
}

const SAVE_KIND_LABELS: Record<SaveKind, string> = {
  'heavy-crossing-wil': 'Heavy crossing — WIL Roll',
  'heavy-crossing-con': 'Heavy crossing — CON Roll',
  'heavy-state-action': 'Heavy state — WIL Roll to act',
  'incap-revive': 'Incap revive — AGI Roll (Medicine)',
  'luc-roll': 'LUC Roll',
  custom: 'Custom save',
};

export function SaveRollDialog({
  open,
  onClose,
  character,
  derived,
  initialKind,
  availableLuc,
  onResolve,
}: SaveRollDialogProps): React.JSX.Element {
  const suggested = React.useMemo(
    () =>
      suggestedSave({
        physicalDamage: character.state.physical_damage,
        mentalDamage: character.state.mental_damage,
        physicalDurability: derived.physicalDurability,
        mentalDurability: derived.mentalDurability,
      }),
    [character.state, derived],
  );

  const defaultKind: SaveKind =
    initialKind ?? suggested?.kind ?? 'heavy-state-action';
  const defaultDifficulty =
    initialKind === 'heavy-state-action' && suggested
      ? suggested.difficulty
      : (suggested?.difficulty ?? 5);

  const [kind, setKind] = React.useState<SaveKind>(defaultKind);
  const [difficulty, setDifficulty] = React.useState(defaultDifficulty);
  const [skillBonus, setSkillBonus] = React.useState(0);
  const [lucDice, setLucDice] = React.useState(defaultKind === 'luc-roll' ? 1 : 0);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualValues, setManualValues] = React.useState<number[]>([1]);
  const [result, setResult] = React.useState<ReturnType<typeof saveRoll> | null>(null);

  React.useEffect(() => {
    if (!open) {
      setKind(defaultKind);
      setDifficulty(defaultDifficulty);
      setSkillBonus(0);
      setLucDice(defaultKind === 'luc-roll' ? 1 : 0);
      setManualMode(false);
      setManualValues([1]);
      setResult(null);
    } else if (initialKind) {
      setKind(initialKind);
      if (initialKind === 'luc-roll' && lucDice === 0) {
        setLucDice(Math.min(1, availableLuc));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialKind]);

  const isLuc = kind === 'luc-roll';
  const diceCount = isLuc ? Math.max(1, lucDice) : 1 + lucDice;
  // For LUC rolls, every die is a LUC die so the "spent" count = lucDice.
  // For other rolls, spent = lucDice (extra dice beyond the baseline 1D10).
  const lucSpent = isLuc ? Math.max(1, lucDice) : lucDice;

  const onRoll = () => {
    const r = saveRoll({
      kind,
      abilities: character.abilities,
      ability: kind === 'custom' ? 'WIL' : undefined,
      difficulty,
      skillLevel: kind === 'incap-revive' ? skillBonus : undefined,
      lucDice: isLuc ? Math.max(1, lucDice) : lucDice,
      manual: manualMode ? manualValues.slice(0, diceCount) : undefined,
    });
    setResult(r);
  };

  const onAdd = async () => {
    if (!result) return;
    const notes: string[] = [];
    if (kind === 'heavy-crossing-wil' && !result.passed)
      notes.push(
        'Failed WIL save on Heavy crossing — character Incapacitated (Rule §09).',
      );
    if (kind === 'heavy-crossing-con' && !result.passed)
      notes.push(
        'Failed CON save on Heavy Physical crossing — Incapacitated even if WIL passed.',
      );
    if (kind === 'heavy-state-action' && !result.passed)
      notes.push(
        'Failed WIL Roll while in Heavy — action lost this turn (Rule §09).',
      );
    if (kind === 'incap-revive' && !result.passed)
      notes.push('Revive attempt failed.');
    if (lucSpent > 0) notes.push(`Spent ${lucSpent} LUC.`);

    await onResolve(
      {
        kind: 'save',
        label: `${SAVE_KIND_LABELS[kind]} vs DC ${difficulty}`,
        dice: result.roll.diceRolled,
        modifier: result.roll.baseAttribute + result.roll.skillLevel,
        total: result.roll.total,
        difficulty,
        outcome: result.roll.outcome,
        is_critical: false,
        notes: notes.join(' '),
      },
      lucSpent,
    );
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Save Throw"
      ruleNote={
        <>
          Defensive Action Rolls triggered by damage stages and Heavy state.{' '}
          <strong>Heavy crossing</strong>: WIL Roll (and CON Roll if Physical) at
          DC = damage taken; failure ⇒ Incapacitated.{' '}
          <strong>Heavy state</strong>: WIL Roll before any action at DC =
          accumulated − Durability. (Rule §09.)
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="col-span-2 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            Kind
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as SaveKind)}
            className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
          >
            {(
              [
                'heavy-crossing-wil',
                'heavy-crossing-con',
                'heavy-state-action',
                'incap-revive',
                'luc-roll',
                'custom',
              ] as SaveKind[]
            ).map((k) => (
              <option key={k} value={k}>
                {SAVE_KIND_LABELS[k]}
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
        {kind === 'incap-revive' && (
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Medicine Level
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
        )}
      </div>
      {suggested && (
        <div className="rounded-sm border border-[var(--color-gilt)]/40 bg-[var(--color-gilt)]/5 p-2 text-xs text-[var(--color-ink-soft)]">
          Suggested: {SAVE_KIND_LABELS[suggested.kind]} at DC{' '}
          {suggested.difficulty} (overflow over {suggested.ability}-Durability).
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
        lucLabel={isLuc ? 'LUC dice (rolled)' : undefined}
      />
      {result && (
        <ResultDisplay
          dice={result.roll.diceRolled}
          total={result.roll.total}
          outcome={result.roll.outcome}
          difficulty={difficulty}
          extra={result.passed ? 'Passed.' : 'Failed.'}
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
