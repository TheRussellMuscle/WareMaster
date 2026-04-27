import { useState } from 'react';
import type { AbilityCode } from '@/domain/attributes';
import type { Discipline, Gate, Technique } from '@/domain/technique';
import type { SaveKind } from '@/engine/combat/save-roll';

export type SheetDialogState =
  | { kind: 'in-dn' }
  | { kind: 'ability'; initialAbility?: AbilityCode; initialDifficulty?: number; initialSkillBonus?: number }
  | { kind: 'attack'; initialWeaponId?: string }
  | { kind: 'save'; initialKind?: SaveKind; initialDifficulty?: number }
  | { kind: 'skill'; initialSkillId?: string }
  | { kind: 'first-impression' }
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
  openAbility: (initialAbility?: AbilityCode, initialDifficulty?: number, initialSkillBonus?: number) => void;
  openAttack: (initialWeaponId?: string) => void;
  openSave: (initialKind?: SaveKind, initialDifficulty?: number) => void;
  openSkill: (initialSkillId?: string) => void;
  openFirstImpression: () => void;
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
    openAbility: (initialAbility, initialDifficulty, initialSkillBonus) =>
      setOpen({ kind: 'ability', initialAbility, initialDifficulty, initialSkillBonus }),
    openAttack: (initialWeaponId) => setOpen({ kind: 'attack', initialWeaponId }),
    openSave: (initialKind, initialDifficulty) => setOpen({ kind: 'save', initialKind, initialDifficulty }),
    openSkill: (initialSkillId) => setOpen({ kind: 'skill', initialSkillId }),
    openFirstImpression: () => setOpen({ kind: 'first-impression' }),
    openTechniqueCast: (technique, discipline, gate) =>
      setOpen({ kind: 'technique-cast', technique, discipline, gate }),
  };
}
