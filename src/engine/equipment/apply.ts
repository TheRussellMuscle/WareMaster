/**
 * Pure equipment manipulation helpers — equip, unequip, drop, sell, buy,
 * and Bastard Sword grip toggle. Returns a delta `{ equipment, golda?,
 * conflicts? }` the sheet wraps with `updateCharacter`.
 *
 * No IO, no React. Cite rule §06 (equipment), §10 (sell-back ≥ 50%).
 */

import type {
  Character,
  Equipment,
  BastardSwordGrip,
  CustomItem,
} from '@/domain/character';
import type { Weapon, Armor, GeneralGood } from '@/domain/item';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export type ItemKind = 'weapon' | 'armor-body' | 'armor-head' | 'armor-shield' | 'good';

export interface ItemRef {
  itemId: string;
  kind: ItemKind;
  name: string;
  /** Catalog price in golda (when known). Used by sell + buy. */
  pricePerUnit: number | null;
}

export interface EquipResult {
  equipment: Equipment;
  /** Items moved out of slots back into inventory as part of the operation. */
  displaced: Array<{ itemId: string; from: 'body' | 'head' | 'shield' | 'weapon' }>;
  /** Rule warnings (e.g. 2H + shield) that the UI should surface. */
  conflicts: string[];
}

export interface SellResult {
  equipment: Equipment;
  golda: number;
  refund: number;
}

export interface BuyResult {
  equipment: Equipment;
  golda: number;
  cost: number;
  error?: string;
}

const SELL_FRACTION = 0.5;

function priceAsNumber(price: number | string | undefined | null): number | null {
  if (price == null) return null;
  if (typeof price === 'number') return price;
  const trimmed = price.trim();
  if (trimmed === '' || /^free$/i.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Look up an item across weapons / armor / general-goods. */
export function findItem(
  catalog: ReferenceCatalog,
  itemId: string,
):
  | { kind: 'weapon'; weapon: Weapon }
  | { kind: 'armor'; armor: Armor }
  | { kind: 'good'; good: GeneralGood }
  | null {
  const weapon = catalog.weapons.weapons.find((w) => w.id === itemId);
  if (weapon) return { kind: 'weapon', weapon };
  const armor = catalog.armor.find((a) => a.id === itemId);
  if (armor) return { kind: 'armor', armor };
  const good = catalog.generalGoods.goods.find((g) => g.id === itemId);
  if (good) return { kind: 'good', good };
  return null;
}

export function itemRef(
  catalog: ReferenceCatalog,
  itemId: string,
  customItems?: CustomItem[],
): ItemRef | null {
  const found = findItem(catalog, itemId);
  if (found) {
    if (found.kind === 'weapon') {
      return {
        itemId,
        kind: 'weapon',
        name: found.weapon.name,
        pricePerUnit: priceAsNumber(found.weapon.price_golda),
      };
    }
    if (found.kind === 'armor') {
      return {
        itemId,
        kind:
          found.armor.slot === 'body'
            ? 'armor-body'
            : found.armor.slot === 'head'
              ? 'armor-head'
              : 'armor-shield',
        name: found.armor.name,
        pricePerUnit: found.armor.price_golda,
      };
    }
    return {
      itemId,
      kind: 'good',
      name: found.good.name,
      pricePerUnit: priceAsNumber(found.good.price_golda),
    };
  }
  // Fall back to custom items
  const custom = customItems?.find((ci) => ci.id === itemId);
  if (custom) {
    return {
      itemId,
      kind: 'good',
      name: custom.name,
      pricePerUnit: custom.price_golda,
    };
  }
  return null;
}

/** Add an item to inventory without deducting gold (loot / GM grant). */
export function addInventoryItem(
  character: Character,
  itemId: string,
  qty = 1,
): { equipment: Equipment } {
  return {
    equipment: {
      ...character.equipment,
      other: pushInventory(character.equipment.other, itemId, qty),
    },
  };
}

function pushInventory(
  inventory: Equipment['other'],
  itemId: string,
  qty = 1,
): Equipment['other'] {
  const idx = inventory.findIndex((i) => i.item_id === itemId);
  if (idx >= 0) {
    return inventory.map((i, k) =>
      k === idx ? { ...i, quantity: i.quantity + qty } : i,
    );
  }
  return [...inventory, { item_id: itemId, quantity: qty }];
}

function popInventory(
  inventory: Equipment['other'],
  itemId: string,
  qty = 1,
): Equipment['other'] {
  const idx = inventory.findIndex((i) => i.item_id === itemId);
  if (idx < 0) return inventory;
  const entry = inventory[idx]!;
  if (entry.quantity <= qty) {
    return inventory.filter((_, k) => k !== idx);
  }
  return inventory.map((i, k) =>
    k === idx ? { ...i, quantity: i.quantity - qty } : i,
  );
}

function has2HWeaponEquipped(
  equipment: Equipment,
  catalog: ReferenceCatalog,
): boolean {
  return equipment.weapons.some((id) => {
    const w = catalog.weapons.weapons.find((ww) => ww.id === id);
    if (!w) return false;
    if (w.hands === 2) return true;
    if (w.id === 'bastard-sword' && equipment.bastard_sword_grip === '2H') return true;
    return false;
  });
}

/**
 * Equip an item from inventory into the appropriate slot. Auto-routes by
 * category. Pulls the first instance from inventory; if the destination
 * slot is occupied, displaces the existing piece back to inventory.
 */
export function equipItem(
  character: Character,
  itemId: string,
  catalog: ReferenceCatalog,
): EquipResult {
  const found = findItem(catalog, itemId);
  if (!found) {
    return {
      equipment: character.equipment,
      displaced: [],
      conflicts: [`Unknown item id "${itemId}".`],
    };
  }

  const eq = character.equipment;
  const conflicts: string[] = [];
  const displaced: EquipResult['displaced'] = [];

  if (found.kind === 'good') {
    return {
      equipment: eq,
      displaced: [],
      conflicts: ['General goods can\'t be equipped — keep them in inventory.'],
    };
  }

  if (found.kind === 'weapon') {
    const w = found.weapon;
    let inventory = popInventory(eq.other, itemId);
    const weapons = [...eq.weapons, w.id];
    let shield = eq.shield;
    if (w.hands === 2 && shield) {
      // Auto-displace the shield (silent swap; UI shows a toast/banner).
      inventory = pushInventory(inventory, shield);
      displaced.push({ itemId: shield, from: 'shield' });
      shield = null;
      conflicts.push(
        `Equipped a 2-handed weapon — moved ${
          catalog.armor.find((a) => a.id === displaced[0]!.itemId)?.name ?? 'shield'
        } to inventory (Rule §06 §2.1).`,
      );
    }
    return {
      equipment: { ...eq, weapons, shield, other: inventory },
      displaced,
      conflicts,
    };
  }

  // Armor: route by slot.
  const armor = found.armor;
  const slotKey =
    armor.slot === 'body' ? 'body_armor' : armor.slot === 'head' ? 'head_armor' : 'shield';
  const currentlyEquipped = eq[slotKey];
  let inventory = popInventory(eq.other, itemId);
  if (currentlyEquipped) {
    inventory = pushInventory(inventory, currentlyEquipped);
    displaced.push({ itemId: currentlyEquipped, from: armor.slot });
  }
  let shield = eq.shield;
  let weapons = eq.weapons;
  if (armor.slot === 'shield' && has2HWeaponEquipped({ ...eq, shield: null }, catalog)) {
    // Equipping a shield while 2H weapon equipped: keep weapon, but flag
    // that the shield's absorption is suspended until the weapon is gone.
    conflicts.push(
      `Shield equipped while a 2-handed weapon is in hand — its absorption is suspended (Rule §06 §2.1).`,
    );
  }
  const next: Equipment = {
    ...eq,
    body_armor: armor.slot === 'body' ? armor.id : eq.body_armor,
    head_armor: armor.slot === 'head' ? armor.id : eq.head_armor,
    shield: armor.slot === 'shield' ? armor.id : shield,
    weapons,
    other: inventory,
  };
  return { equipment: next, displaced, conflicts };
}

export type UnequipTarget =
  | { kind: 'body' }
  | { kind: 'head' }
  | { kind: 'shield' }
  | { kind: 'weapon'; index: number };

export function unequipItem(
  character: Character,
  target: UnequipTarget,
): EquipResult {
  const eq = character.equipment;
  if (target.kind === 'weapon') {
    const id = eq.weapons[target.index];
    if (!id) return { equipment: eq, displaced: [], conflicts: [] };
    return {
      equipment: {
        ...eq,
        weapons: eq.weapons.filter((_, i) => i !== target.index),
        other: pushInventory(eq.other, id),
      },
      displaced: [{ itemId: id, from: 'weapon' }],
      conflicts: [],
    };
  }
  const slotKey =
    target.kind === 'body'
      ? 'body_armor'
      : target.kind === 'head'
        ? 'head_armor'
        : 'shield';
  const id = eq[slotKey];
  if (!id) return { equipment: eq, displaced: [], conflicts: [] };
  return {
    equipment: {
      ...eq,
      [slotKey]: null,
      other: pushInventory(eq.other, id),
    },
    displaced: [{ itemId: id, from: target.kind }],
    conflicts: [],
  };
}

export function dropInventoryItem(
  character: Character,
  itemId: string,
  qty = 1,
): { equipment: Equipment } {
  return {
    equipment: { ...character.equipment, other: popInventory(character.equipment.other, itemId, qty) },
  };
}

export function sellInventoryItem(
  character: Character,
  itemId: string,
  catalog: ReferenceCatalog,
  qty = 1,
  customItems?: CustomItem[],
): SellResult {
  const ref = itemRef(catalog, itemId, customItems);
  if (!ref || ref.pricePerUnit == null) {
    return {
      equipment: character.equipment,
      golda: character.golda,
      refund: 0,
    };
  }
  const refund = Math.floor(ref.pricePerUnit * SELL_FRACTION) * qty;
  return {
    equipment: {
      ...character.equipment,
      other: popInventory(character.equipment.other, itemId, qty),
    },
    golda: character.golda + refund,
    refund,
  };
}

export function purchaseItem(
  character: Character,
  itemId: string,
  qty: number,
  catalog: ReferenceCatalog,
  customItems?: CustomItem[],
): BuyResult {
  if (qty <= 0) {
    return {
      equipment: character.equipment,
      golda: character.golda,
      cost: 0,
      error: 'Quantity must be positive.',
    };
  }
  const ref = itemRef(catalog, itemId, customItems);
  if (!ref) {
    return {
      equipment: character.equipment,
      golda: character.golda,
      cost: 0,
      error: `Unknown item id "${itemId}".`,
    };
  }
  if (ref.pricePerUnit == null) {
    return {
      equipment: character.equipment,
      golda: character.golda,
      cost: 0,
      error: `${ref.name} has no fixed price — acquire by other means.`,
    };
  }
  const cost = ref.pricePerUnit * qty;
  if (cost > character.golda) {
    return {
      equipment: character.equipment,
      golda: character.golda,
      cost,
      error: `Need ${cost - character.golda} more golda.`,
    };
  }
  return {
    equipment: {
      ...character.equipment,
      other: pushInventory(character.equipment.other, itemId, qty),
    },
    golda: character.golda - cost,
    cost,
  };
}

export interface GripResult {
  equipment: Equipment;
  conflicts: string[];
}

export function setBastardGrip(
  character: Character,
  grip: BastardSwordGrip,
  catalog: ReferenceCatalog,
): GripResult {
  const eq = character.equipment;
  if (eq.bastard_sword_grip === grip) {
    return { equipment: eq, conflicts: [] };
  }
  const conflicts: string[] = [];
  if (
    grip === '2H' &&
    eq.shield &&
    eq.weapons.includes('bastard-sword')
  ) {
    const shieldName =
      catalog.armor.find((a) => a.id === eq.shield)?.name ?? 'Shield';
    conflicts.push(
      `Bastard Sword wielded 2-handed — ${shieldName}'s absorption is suspended until you switch back to 1H or unequip the sword (Rule §06 §2.1).`,
    );
  }
  return { equipment: { ...eq, bastard_sword_grip: grip }, conflicts };
}
