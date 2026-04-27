import * as React from 'react';
import { skillCheck } from '@/engine/skill-check';
import { ABILITY_CODES, type AbilityCode } from '@/domain/attributes';
import type { Character } from '@/domain/character';
import type { ActionLogEntry } from '@/domain/action-log';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type {
  Technique,
  Discipline,
  Gate,
} from '@/domain/technique';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { RollDialogShell } from './RollDialogShell';
import { RollControls } from './RollControls';
import { DialogActions } from './DialogActions';
import { ResultDisplay } from './ResultDisplay';

interface TechniqueCastDialogProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  catalog: ReferenceCatalog | null;
  technique: Technique | null;
  discipline: Discipline | null;
  gate: Gate | undefined;
  availableLuc: number;
  /** Added to numenism skill level when discipline is numetic-arts (Rule §14:226). */
  ryudeNumenismBonus?: number;
  /** Added to word-casting skill level when discipline is word-casting (Rule §14:227). */
  ryudeWordCastingBonus?: number;
  /**
   * Caller applies skill PP, LUC spend/restore, and Mental damage cost.
   */
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    applied: {
      skillId: string;
      ppGain: number;
      lucRestored: number;
      mentalDamageCost: number;
    },
    lucSpent: number,
  ) => Promise<void>;
}

/**
 * Per-technique Cast dialog. Wraps a Skill Check using the discipline's
 * skill (Word-Casting / Numenism / Invocation), plus an optional Mental
 * damage cost the WM enters for the character (Word-Casting and Numetic
 * Arts cost mental damage per Rule §11; Invocations do not).
 *
 * Phase 3.6 placeholder: the rule-driven MP cost / gate Difficulty tables
 * (rules §11–§13) are NOT auto-computed yet. The WM types Difficulty + cost.
 */
export function TechniqueCastDialog({
  open,
  onClose,
  character,
  catalog,
  technique,
  discipline,
  gate,
  availableLuc,
  ryudeNumenismBonus = 0,
  ryudeWordCastingBonus = 0,
  onResolve,
}: TechniqueCastDialogProps): React.JSX.Element {
  const skillId = disciplineToSkillId(discipline);
  const skill =
    catalog && skillId
      ? catalog.skills.skills.find((s) => s.id === skillId) ?? null
      : null;
  const skillEntry = character.skills.find((s) => s.skill_id === skillId);
  const ryudeBonus =
    discipline === 'numetic-arts'
      ? ryudeNumenismBonus
      : discipline === 'word-casting'
        ? ryudeWordCastingBonus
        : 0;

  const [difficulty, setDifficulty] = React.useState(8);
  const [abilityOverride, setAbilityOverride] = React.useState<AbilityCode>('WIL');
  const [mentalCost, setMentalCost] = React.useState<number>(
    discipline === 'invocation' ? 0 : Math.max(1, technique?.level ?? 1),
  );
  const [lucDice, setLucDice] = React.useState(0);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualValues, setManualValues] = React.useState<number[]>([1]);
  const [result, setResult] = React.useState<ReturnType<typeof skillCheck> | null>(null);

  React.useEffect(() => {
    if (!open) {
      setDifficulty(8);
      setAbilityOverride('WIL');
      setMentalCost(discipline === 'invocation' ? 0 : Math.max(1, technique?.level ?? 1));
      setLucDice(0);
      setManualMode(false);
      setManualValues([1]);
      setResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, technique?.id]);

  const diceCount = 1 + lucDice;

  const onRoll = () => {
    if (!skill) return;
    const r = skillCheck({
      skill,
      abilities: character.abilities,
      skillEntry,
      abilityOverride,
      difficulty,
      modifier: ryudeBonus || undefined,
      lucDice,
      manual: manualMode ? manualValues.slice(0, diceCount) : undefined,
    });
    setResult(r);
  };

  const onAdd = async () => {
    if (!result || !skill || !technique) return;
    const notes: string[] = [`Cast ${technique.name}.`];
    if (mentalCost > 0)
      notes.push(`Mental damage cost: +${mentalCost} (caster).`);
    if (ryudeBonus > 0)
      notes.push(`Ryude bonus +${ryudeBonus} to ${skill.name} level.`);
    if (result.ppGain > 0) notes.push(`+${result.ppGain} PP to ${skill.name}.`);
    if (result.lucRestored > 0)
      notes.push(`+${result.lucRestored} Available LUC.`);
    if (lucDice > 0) notes.push(`Spent ${lucDice} LUC.`);
    if (result.untrained)
      notes.push('Casting skill was untrained — added at Level 0; PP halved.');

    await onResolve(
      {
        kind: 'skill',
        label: `Cast ${technique.name} vs DC ${difficulty}`,
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
        mentalDamageCost: mentalCost,
      },
      lucDice,
    );
    onClose();
  };

  const noSkill = !skill;
  const noTech = !technique;

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title={technique ? `Cast: ${technique.name}` : 'Cast Technique'}
      ruleNote={
        <>
          Casting requires a roll on the discipline's specialized skill (
          <strong>Word-Casting</strong>, <strong>Numenism</strong>, or{' '}
          <strong>Invocation</strong>). Word-Casting and Numetic Arts cost
          Mental damage to the caster — type the cost below; it is added to
          your Mental track when you Add to log. (Rules §11–§13 — full
          casting engine arrives in a later phase.)
        </>
      }
    >
      {noTech ? (
        <p className="text-sm italic text-[var(--color-ink-soft)]">
          No technique selected.
        </p>
      ) : (
        <>
          <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3 text-sm">
            <div className="font-display text-base text-[var(--color-ink)]">
              {technique.name}
              <span className="ml-2 font-mono text-xs text-[var(--color-ink-faint)]">
                Lv {technique.level}
              </span>
            </div>
            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs md:grid-cols-4">
              <Field label="Cast">
                <UnitTooltip
                  unit="segment"
                  amount={technique.segments_required}
                />
              </Field>
              <Field label="Range">{technique.range}</Field>
              <Field label="Target">{technique.target}</Field>
              <Field label="Duration">{technique.duration}</Field>
              {technique.save && <Field label="Save">{technique.save}</Field>}
            </dl>
            <p className="mt-1.5 text-xs italic text-[var(--color-ink-soft)]">
              {technique.effect}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
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
                Ability
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
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Mental damage cost
              </span>
              <input
                type="number"
                min={0}
                value={mentalCost}
                onChange={(e) =>
                  setMentalCost(Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
              />
            </label>
          </div>

          {skill && (
            <div className="text-xs text-[var(--color-ink-soft)]">
              Casting via <strong>{skill.name}</strong> Lv{' '}
              {skillEntry?.level ?? 0}
              {ryudeBonus > 0 && (
                <> +{ryudeBonus} <span className="text-[var(--color-ink-faint)]">(Ryude)</span></>
              )}
              {gate && discipline === 'word-casting' && (
                <> · Gate: {gate}</>
              )}.
            </div>
          )}
          {noSkill && (
            <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 p-2 text-xs text-[var(--color-rust)]">
              No casting skill found in catalog for discipline {discipline}.
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
                mentalCost > 0
                  ? `+${mentalCost} Mental damage on cast`
                  : undefined
              }
            />
          )}
          <DialogActions
            hasResult={result != null}
            onRoll={onRoll}
            onAdd={() => void onAdd()}
            onDiscard={() => setResult(null)}
            disabledReason={noSkill ? 'Casting skill missing' : undefined}
          />
        </>
      )}
    </RollDialogShell>
  );
}

function disciplineToSkillId(d: Discipline | null): string | null {
  if (d === 'word-casting') return 'word-casting';
  if (d === 'numetic-arts') return 'numenism';
  if (d === 'invocation') return 'invocation';
  return null;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </dt>
      <dd className="font-mono text-[var(--color-ink)]">{children}</dd>
    </div>
  );
}
