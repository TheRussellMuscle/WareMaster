/**
 * Instance roll-context derivation helpers.
 *
 * Pure functions that resolve template + instance + (for Ryude) operator into
 * the primitive inputs that `actionRoll` / `resolveAttack` already accept.
 * No IO, no React. Each helper returns a small `{ base, modifier, breakdown,
 * label }` shape so dialogs can surface the math to the WM.
 *
 * Phase 4 polish (Track 2) — backs the per-instance roll dialogs.
 */

import type {
  MonsterTemplate,
} from '@/domain/monster';
import type { MonsterInstance } from '@/domain/monster-instance';
import type { RyudeTemplate } from '@/domain/ryude';
import type { RyudeInstance } from '@/domain/ryude-instance';
import type { Character } from '@/domain/character';
import type { SimpleNpc, NpcTemplate } from '@/domain/npc';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { RyudeWeapon, RyudeArmor } from '@/domain/item';

export type AttackTarget = 'character' | 'ryude';
export type MonsterAbility = 'sen' | 'agi' | 'wil' | 'con' | 'cha';

export interface BreakdownLine {
  label: string;
  value: number;
}

export interface RollContext {
  /** Base attribute value for `actionRoll.baseAttribute`. */
  base: number;
  /** Flat modifier piped into `actionRoll.modifier`. */
  modifier: number;
  /** Component lines for the dialog "Roll math" panel. */
  breakdown: BreakdownLine[];
  /** Human-readable label, e.g. "Tusktooth · AGI vs Character". */
  label: string;
}

/** Minimal operator shape needed by all Ryude roll helpers. */
export interface OperatorStats {
  name: string;
  abilities: { AGI: number; SEN: number };
  skills: { skill_id: string; level: number }[];
}

/**
 * Resolves a `RyudeOperator` reference to an `OperatorStats` shape.
 * Returns `null` when:
 *   - `operator` is null (unmanned)
 *   - `kind === 'character'` but the character is not in `characters`
 *   - `kind === 'npc'` but the NPC is not found or is not a `full-character`
 *     archetype (SimpleNpc / BeastNpc lack a full ability spread)
 */
export function resolveOperatorStats(
  operator: { kind: string; id: string } | null,
  characters: Character[],
  npcTemplates: NpcTemplate[],
): OperatorStats | null {
  if (!operator) return null;
  if (operator.kind === 'character') {
    const c = characters.find((x) => x.id === operator.id);
    if (!c) return null;
    return {
      name: c.name,
      abilities: { AGI: c.abilities.AGI, SEN: c.abilities.SEN },
      skills: c.skills,
    };
  }
  if (operator.kind === 'npc') {
    const n = npcTemplates.find((x) => x.id === operator.id);
    if (!n || n.archetype !== 'full-character') return null;
    return {
      name: n.name,
      abilities: { AGI: n.abilities.AGI, SEN: n.abilities.SEN },
      skills: n.skills,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Monster (and Beast NPC, which extends MonsterTemplate)             */
/* ------------------------------------------------------------------ */

/** Looks up `base_<ability>` (or `_vs_ryude` variant) with override fallback. */
export function monsterAbilityRoll(
  tpl: MonsterTemplate,
  inst: MonsterInstance,
  ability: MonsterAbility,
  target: AttackTarget,
): RollContext {
  const vsRyude = target === 'ryude';
  let base: number = 0;
  let label: string;

  if (ability === 'cha') {
    const charBase = tpl.base_cha ?? 0;
    const ryudeBase = tpl.cha_modifier_vs_ryude ?? charBase;
    base = vsRyude ? ryudeBase : charBase;
    label = `${inst.name} · CHA${vsRyude ? ' vs Ryude' : ''}`;
  } else {
    const charField = (`base_${ability}` as const);
    const ryudeField = (`base_${ability}_vs_ryude` as const);
    const charBase = tpl[charField] ?? 0;
    const ryudeBase = tpl[ryudeField] ?? charBase;
    base = vsRyude ? (ryudeBase ?? 0) : (charBase ?? 0);
    label = `${inst.name} · ${ability.toUpperCase()}${vsRyude ? ' vs Ryude' : ''}`;
  }

  return {
    base,
    modifier: 0,
    breakdown: [{ label: `Base ${ability.toUpperCase()}`, value: base }],
    label,
  };
}

export interface MonsterDamageFormula {
  /** Damage formula string (`"1D5+2"`, `"5D5+80"`). */
  formula: string;
  /** Target absorption to subtract — already resolved per target type. */
  absorption: number;
  /** Components for the dialog math panel. */
  breakdown: BreakdownLine[];
}

/**
 * Resolves the monster's damage formula string + absorption to use against
 * the chosen target type. Order of precedence:
 *   inst.overrides.damage_value
 *   tpl.damage_value_vs_ryude (when target = ryude)
 *   tpl.damage_value × multiplier_vs_ryude (when target = ryude and the
 *     template only defines a multiplier, e.g. Magu-Draph at 2× vs Ryude)
 *   tpl.damage_value
 */
export function monsterDamageFormula(
  tpl: MonsterTemplate,
  inst: MonsterInstance,
  target: AttackTarget,
): MonsterDamageFormula {
  const override = inst.overrides.damage_value;
  if (override !== undefined && override !== null) {
    const formula = String(override);
    return {
      formula,
      absorption: 0,
      breakdown: [{ label: 'Override damage', value: 0 }],
    };
  }

  let formula: string;
  if (target === 'ryude') {
    if (tpl.damage_value_vs_ryude !== undefined && tpl.damage_value_vs_ryude !== null) {
      formula = String(tpl.damage_value_vs_ryude);
    } else {
      const mult =
        tpl.damage_value_vs_ryude_multiplier ??
        tpl.damage_value_multiplier_vs_ryude ??
        1;
      const baseStr = String(tpl.damage_value);
      formula = mult !== 1 ? `${baseStr} ×${mult}` : baseStr;
    }
  } else {
    formula = String(tpl.damage_value);
  }

  // Absorption: monster's defensive value taken against the *attacker*. For
  // damage applied to the target, the dialog inputs the target's absorption.
  // We surface the monster's own absorption here as a hint; the dialog asks
  // for the actual target absorption at roll time.
  const ownAbsorption = resolveNumeric(
    target === 'ryude' ? tpl.total_absorption_vs_ryude : tpl.total_absorption,
  );

  return {
    formula,
    absorption: 0,
    breakdown: [
      { label: 'Damage formula', value: 0 },
      { label: `Own Total Absorption${target === 'ryude' ? ' vs Ryude' : ''}`, value: ownAbsorption },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Ryude (operator-driven)                                            */
/* ------------------------------------------------------------------ */

/** floor(ability/3) — Wares Blade Base Value. Mirrors action-roll.ts:16. */
export function abilityBaseValue(score: number): number {
  return Math.floor(score / 3);
}

/** Returns the operator's drive-skill level (default 0 if untrained). */
export function operatorDriveSkillLevel(operator: OperatorStats): number {
  const drive = operator.skills.find((s) => s.skill_id === 'drive');
  return drive?.level ?? 0;
}

/**
 * Drive Modifier = DriveSkillLevel − RequiredDrive − drive_reduction (Rule §14:124-160).
 * Negative when undertrained or penalised, positive when overqualified.
 * `inst` is optional so callers that only have template + operator can still use this.
 */
export function ryudeDriveModifier(
  tpl: RyudeTemplate,
  operator: OperatorStats,
  inst?: RyudeInstance,
): number {
  return operatorDriveSkillLevel(operator) - tpl.required_drive - (inst?.state.drive_reduction ?? 0);
}

/** Effective Ryude attribute after subtracting recorded attribute damage. */
export function effectiveRyudeAttribute(
  tpl: RyudeTemplate,
  inst: RyudeInstance,
  attr: 'spe' | 'pow' | 'arm' | 'bal',
): number {
  const base = tpl.attributes[attr];
  const dmg = inst.state.attribute_damage[attr];
  return base - dmg;
}

/**
 * Returns the template's ego value, or null if not set.
 * Displayed as a reference note in roll breakdowns until the full ego system is built.
 */
export function ryudeEgoValue(tpl: RyudeTemplate): number | null {
  return tpl.ego ?? null;
}

/**
 * Operator maneuver / DN roll context (Rule §14:149).
 *
 *   DN = 1D10 + Operator AGI Base + Ryude SPE + Drive Modifier
 *
 * AGI drives DN/BN. For IN use `ryudeInContext` (SEN-based).
 */
export function ryudeOperatorRoll(
  tpl: RyudeTemplate,
  inst: RyudeInstance,
  operator: OperatorStats,
  equippedArmors: RyudeArmor[] = [],
): RollContext {
  const opAgi = abilityBaseValue(operator.abilities.AGI);
  const ryudeSpeBase = effectiveRyudeAttribute(tpl, inst, 'spe');
  const armorSpeSum = equippedArmors.reduce((s, a) => s + a.spe_modifier, 0);
  const ryudeSpe = ryudeSpeBase + armorSpeSum;
  const driveMod = ryudeDriveModifier(tpl, operator, inst);
  const breakdown: BreakdownLine[] = [
    { label: `Operator AGI Base (${operator.name})`, value: opAgi },
    { label: 'Ryude SPE', value: ryudeSpeBase },
  ];
  if (armorSpeSum !== 0) {
    breakdown.push({ label: 'Armor SPE modifier', value: armorSpeSum });
  }
  breakdown.push({ label: 'Drive Modifier', value: driveMod });
  if ((inst.state.drive_reduction ?? 0) > 0) {
    breakdown.push({ label: 'Drive Reduction (penalty)', value: -(inst.state.drive_reduction) });
  }
  const ego = ryudeEgoValue(tpl);
  if (ego !== null) {
    breakdown.push({ label: `Ryude Ego: ${ego} (not yet applied)`, value: 0 });
  }
  return {
    base: opAgi,
    modifier: ryudeSpe + driveMod,
    breakdown,
    label: `${inst.name} · Operator Roll`,
  };
}

/**
 * IN roll context (Rule §14:149).
 *
 *   Base IN = Operator SEN Base + Ryude SPE + Drive Modifier
 *
 * SEN drives IN; AGI drives DN. These differ when SEN ≠ AGI.
 */
export function ryudeInContext(
  tpl: RyudeTemplate,
  inst: RyudeInstance,
  operator: OperatorStats,
  equippedArmors: RyudeArmor[] = [],
): RollContext {
  const opSen = abilityBaseValue(operator.abilities.SEN);
  const ryudeSpeBase = effectiveRyudeAttribute(tpl, inst, 'spe');
  const armorSpeSum = equippedArmors.reduce((s, a) => s + a.spe_modifier, 0);
  const ryudeSpe = ryudeSpeBase + armorSpeSum;
  const driveMod = ryudeDriveModifier(tpl, operator, inst);
  const breakdown: BreakdownLine[] = [
    { label: `Operator SEN Base (${operator.name})`, value: opSen },
    { label: 'Ryude SPE', value: ryudeSpeBase },
  ];
  if (armorSpeSum !== 0) {
    breakdown.push({ label: 'Armor SPE modifier', value: armorSpeSum });
  }
  breakdown.push({ label: 'Drive Modifier', value: driveMod });
  if ((inst.state.drive_reduction ?? 0) > 0) {
    breakdown.push({ label: 'Drive Reduction (penalty)', value: -(inst.state.drive_reduction) });
  }
  return {
    base: opSen,
    modifier: ryudeSpe + driveMod,
    breakdown,
    label: `${inst.name} · IN`,
  };
}

export interface AttunementContext {
  attunementValue: number;
  driveModifier: number;
  /** Attunement Check: succeed when `1D10 - driveModifier ≤ attunementValue`. */
  successCondition: string;
}

/**
 * Attunement Check context (Rule §14:38-66).
 *
 * The check is a roll-under: `1D10 - DriveModifier ≤ AttunementValue`.
 * The dialog runs the comparison; this helper just bundles the inputs.
 */
export function ryudeAttunementContext(
  tpl: RyudeTemplate,
  inst: RyudeInstance,
  operator: OperatorStats,
): AttunementContext {
  const driveModifier = ryudeDriveModifier(tpl, operator, inst);
  return {
    attunementValue: tpl.attunement_value,
    driveModifier,
    successCondition:
      driveModifier >= 0
        ? `1D10 − ${driveModifier} ≤ ${tpl.attunement_value}`
        : `1D10 + ${Math.abs(driveModifier)} ≤ ${tpl.attunement_value}`,
  };
}

export interface RyudeAttackContext {
  /** BN base for `resolveAttack.baseBN`. */
  baseBN: number;
  /** Weapon's BN modifier piped into `resolveAttack.weaponBnModifier`. */
  weaponBnModifier: number;
  /** Critical value — pass through to `resolveAttack.criticalValue`. */
  criticalValue: number;
  /** Damage formula string. */
  damageFormula: string;
  /** Operator's skill level for this ryude weapon (looked up in operator.skills). */
  weaponSkillLevel: number;
  /** ×10 vs human targets, ×1 vs Ryude (Rule §14:160). */
  vsHumanMultiplier: 1 | 10;
  breakdown: BreakdownLine[];
  label: string;
}

/**
 * Ryude weapon attack context (Rule §14:124-160 / §14:160).
 *
 *   BN = Operator AGI Base + Ryude SPE + Weapon BN Modifier (stance) +
 *        Weapon Skill Level + Drive Modifier
 *
 *   Damage = weapon damage formula; ×10 against human-scale targets.
 */
export function ryudeAttackContext(
  tpl: RyudeTemplate,
  inst: RyudeInstance,
  operator: OperatorStats,
  weapon: RyudeWeapon,
  target: AttackTarget,
  stance: 'melee' | 'charge' | 'range' = 'melee',
  equippedArmors: RyudeArmor[] = [],
): RyudeAttackContext {
  const opAgi = abilityBaseValue(operator.abilities.AGI);
  const ryudeSpeBase = effectiveRyudeAttribute(tpl, inst, 'spe');
  const armorSpeSum = equippedArmors.reduce((s, a) => s + a.spe_modifier, 0);
  const ryudeSpe = ryudeSpeBase + armorSpeSum;
  const driveMod = ryudeDriveModifier(tpl, operator, inst);
  const weaponSkillLevel =
    operator.skills.find((s) => s.skill_id === weapon.id)?.level ?? 0;
  const bnMod = weapon.bn_modifier[stance] ?? 0;
  const formula =
    stance === 'range'
      ? weapon.damage_value.ranged ?? weapon.damage_value.melee ?? '0'
      : weapon.damage_value.melee ?? '0';

  const breakdown: BreakdownLine[] = [
    { label: `Operator AGI Base (${operator.name})`, value: opAgi },
    { label: 'Ryude SPE', value: ryudeSpeBase },
  ];
  if (armorSpeSum !== 0) {
    breakdown.push({ label: 'Armor SPE modifier', value: armorSpeSum });
  }
  breakdown.push(
    { label: `Weapon BN (${stance})`, value: bnMod },
    { label: `${weapon.name} Skill`, value: weaponSkillLevel },
    { label: 'Drive Modifier', value: driveMod },
  );

  return {
    baseBN: opAgi,
    weaponBnModifier: bnMod + ryudeSpe + driveMod,
    criticalValue: weapon.critical_value,
    damageFormula: formula,
    weaponSkillLevel,
    vsHumanMultiplier: target === 'character' ? 10 : 1,
    breakdown,
    label: `${inst.name} · ${weapon.name}${target === 'character' ? ' vs Character' : ' vs Ryude'}`,
  };
}

/* ------------------------------------------------------------------ */
/* Simple NPC                                                         */
/* ------------------------------------------------------------------ */

export type GoverningAttribute = 'AGI' | 'SEN' | 'WIL' | 'CON' | 'CHA' | 'LUC' | null;

export interface SimpleNpcSkillContext {
  /** The notable-skill level (already filled in). */
  level: number;
  /** Governing attribute pulled from the skill catalog. `null` for specialized skills. */
  governingAttribute: GoverningAttribute;
  /**
   * Pre-filled ability base when we can compute it from NPC fields. Today only
   * CHA can be auto-filled (from `cha_modifier`). For others the dialog asks
   * the WM to enter a value (Simple NPCs lack a full ability spread by design).
   */
  baseAttributeValue: number | null;
  label: string;
}

/**
 * Resolves a Simple NPC's notable-skill roll context. The roll is a normal
 * Action Roll: `1D10 + base + level` vs DC.
 *
 * If the NPC doesn't list the skill in `notable_skills`, level defaults to 0
 * (untrained) and the dialog can still run the roll (e.g. for an opposed
 * unskilled attempt).
 */
export function simpleNpcSkillContext(
  npc: SimpleNpc,
  skillId: string,
  catalog: ReferenceCatalog | null,
): SimpleNpcSkillContext {
  const notable = npc.notable_skills.find((s) => s.skill_id === skillId);
  const level = notable?.level ?? 0;
  const skillEntry = catalog?.skills.skills.find((s) => s.id === skillId);
  const governing: GoverningAttribute = (skillEntry?.attribute ?? null) as GoverningAttribute;
  const baseAttributeValue = governing === 'CHA' ? npc.cha_modifier : null;
  const skillName = skillEntry?.name ?? skillId;
  return {
    level,
    governingAttribute: governing,
    baseAttributeValue,
    label: `${npc.name} · ${skillName}`,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveNumeric(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const parsed = parseInt(v, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
