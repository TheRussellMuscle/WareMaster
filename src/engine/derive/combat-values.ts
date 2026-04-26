/**
 * Derives the combat-related values shown on the Wares Blade character sheet
 * (Playkit p. 79–80). The math comes from rule §04 (Attributes & Derived).
 *
 * Base Attribute = floor(score / 3) for SEN/AGI/WIL/CON/CHA (LUC has no Base).
 * Total Armor Modifier = sum of armor_modifier across body, head, shield slots.
 * Total Absorption = sum of absorption across body, head, shield slots.
 * Base IN  = Base SEN + Total Armor Modifier
 * Base BN  = Base AGI + Total Armor Modifier
 * Base DN  = Base AGI + Total Armor Modifier + <Defense> Skill Level
 * Heavy Mental recovery = (16 − WIL) hours per point
 * Heavy Physical recovery = (16 − CON) days per point
 * First Impression Value = Base CHA (+ optional appearance / CHA modifiers)
 */

import { baseValue } from '@/domain/attributes';
import type { Character } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export interface DerivedCombatValues {
  baseSEN: number;
  baseAGI: number;
  baseWIL: number;
  baseCON: number;
  baseCHA: number;
  defenseSkillLevel: number;
  mentalResistanceLevel: number;
  physicalResistanceLevel: number;
  wordCastingLevel: number;
  totalArmorModifier: number;
  /** Sum across body/head/shield + Warrior class bonus (rule §06 §2). */
  totalAbsorption: number;
  /** Warrior +1 component, exposed for breakdown displays. */
  warriorAbsorptionBonus: number;
  baseIN: number;
  baseBN: number;
  baseDN: number;
  absorptionPerfectSuccess: number;
  absorptionTotalFailure: number;
  heavyMentalRecoveryHoursPerPoint: number;
  heavyPhysicalRecoveryDaysPerPoint: number;
  firstImpressionValue: number;
  baseBindingValue: number;
  basePrayerValue: number;
  /** Light Damage cap = CON + Physical Resistance (rule §05/§09). */
  physicalDurability: number;
  /** Mental Damage cap = WIL + Mental Resistance. */
  mentalDurability: number;
}

function skillLevel(character: Character, ...idCandidates: string[]): number {
  for (const id of idCandidates) {
    const match = character.skills.find(
      (s) => s.skill_id.toLowerCase() === id.toLowerCase(),
    );
    if (match) return match.level;
  }
  return 0;
}

function armorAbsorption(
  character: Character,
  catalog: ReferenceCatalog | null,
): { absorption: number; modifier: number; warriorBonus: number } {
  const warriorBonus = character.class_id === 'warrior' ? 1 : 0;
  if (!catalog) return { absorption: warriorBonus, modifier: 0, warriorBonus };
  let absorption = 0;
  let modifier = 0;
  for (const slotId of [
    character.equipment.body_armor,
    character.equipment.head_armor,
    character.equipment.shield,
  ]) {
    if (!slotId) continue;
    const armor = catalog.armor.find((a) => a.id === slotId);
    if (!armor) continue;
    absorption += armor.absorption;
    modifier += armor.armor_modifier;
  }
  // Warrior class perk: +1 Total Absorption (rule §06 §2 / §10 §1).
  absorption += warriorBonus;
  return { absorption, modifier, warriorBonus };
}

export function deriveCombatValues(
  character: Character,
  catalog: ReferenceCatalog | null,
): DerivedCombatValues {
  const baseSEN = baseValue(character.abilities.SEN);
  const baseAGI = baseValue(character.abilities.AGI);
  const baseWIL = baseValue(character.abilities.WIL);
  const baseCON = baseValue(character.abilities.CON);
  const baseCHA = baseValue(character.abilities.CHA);

  const {
    absorption: totalAbsorption,
    modifier: totalArmorModifier,
    warriorBonus: warriorAbsorptionBonus,
  } = armorAbsorption(character, catalog);

  const defenseSkillLevel = skillLevel(character, 'defense');
  const mentalResistanceLevel = skillLevel(character, 'mental-resistance');
  const physicalResistanceLevel = skillLevel(character, 'physical-resistance');
  const wordCastingLevel = skillLevel(
    character,
    'word-casting',
    'word-casting/sun',
    'word-casting/metal',
    'word-casting/fire',
    'word-casting/wood',
    'word-casting/moon',
    'word-casting/wind',
    'word-casting/water',
    'word-casting/earth',
  );

  const baseIN = baseSEN + totalArmorModifier;
  const baseBN = baseAGI + totalArmorModifier;
  const baseDN = baseAGI + totalArmorModifier + defenseSkillLevel;

  return {
    baseSEN,
    baseAGI,
    baseWIL,
    baseCON,
    baseCHA,
    defenseSkillLevel,
    mentalResistanceLevel,
    physicalResistanceLevel,
    wordCastingLevel,
    totalArmorModifier,
    totalAbsorption,
    warriorAbsorptionBonus,
    baseIN,
    baseBN,
    baseDN,
    absorptionPerfectSuccess: totalAbsorption * 2,
    absorptionTotalFailure: Math.floor(totalAbsorption / 2),
    heavyMentalRecoveryHoursPerPoint: Math.max(1, 16 - character.abilities.WIL),
    heavyPhysicalRecoveryDaysPerPoint: Math.max(1, 16 - character.abilities.CON),
    firstImpressionValue: baseCHA + character.appearance_modifier,
    baseBindingValue: baseAGI + totalArmorModifier + wordCastingLevel,
    basePrayerValue: baseWIL + mentalResistanceLevel,
    physicalDurability: character.abilities.CON + physicalResistanceLevel,
    mentalDurability: character.abilities.WIL + mentalResistanceLevel,
  };
}
