import * as React from 'react';
import { rollInDn } from '@/engine/combat/in-dn';
import { RollResultBadge } from '@/components/dice/RollResultBadge';
import type { ActionLogEntry, CurrentSegment } from '@/domain/action-log';
import { RollDialogShell } from '@/components/sheet/dialogs/RollDialogShell';
import { DialogActions } from '@/components/sheet/dialogs/DialogActions';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Display name (used for action log + dialog header). */
  actorName: string;
  /** Pre-computed Base IN — for monsters: base_sen; for Ryude: opSEN + SPE + DriveMod. */
  baseIN: number;
  /** Pre-computed Base DN — for monsters: base_agi; for Ryude: opAGI + SPE + DriveMod. */
  baseDN: number;
  /** Optional rule citation suffix shown in the rule note (e.g. "vs Ryude per §14:124"). */
  ruleSuffix?: React.ReactNode;
  onResolve: (
    entry: Omit<
      ActionLogEntry,
      'id' | 'timestamp_real' | 'character_id' | 'character_name'
    >,
    segment: CurrentSegment,
  ) => Promise<void>;
}

/** Set IN/DN for a monster / Ryude / NPC instance. Mirrors the PC SetInDnDialog
 *  but without LUC dice (instances don't have a LUC pool). */
export function InstanceSetInDnDialog({
  open,
  onClose,
  actorName,
  baseIN,
  baseDN,
  ruleSuffix,
  onResolve,
}: Props): React.JSX.Element {
  const [result, setResult] = React.useState<ReturnType<typeof rollInDn> | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) setResult(null);
  }, [open]);

  const onRoll = () => {
    setResult(rollInDn({ baseIN, baseDN }));
  };

  const onAdd = async () => {
    if (!result) return;
    const notes: string[] = [];
    if (result.absorptionModifier === 2)
      notes.push('Total Absorption ×2 this Segment (Perfect Success).');
    if (result.absorptionModifier === 0.5)
      notes.push(
        'Total Absorption halved (rounded down) this Segment (Total Failure).',
      );
    await onResolve(
      {
        kind: 'in-dn',
        label: `${actorName} · IN/DN — Base IN ${baseIN}, Base DN ${baseDN}`,
        dice: result.roll.diceRolled,
        modifier: baseIN,
        total: result.inValue,
        difficulty: null,
        outcome: result.roll.outcome,
        is_critical: false,
        notes: notes.join(' '),
      },
      {
        in: result.inValue,
        dn: result.dnValue,
        absorption_modifier: result.absorptionModifier,
        in_halved_next_segment: false,
        set_at_real: new Date().toISOString(),
      },
    );
    onClose();
  };

  return (
    <RollDialogShell
      open={open}
      onClose={onClose}
      title="Set IN/DN"
      ruleNote={
        <>
          1D10 + Base IN, same dice + Base DN. Perfect Success doubles Total
          Absorption this Segment; Total Failure halves it (Rule §08).
          {ruleSuffix && <> {ruleSuffix}</>}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Base IN" value={String(baseIN)} />
        <Stat label="Base DN" value={String(baseDN)} />
      </div>
      {result && (
        <div className="flex flex-col gap-1 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 p-3 text-sm">
          <RollResultBadge
            diceRolled={result.roll.diceRolled}
            total={result.inValue}
            outcome={result.roll.outcome}
          />
          <div className="text-xs text-[var(--color-ink-soft)]">
            IN = {result.inValue} · DN = {result.dnValue} · Absorption{' '}
            {result.absorptionModifier === 2
              ? '×2'
              : result.absorptionModifier === 0.5
                ? '÷2'
                : '×1'}
          </div>
        </div>
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

function Stat({
  label,
  value,
}: {
  label: React.ReactNode;
  value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="font-mono text-[var(--color-ink)]">{value}</div>
    </div>
  );
}
