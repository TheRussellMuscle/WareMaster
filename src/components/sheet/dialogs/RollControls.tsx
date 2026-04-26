import * as React from 'react';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { DiceInputs } from '@/components/dice/DiceInputs';

interface RollControlsProps {
  lucDice: number;
  onLucDiceChange: (n: number) => void;
  /** Maximum LUC dice that can be added — the character's current Available LUC. */
  availableLuc: number;
  manualMode: boolean;
  onManualModeChange: (b: boolean) => void;
  manualValues: number[];
  onManualValuesChange: (v: number[]) => void;
  /** Total dice expected = baseline 1 + lucDice (or fixed for LUC rolls). */
  diceCount: number;
  faces: 10 | 5;
  /**
   * When provided, replaces the default "LUC dice" label. Useful for rolls
   * that cap LUC differently (e.g. attack rolls split LUC across BN/damage).
   */
  lucLabel?: React.ReactNode;
}

/**
 * Shared bottom-of-dialog controls: LUC dice spinner (clamped to Available
 * LUC) + manual-dice toggle + N number inputs when in manual mode.
 */
export function RollControls(props: RollControlsProps): React.JSX.Element {
  const cap = Math.max(0, Math.floor(props.availableLuc));
  const onLucChange = (raw: number) => {
    const clamped = Math.max(0, Math.min(cap, Math.floor(raw)));
    props.onLucDiceChange(clamped);
  };
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3">
      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--color-ink-soft)]">
          <span className="mr-2 font-display uppercase tracking-wider text-[var(--color-ink-faint)]">
            {props.lucLabel ?? (
              <>
                <AcronymTooltip code="LUC" /> dice
              </>
            )}
          </span>
          <input
            type="number"
            min={0}
            max={cap}
            value={props.lucDice}
            disabled={cap === 0}
            onChange={(e) => onLucChange(parseInt(e.target.value, 10) || 0)}
            className="h-7 w-14 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 text-center font-mono text-sm disabled:opacity-50"
          />
          <span className="ml-1.5 text-[10px] text-[var(--color-ink-faint)]">
            / {cap} avail.
          </span>
        </label>
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            checked={props.manualMode}
            onChange={(e) => props.onManualModeChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded-sm border-[var(--color-parchment-400)]"
          />
          Manual dice
        </label>
      </div>
      {props.manualMode && (
        <DiceInputs
          count={props.diceCount}
          faces={props.faces}
          values={props.manualValues}
          onChange={props.onManualValuesChange}
        />
      )}
    </div>
  );
}
