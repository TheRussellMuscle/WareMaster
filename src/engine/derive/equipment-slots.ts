/**
 * Resolves a character's equipment ids into structured slot data the sheet
 * UI can render directly. Pure: no IO, no React.
 *
 * Source: rule §06 §1–2 (weapons + armor) and the Playkit p. 79 character
 * sheet's "Available Weapons" + "Armor & Protection" blocks.
 */

import type { Character } from '@/domain/character';
import type { CustomItem } from '@/domain/custom-item';
import { isCustomWeapon, isCustomArmor, customWeaponToWeapon, customArmorToArmor } from '@/domain/custom-item';
import type { Weapon, Armor, GeneralGood } from '@/domain/item';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export type WeaponHands = 1 | 2 | 'bastard';

export interface EquippedWeapon {
  weapon: Weapon;
  hands: WeaponHands;
}

export interface EquippedArmorSlot {
  armor: Armor | null;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
  /** Resolved catalog entry (weapon, armor, or general-good), or null when unknown. */
  weapon: Weapon | null;
  armor: Armor | null;
  good: GeneralGood | null;
}

export interface EquipmentSlots {
  body: EquippedArmorSlot;
  head: EquippedArmorSlot;
  shield: EquippedArmorSlot;
  weapons: EquippedWeapon[];
  inventory: InventoryItem[];
  /** Rule-violation flags (§06 §2.1: 2H weapon + shield is invalid). */
  conflicts: string[];
}

function classifyHands(weapon: Weapon): WeaponHands {
  if (typeof weapon.hands === 'number') {
    return weapon.hands === 2 ? 2 : 1;
  }
  // Bastard sword: hands === '1 or 2'.
  return 'bastard';
}

export function resolveEquippedSlots(
  character: Character,
  catalog: ReferenceCatalog | null,
  customItems?: CustomItem[],
): EquipmentSlots {
  const empty: EquipmentSlots = {
    body: { armor: null },
    head: { armor: null },
    shield: { armor: null },
    weapons: [],
    inventory: [],
    conflicts: [],
  };
  if (!catalog) return empty;

  const findArmor = (id: string | null): Armor | null => {
    if (!id) return null;
    const ca = catalog.armor.find((a) => a.id === id);
    if (ca) return ca;
    const ci = customItems?.find((c) => c.id === id);
    if (ci && isCustomArmor(ci)) return customArmorToArmor(ci);
    return null;
  };

  const slots: EquipmentSlots = {
    body: { armor: findArmor(character.equipment.body_armor) },
    head: { armor: findArmor(character.equipment.head_armor) },
    shield: { armor: findArmor(character.equipment.shield) },
    weapons: [],
    inventory: [],
    conflicts: [],
  };

  for (const weaponId of character.equipment.weapons) {
    const w = catalog.weapons.weapons.find((ww) => ww.id === weaponId);
    if (w) {
      slots.weapons.push({ weapon: w, hands: classifyHands(w) });
      continue;
    }
    const ci = customItems?.find((c) => c.id === weaponId);
    if (ci && isCustomWeapon(ci)) {
      const synth = customWeaponToWeapon(ci);
      slots.weapons.push({ weapon: synth, hands: classifyHands(synth) });
    }
  }

  for (const item of character.equipment.other) {
    const weapon =
      catalog.weapons.weapons.find((w) => w.id === item.item_id) ?? null;
    const armor = catalog.armor.find((a) => a.id === item.item_id) ?? null;
    const good =
      catalog.generalGoods.goods.find((g) => g.id === item.item_id) ?? null;

    // Fall back to custom items for display
    let resolvedWeapon = weapon;
    let resolvedArmor = armor;
    if (!weapon && !armor && !good) {
      const ci = customItems?.find((c) => c.id === item.item_id);
      if (ci && isCustomWeapon(ci)) resolvedWeapon = customWeaponToWeapon(ci);
      else if (ci && isCustomArmor(ci)) resolvedArmor = customArmorToArmor(ci);
    }

    slots.inventory.push({
      itemId: item.item_id,
      quantity: item.quantity,
      weapon: resolvedWeapon,
      armor: resolvedArmor,
      good,
    });
  }

  // Conflict: any 2-handed weapon equipped while shield is set (§06 §2.1).
  const has2H = slots.weapons.some((w) => w.hands === 2);
  if (has2H && slots.shield.armor) {
    slots.conflicts.push(
      `A 2-handed weapon is equipped alongside ${slots.shield.armor.name} — shield absorption is suspended (Rule §06 §2.1).`,
    );
  }

  return slots;
}
