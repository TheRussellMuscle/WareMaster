/**
 * Additional-Golda purchase resolution for character creation.
 *
 * Source: Playkit Chapter 3 step 6 — after picking the starting equipment
 * package, the player may freely spend leftover golda on weapons, armor, or
 * general goods from the catalogs.
 *
 * Pure: no IO. Returns structured results the wizard can render and merge
 * into the character draft via resolveKit + buildDraft.
 */

import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { Weapon, Armor, GeneralGood } from '@/domain/item';

export type PurchaseKind = 'weapon' | 'armor' | 'good';

export interface PurchaseSelection {
  /** Catalog id for weapon / armor / general-good. */
  itemId: string;
  qty: number;
}

export interface ResolvedPurchaseLine {
  itemId: string;
  qty: number;
  kind: PurchaseKind;
  name: string;
  unitPrice: number;
  totalPrice: number;
  /** For armor: which slot it would fill (informational). */
  armorSlot?: 'body' | 'head' | 'shield';
}

export interface AdditionalPurchaseResult {
  lines: ResolvedPurchaseLine[];
  totalCost: number;
  remaining: number;
  invalid: Array<{ itemId: string; reason: string }>;
}

function priceAsNumber(price: number | string | undefined): number | null {
  if (price == null) return null;
  if (typeof price === 'number') return price;
  const trimmed = price.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'free') return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function findWeapon(catalog: ReferenceCatalog, id: string): Weapon | undefined {
  return catalog.weapons.weapons.find((w) => w.id === id);
}
function findArmor(catalog: ReferenceCatalog, id: string): Armor | undefined {
  return catalog.armor.find((a) => a.id === id);
}
function findGood(catalog: ReferenceCatalog, id: string): GeneralGood | undefined {
  return catalog.generalGoods.goods.find((g) => g.id === id);
}

export function resolveAdditionalPurchases(
  catalog: ReferenceCatalog,
  startingPurse: number,
  selections: PurchaseSelection[],
): AdditionalPurchaseResult {
  const lines: ResolvedPurchaseLine[] = [];
  const invalid: AdditionalPurchaseResult['invalid'] = [];
  let totalCost = 0;

  for (const sel of selections) {
    if (sel.qty <= 0) continue;

    const weapon = findWeapon(catalog, sel.itemId);
    if (weapon) {
      const unit = priceAsNumber(weapon.price_golda);
      if (unit == null) {
        invalid.push({ itemId: sel.itemId, reason: 'Price not numeric.' });
        continue;
      }
      const total = unit * sel.qty;
      lines.push({
        itemId: weapon.id,
        qty: sel.qty,
        kind: 'weapon',
        name: weapon.name,
        unitPrice: unit,
        totalPrice: total,
      });
      totalCost += total;
      continue;
    }

    const armor = findArmor(catalog, sel.itemId);
    if (armor) {
      const total = armor.price_golda * sel.qty;
      lines.push({
        itemId: armor.id,
        qty: sel.qty,
        kind: 'armor',
        name: armor.name,
        unitPrice: armor.price_golda,
        totalPrice: total,
        armorSlot: armor.slot,
      });
      totalCost += total;
      continue;
    }

    const good = findGood(catalog, sel.itemId);
    if (good) {
      const unit = priceAsNumber(good.price_golda);
      if (unit == null) {
        invalid.push({ itemId: sel.itemId, reason: 'Price not numeric.' });
        continue;
      }
      const total = unit * sel.qty;
      lines.push({
        itemId: good.id,
        qty: sel.qty,
        kind: 'good',
        name: good.name,
        unitPrice: unit,
        totalPrice: total,
      });
      totalCost += total;
      continue;
    }

    invalid.push({ itemId: sel.itemId, reason: 'Unknown item id.' });
  }

  return {
    lines,
    totalCost,
    remaining: startingPurse - totalCost,
    invalid,
  };
}
