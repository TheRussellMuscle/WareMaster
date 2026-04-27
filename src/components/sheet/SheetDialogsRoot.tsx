import * as React from 'react';
import { ulid } from 'ulid';
import {
  applyLucRestore,
  applyLucSpend,
  applyPpGain,
} from '@/engine/skill-check';
import { useActionLogStore } from '@/stores/action-log-store';
import type { Character } from '@/domain/character';
import type { ActionLogEntry } from '@/domain/action-log';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { DerivedCombatValues } from '@/engine/derive/combat-values';
import { SetInDnDialog } from './dialogs/SetInDnDialog';
import { AbilityRollDialog } from './dialogs/AbilityRollDialog';
import { AttackRollDialog } from './dialogs/AttackRollDialog';
import { SaveRollDialog } from './dialogs/SaveRollDialog';
import { SkillRollDialog } from './dialogs/SkillRollDialog';
import { TechniqueCastDialog } from './dialogs/TechniqueCastDialog';
import { FirstImpressionRollDialog } from './dialogs/FirstImpressionRollDialog';
import type { SheetDialogs } from './useSheetDialogs';

import type { CustomItem } from '@/domain/custom-item';

interface SheetDialogsRootProps {
  dialogs: SheetDialogs;
  character: Character;
  derived: DerivedCombatValues;
  catalog: ReferenceCatalog | null;
  customItems?: CustomItem[];
  /** Campaign dir — needed to append entries to the campaign-wide action log. */
  campaignDir: string;
  /**
   * Persists the next character state to disk and updates local state.
   * The dialogs root composes LUC spend/restore + PP gain + Mental cost
   * + segment update before calling this. Action log entries are written
   * separately via the action-log-store.
   */
  onChange: (next: Character) => Promise<void>;
}

/**
 * Single mount point for all sheet roll dialogs. Centralizes the post-roll
 * state updates: character state (LUC spend → restore, PP, Mental cost,
 * segment) and the campaign-wide action log entry. Child components only
 * need to call `openX()` from SheetActionsContext.
 */
export function SheetDialogsRoot({
  dialogs,
  character,
  derived,
  catalog,
  customItems,
  campaignDir,
  onChange,
}: SheetDialogsRootProps): React.JSX.Element {
  const availableLuc = character.state.available_luc;
  const appendLog = useActionLogStore((s) => s.append);

  const newEntry = (
    raw: Omit<ActionLogEntry, 'id' | 'timestamp_real' | 'character_id' | 'character_name'>,
  ): ActionLogEntry => ({
    id: ulid(),
    timestamp_real: new Date().toISOString(),
    character_id: character.id,
    character_name: character.name,
    ...raw,
  });

  const persist = async (
    raw: Omit<ActionLogEntry, 'id' | 'timestamp_real' | 'character_id' | 'character_name'>,
    overrides: {
      lucSpent?: number;
      lucRestored?: number;
      mentalDamageCost?: number;
      ppGain?: { skillId: string; amount: number };
      segment?: NonNullable<Character['state']['current_segment']> | 'clear';
      attackTotalFailure?: boolean;
    } = {},
  ) => {
    let nextChar: Character = character;

    // Order matters: spend LUC first (rule §07 multiplier was already
    // applied by the engine when computing PP/restore), then restore.
    if (overrides.lucSpent && overrides.lucSpent > 0) {
      nextChar = {
        ...nextChar,
        state: {
          ...nextChar.state,
          available_luc: applyLucSpend(nextChar, overrides.lucSpent),
        },
      };
    }
    if (overrides.lucRestored && overrides.lucRestored > 0) {
      nextChar = {
        ...nextChar,
        state: {
          ...nextChar.state,
          available_luc: applyLucRestore(nextChar, overrides.lucRestored),
        },
      };
    }
    if (overrides.ppGain && overrides.ppGain.amount > 0) {
      nextChar = {
        ...nextChar,
        skills: applyPpGain(nextChar, overrides.ppGain.skillId, overrides.ppGain.amount),
      };
    }
    if (overrides.mentalDamageCost && overrides.mentalDamageCost > 0) {
      nextChar = {
        ...nextChar,
        state: {
          ...nextChar.state,
          mental_damage:
            nextChar.state.mental_damage + overrides.mentalDamageCost,
        },
      };
    }
    if (overrides.segment !== undefined) {
      nextChar = {
        ...nextChar,
        state: {
          ...nextChar.state,
          current_segment:
            overrides.segment === 'clear' ? null : overrides.segment,
        },
      };
    }
    if (overrides.attackTotalFailure && nextChar.state.current_segment) {
      nextChar = {
        ...nextChar,
        state: {
          ...nextChar.state,
          current_segment: {
            ...nextChar.state.current_segment,
            in_halved_next_segment: true,
          },
        },
      };
    }

    // Persist character changes first; then append the campaign log entry.
    // Both are awaited so the right column can re-render with both updates.
    await onChange(nextChar);
    await appendLog(campaignDir, newEntry(raw));
  };

  const open = dialogs.open;

  return (
    <>
      <SetInDnDialog
        open={open?.kind === 'in-dn'}
        onClose={dialogs.close}
        derived={derived}
        currentInHalved={
          character.state.current_segment?.in_halved_next_segment ?? false
        }
        availableLuc={availableLuc}
        onResolve={async (entry, current, lucSpent) => {
          await persist(entry, {
            lucSpent,
            segment: current,
          });
        }}
      />
      <AbilityRollDialog
        open={open?.kind === 'ability'}
        onClose={dialogs.close}
        character={character}
        initialAbility={open?.kind === 'ability' ? open.initialAbility : undefined}
        initialDifficulty={open?.kind === 'ability' ? open.initialDifficulty : undefined}
        initialSkillBonus={open?.kind === 'ability' ? open.initialSkillBonus : undefined}
        availableLuc={availableLuc}
        onResolve={async (entry, lucSpent) => {
          await persist(entry, { lucSpent });
        }}
      />
      <AttackRollDialog
        open={open?.kind === 'attack'}
        onClose={dialogs.close}
        character={character}
        derived={derived}
        catalog={catalog}
        customItems={customItems}
        initialWeaponId={
          open?.kind === 'attack' ? open.initialWeaponId : undefined
        }
        availableLuc={availableLuc}
        onResolve={async (entry, lucSpent) => {
          await persist(entry, {
            lucSpent,
            attackTotalFailure: entry.outcome === 'total-failure',
          });
        }}
      />
      <SaveRollDialog
        open={open?.kind === 'save'}
        onClose={dialogs.close}
        character={character}
        derived={derived}
        initialKind={open?.kind === 'save' ? open.initialKind : undefined}
        initialDifficulty={open?.kind === 'save' ? open.initialDifficulty : undefined}
        availableLuc={availableLuc}
        onResolve={async (entry, lucSpent) => {
          await persist(entry, { lucSpent });
        }}
      />
      <SkillRollDialog
        open={open?.kind === 'skill'}
        onClose={dialogs.close}
        character={character}
        catalog={catalog}
        initialSkillId={
          open?.kind === 'skill' ? open.initialSkillId : undefined
        }
        availableLuc={availableLuc}
        onResolve={async (entry, applied, lucSpent) => {
          await persist(entry, {
            lucSpent,
            lucRestored: applied.lucRestored,
            ppGain: { skillId: applied.skillId, amount: applied.ppGain },
          });
        }}
      />
      <TechniqueCastDialog
        open={open?.kind === 'technique-cast'}
        onClose={dialogs.close}
        character={character}
        catalog={catalog}
        technique={open?.kind === 'technique-cast' ? open.technique : null}
        discipline={open?.kind === 'technique-cast' ? open.discipline : null}
        gate={open?.kind === 'technique-cast' ? open.gate : undefined}
        availableLuc={availableLuc}
        onResolve={async (entry, applied, lucSpent) => {
          await persist(entry, {
            lucSpent,
            lucRestored: applied.lucRestored,
            ppGain: { skillId: applied.skillId, amount: applied.ppGain },
            mentalDamageCost: applied.mentalDamageCost,
          });
        }}
      />
      <FirstImpressionRollDialog
        open={open?.kind === 'first-impression'}
        onClose={dialogs.close}
        character={character}
        firstImpressionValue={derived.firstImpressionValue}
        availableLuc={availableLuc}
        onResolve={async (entry, lucSpent) => {
          await persist(entry, { lucSpent });
        }}
      />
    </>
  );
}
