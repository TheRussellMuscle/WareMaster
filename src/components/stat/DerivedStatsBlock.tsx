import { Dices } from 'lucide-react';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import { useOptionalSheetActions } from '@/components/sheet/SheetActionsContext';

interface DerivedStatsBlockProps {
  values: DerivedCombatValues;
}

/**
 * Renders the derived combat numbers shown on the official sheet (p. 79):
 * Base IN / BN / DN, total Armor Modifier, Heavy recovery formulas, and
 * the First Impression Value.
 */
export function DerivedStatsBlock({
  values: v,
}: DerivedStatsBlockProps): React.JSX.Element {
  const actions = useOptionalSheetActions();
  const firstImpressionFormula =
    v.firstImpressionValue !== v.baseCHA
      ? `Base CHA ${v.baseCHA} + Appearance ${signed(v.firstImpressionValue - v.baseCHA)}`
      : `Base CHA ${v.baseCHA}`;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm md:grid-cols-3">
      <Tile
        label="Base IN"
        formula={`SEN ${v.baseSEN} + arm ${signed(v.totalArmorModifier)}`}
        value={v.baseIN}
      />
      <Tile
        label="Base BN"
        formula={`AGI ${v.baseAGI} + arm ${signed(v.totalArmorModifier)}`}
        value={v.baseBN}
      />
      <Tile
        label="Base DN"
        formula={`AGI ${v.baseAGI} + arm ${signed(v.totalArmorModifier)} + Defense ${v.defenseSkillLevel}`}
        value={v.baseDN}
      />

      <Tile
        label="Heavy Mental recovery"
        formula="(16 − WIL)"
        value={
          <>
            {v.heavyMentalRecoveryHoursPerPoint}{' '}
            <UnitTooltip unit="hour" />/pt
          </>
        }
      />
      <Tile
        label="Heavy Physical recovery"
        formula="(16 − CON)"
        value={
          <>
            {v.heavyPhysicalRecoveryDaysPerPoint}{' '}
            <UnitTooltip unit="day" />/pt
          </>
        }
      />

      {actions ? (
        <button
          type="button"
          onClick={() => actions.openFirstImpression()}
          title="Roll First Impression"
          className="group relative flex flex-col rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-gilt)]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gilt)]/40"
        >
          <Dices
            className="absolute right-1 top-1 h-3 w-3 text-[var(--color-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            First Impression
          </div>
          <div className="font-mono text-lg leading-tight text-[var(--color-ink)]">
            {v.firstImpressionValue}
          </div>
          <div className="text-[10px] text-[var(--color-ink-faint)]">{firstImpressionFormula}</div>
        </button>
      ) : (
        <Tile
          label="First Impression"
          formula={firstImpressionFormula}
          value={v.firstImpressionValue}
        />
      )}
    </div>
  );
}

function Tile({
  label,
  formula,
  value,
}: {
  label: React.ReactNode;
  formula: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="font-mono text-lg leading-tight text-[var(--color-ink)]">
        {value}
      </div>
      <div className="text-[10px] text-[var(--color-ink-faint)]">{formula}</div>
    </div>
  );
}

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

/** Surface the IN/DN/BN acronyms once at the top of a block. */
export function CombatLegend(): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
      <AcronymTooltip code="IN" />
      <AcronymTooltip code="BN" />
      <AcronymTooltip code="DN" />
      <AcronymTooltip code="LUC" />
    </div>
  );
}
