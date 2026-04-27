/**
 * Builds the Available Weapons table shown on the official character sheet
 * (Playkit p. 79). For each equipped weapon, computes:
 *   melee BN  = Base BN + weapon.bn_modifier.melee  + <Weapon> Skill Level
 *   charge BN = Base BN + weapon.bn_modifier.charge + <Weapon> Skill Level
 *   ranged BN = Base BN + weapon.bn_modifier.range  + <Weapon> Skill Level
 * Damage values and Critical Value come straight from the catalog.
 *
 * Each weapon type is its own Skill in Wares Blade (Playkit p. 16); the
 * Skill id matches the Weapon id 1:1 (e.g. weapon `longsword` → skill
 * `longsword`). If the character doesn't have that Skill, level is 0.
 */

import type { Character } from '@/domain/character';
import type { Weapon } from '@/domain/item';
import type { CustomItem } from '@/domain/custom-item';
import { isCustomWeapon } from '@/domain/custom-item';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export interface WeaponLine {
  weapon_id: string;
  name: string;
  category: Weapon['category'];
  weaponSkillLevel: number;
  meleeBN: number | null;
  chargeBN: number | null;
  rangedBN: number | null;
  damageMelee: string | null;
  damageRanged: string | null;
  criticalValue: number;
  hands: number | string;
}

function weaponSkillLevelFor(character: Character, weaponId: string): number {
  const match = character.skills.find((s) => s.skill_id === weaponId);
  return match?.level ?? 0;
}

/**
 * Bastard Sword damage strings are stored as e.g. "1D10+3(5)" — the value
 * outside the parens is the 1-handed damage, the parenthesized value is
 * the 2-handed alternative. Resolve to the active value based on grip.
 */
function resolveBastardDamage(raw: string, grip: '1H' | '2H'): string {
  const m = raw.match(/^(.*?)\+(\d+)\((\d+)\)$/);
  if (!m) return raw;
  const [, base, oneHand, twoHand] = m;
  return `${base}+${grip === '2H' ? twoHand : oneHand}`;
}

export function buildWeaponLines(
  character: Character,
  catalog: ReferenceCatalog | null,
  baseBN: number,
  customItems?: CustomItem[],
): WeaponLine[] {
  if (!catalog) return [];
  const grip = character.equipment.bastard_sword_grip;
  const lines: WeaponLine[] = [];
  for (const weaponId of character.equipment.weapons) {
    const weapon = catalog.weapons.weapons.find((w) => w.id === weaponId);
    if (weapon) {
      const skillLvl = weaponSkillLevelFor(character, weapon.id);
      const isBastard = weapon.id === 'bastard-sword';
      const addOrNull = (mod: number | null | undefined): number | null =>
        mod == null ? null : baseBN + mod + skillLvl;
      const rawMelee = weapon.damage_value.melee ?? null;
      const damageMelee =
        isBastard && rawMelee ? resolveBastardDamage(rawMelee, grip) : rawMelee;
      lines.push({
        weapon_id: weapon.id,
        name: weapon.name,
        category: weapon.category,
        weaponSkillLevel: skillLvl,
        meleeBN: addOrNull(weapon.bn_modifier.melee),
        chargeBN: addOrNull(weapon.bn_modifier.charge),
        rangedBN: addOrNull(weapon.bn_modifier.range),
        damageMelee,
        damageRanged: weapon.damage_value.ranged ?? null,
        criticalValue: weapon.critical_value,
        hands: isBastard ? grip : weapon.hands,
      });
      continue;
    }
    // Fall back to custom weapons
    const ci = customItems?.find((c) => c.id === weaponId);
    if (!ci || !isCustomWeapon(ci)) continue;
    const skillLvl = weaponSkillLevelFor(character, ci.id);
    const addOrNull = (mod: number | null | undefined): number | null =>
      mod == null ? null : baseBN + mod + skillLvl;
    lines.push({
      weapon_id: ci.id,
      name: ci.name,
      category: ci.category ?? 'swords',
      weaponSkillLevel: skillLvl,
      meleeBN: addOrNull(ci.bn_modifier?.melee),
      chargeBN: addOrNull(ci.bn_modifier?.charge),
      rangedBN: addOrNull(ci.bn_modifier?.range),
      damageMelee: ci.damage_value?.melee ?? null,
      damageRanged: ci.damage_value?.ranged ?? null,
      criticalValue: ci.critical_value ?? 0,
      hands: ci.hands ?? 1,
    });
  }
  return lines;
}
