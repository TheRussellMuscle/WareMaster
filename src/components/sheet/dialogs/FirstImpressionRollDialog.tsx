import * as React from 'react';
import { actionRoll } from '@/engine/dice/action-roll';
import type { Character } from '@/domain/character';
import type { ActionLogEntry } from '@/domain/action-log';
import { baseValue } from '@/domain/attributes';
import { RollDialogShell } from './RollDialogShell';
import { RollControls } from './RollControls';
import { DialogActions } from './DialogActions';
import { ResultDisplay } from './ResultDisplay';

interface FirstImpressionRollDialogProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  firstImpressionValue: number;
  availableLuc: number;
  onResolve: (
    entry: Omit<ActionLogEntry, 'id' | 'timestamp_real' | 'character_id' | 'character_name'>,
    lucSpent: number,
  ) => Promise<void>;
}

type OrderContext = 'neutral' | 'same-order' | 'different-order';

const ORDER_LABELS: Record<OrderContext, string> = {
  neutral: 'Neutral',
  'same-order': 'Same Religious Order (+1)',
  'different-order': 'Different Order (−1)',
};

const ORDER_MODIFIER: Record<OrderContext, number> = {
  neutral: 0,
  'same-order': 1,
  'different-order': -1,
};

export function FirstImpressionRollDialog({
  open,
  onClose,
  character,
  firstImpressionValue,
  availableLuc,
  onResolve,
}: FirstImpressionRollDialogProps): React.JSX.Element {
  const [difficulty, setDifficulty] = React.useState(8);
  const [orderContext, setOrderContext] = React.useState<OrderContext>('neutral');
  const [lucDice, setLucDice] = React.useState(0);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualValues, setManualValues] = React.useState<number[]>([1]);
  const [result, setResult] = React.useState<ReturnType<typeof actionRoll> | null>(null);

  const isSpiritualst = character.class_id === 'spiritualist';
  const contextBonus = isSpiritualst ? ORDER_MODIFIER[orderContext] : 0;
  const effectiveModifier = firstImpressionValue + contextBonus;
  const diceCount = 1 + lucDice;

  React.useEffect(() => {
    if (!open) {
      setDifficulty(8);
      setOrderContext('neutral');
      setLucDice(0);
      setManualMode(false);
      setManualValues([1]);
      setResult(null);
    }
  }, [open]);

  const onRoll = () => {
    const r = actionRoll({
      baseAttribute: effectiveModifier,
      skillLevel: 0,
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
    if (isSpiritualst && orderContext !== 'neutral')
      notes.push(`Allies in Faith: ${contextBonus > 0 ? '+1' : '−1'} (${ORDER_LABELS[orderContext]}).`);
    await onResolve(
      {
        kind: 'ability',
        label: `First Impression Roll vs DC ${difficulty}`,
        dice: result.diceRolled,
        modifier: effectiveModifier,
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

  const baseCHA = baseValue(character.abilities.CHA);
  const appearanceBonus = firstImpressionValue - baseCHA;

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="First Impression Roll"
      ruleNote={
        <>
          1D10 + First Impression Value (Base CHA). Used when making a social
          first contact. (Rule §07.)
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
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

        {isSpiritualst && (
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Context (Allies in Faith)
            </span>
            <select
              value={orderContext}
              onChange={(e) => setOrderContext(e.target.value as OrderContext)}
              className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-xs"
            >
              {(Object.keys(ORDER_LABELS) as OrderContext[]).map((k) => (
                <option key={k} value={k}>
                  {ORDER_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="text-xs text-[var(--color-ink-soft)]">
        CHA {character.abilities.CHA} → Base {baseCHA}
        {appearanceBonus !== 0 && ` + Appearance ${appearanceBonus > 0 ? '+' : ''}${appearanceBonus}`}
        {isSpiritualst && contextBonus !== 0 && ` + Order ${contextBonus > 0 ? '+' : ''}${contextBonus}`}
        {' '}= modifier <strong>{effectiveModifier}</strong>
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
