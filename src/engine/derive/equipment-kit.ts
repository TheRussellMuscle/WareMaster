/**
 * Resolves an equipment-package item list (free-form display strings like
 * "Longsword" or "Lamellar Armor") into structured catalog references and
 * sorts them into the character's equipment slots.
 *
 * Source: docs/data/classes.yaml — equipment_packages each list `items:
 * [string]` matching weapon / armor / general-good names.
 */

import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { Weapon, Armor } from '@/domain/item';

export interface ResolvedKit {
  /** Weapon ids ordered as the package listed them. */
  weaponIds: string[];
  /** Body armor id (or null if package has none). */
  bodyArmorId: string | null;
  /** Head armor id (or null). */
  headArmorId: string | null;
  /** Shield id (or null). */
  shieldId: string | null;
  /** Items the catalog didn't recognize — kept as free-form inventory. */
  other: Array<{ item_id: string; quantity: number }>;
  /** Per-item resolution detail for diagnostics / display. */
  resolved: Array<{
    raw: string;
    kind: 'weapon' | 'armor' | 'unmatched';
    id?: string;
    slot?: 'body' | 'head' | 'shield';
  }>;
}

const EMPTY_KIT: ResolvedKit = {
  weaponIds: [],
  bodyArmorId: null,
  headArmorId: null,
  shieldId: null,
  other: [],
  resolved: [],
};

export function resolveKit(
  items: string[],
  catalog: ReferenceCatalog,
): ResolvedKit {
  if (items.length === 0) return EMPTY_KIT;

  const weaponsByName = new Map<string, Weapon>();
  for (const w of catalog.weapons.weapons) {
    weaponsByName.set(w.name.toLowerCase(), w);
  }

  const armorByName = new Map<string, Armor>();
  for (const a of catalog.armor) {
    armorByName.set(a.name.toLowerCase(), a);
  }

  const result: ResolvedKit = {
    weaponIds: [],
    bodyArmorId: null,
    headArmorId: null,
    shieldId: null,
    other: [],
    resolved: [],
  };

  for (const raw of items) {
    const key = raw.toLowerCase();
    const weapon = weaponsByName.get(key);
    if (weapon) {
      result.weaponIds.push(weapon.id);
      result.resolved.push({ raw, kind: 'weapon', id: weapon.id });
      continue;
    }
    const armor = armorByName.get(key);
    if (armor) {
      switch (armor.slot) {
        case 'body':
          // Don't overwrite an already-equipped body slot. Demote later
          // entries to inventory so they're not lost.
          if (result.bodyArmorId == null) {
            result.bodyArmorId = armor.id;
            result.resolved.push({
              raw,
              kind: 'armor',
              id: armor.id,
              slot: 'body',
            });
          } else {
            result.other.push({ item_id: armor.id, quantity: 1 });
            result.resolved.push({ raw, kind: 'unmatched', id: armor.id });
          }
          break;
        case 'head':
          if (result.headArmorId == null) {
            result.headArmorId = armor.id;
            result.resolved.push({
              raw,
              kind: 'armor',
              id: armor.id,
              slot: 'head',
            });
          } else {
            result.other.push({ item_id: armor.id, quantity: 1 });
            result.resolved.push({ raw, kind: 'unmatched', id: armor.id });
          }
          break;
        case 'shield':
          if (result.shieldId == null) {
            result.shieldId = armor.id;
            result.resolved.push({
              raw,
              kind: 'armor',
              id: armor.id,
              slot: 'shield',
            });
          } else {
            result.other.push({ item_id: armor.id, quantity: 1 });
            result.resolved.push({ raw, kind: 'unmatched', id: armor.id });
          }
          break;
      }
      continue;
    }
    // Not in catalog (e.g. "Wares-Stone", "Thief's Toolkit", "Instrument").
    result.other.push({ item_id: raw, quantity: 1 });
    result.resolved.push({ raw, kind: 'unmatched' });
  }

  return result;
}

/** Roll 3D5 × 10 (range 30–150) for starting golda per rule §03 step 4. */
export function rollStartingMoney(): number {
  const r = (): number => Math.floor(Math.random() * 5) + 1;
  return (r() + r() + r()) * 10;
}
