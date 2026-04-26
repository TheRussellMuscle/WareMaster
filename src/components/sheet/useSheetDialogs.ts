import { useState } from 'react';
import type { AbilityCode } from '@/domain/attributes';
import type { Discipline, Gate, Technique } from '@/domain/technique';
import type { SaveKind } from '@/engine/combat/save-roll';

export type SheetDialogState =
  | { kind: 'in-dn' }
  | { kind: 'ability'; initialAbility?: AbilityCode }
  | { kind: 'attack'; initialWeaponId?: string }
  | { kind: 'save'; initialKind?: SaveKind }
  | { kind: 'skill'; initialSkillId?: string }
  | {
      kind: 'technique-cast';
      technique: Technique;
      discipline: Discipline;
      gate: Gate | undefined;
    }
  | null;

export interface SheetDialogs {
  open: SheetDialogState;
  close: () => void;
  openInDn: () => void;
  openAbility: (initialAbility?: AbilityCode) => void;
  openAttack: (initialWeaponId?: string) => void;
  openSave: (initialKind?: SaveKind) => void;
  openSkill: (initialSkillId?: string) => void;
  openTechniqueCast: (
    technique: Technique,
    discipline: Discipline,
    gate: Gate | undefined,
  ) => void;
}

/**
 * Single source of truth for which sheet roll dialog (if any) is open and
 * with what pre-selection. The character sheet instantiates this once and
 * exposes the open* callbacks via SheetActionsContext so child components
 * (WeaponsTable, TechniqueList, StatBlock, etc.) can launch the right dialog
 * without prop-drilling.
 */
export function useSheetDialogs(): SheetDialogs {
  const [open, setOpen] = useState<SheetDialogState>(null);
  return {
    open,
    close: () => setOpen(null),
    openInDn: () => setOpen({ kind: 'in-dn' }),
    openAbility: (initialAbility) => setOpen({ kind: 'ability', initialAbility }),
    openAttack: (initialWeaponId) => setOpen({ kind: 'attack', initialWeaponId }),
    openSave: (initialKind) => setOpen({ kind: 'save', initialKind }),
    openSkill: (initialSkillId) => setOpen({ kind: 'skill', initialSkillId }),
    openTechniqueCast: (technique, discipline, gate) =>
      setOpen({ kind: 'technique-cast', technique, discipline, gate }),
  };
}
