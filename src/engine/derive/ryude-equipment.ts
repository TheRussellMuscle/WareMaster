import type { RyudeWeapon, RyudeArmor } from '@/domain/item';
import type { CustomItem } from '@/domain/custom-item';
import {
  isCustomRyudeWeapon,
  isCustomRyudeArmor,
  customRyudeWeaponToRyudeWeapon,
  customRyudeArmorToRyudeArmor,
} from '@/domain/custom-item';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export type ResolvedRyudeItem =
  | { kind: 'weapon'; item: RyudeWeapon }
  | { kind: 'armor'; item: RyudeArmor };

// Compatibility shim: early instances were saved with human-readable names
// before the template YAML was corrected to use catalog slug IDs.
const LEGACY_ITEM_IDS: Record<string, string> = {
  'Morning Star': 'ryude-morning-star',
  'Bastard sword': 'ryude-bastard-sword-2h',
  'Face guard': 'ryude-face-guard',
  'Gauntlets': 'ryude-gauntlets',
};

export function normalizeRyudeItemId(id: string): string {
  return LEGACY_ITEM_IDS[id] ?? id;
}

/** Resolve a Ryude equipment ID to its weapon or armor definition.
 *  Checks catalog weapons, then catalog armor, then custom items. */
export function resolveRyudeItem(
  id: string,
  catalog: ReferenceCatalog | null,
  customItems: CustomItem[],
): ResolvedRyudeItem | null {
  const nid = normalizeRyudeItemId(id);
  if (catalog) {
    const w = catalog.ryudeEquipment.ryude_weapons.find((x) => x.id === nid);
    if (w) return { kind: 'weapon', item: w };
    const a = catalog.ryudeEquipment.ryude_armor.find((x) => x.id === nid);
    if (a) return { kind: 'armor', item: a };
  }
  const ci = customItems.find((c) => c.id === nid);
  if (ci) {
    if (isCustomRyudeWeapon(ci)) return { kind: 'weapon', item: customRyudeWeaponToRyudeWeapon(ci) };
    if (isCustomRyudeArmor(ci)) return { kind: 'armor', item: customRyudeArmorToRyudeArmor(ci) };
  }
  return null;
}

/** Resolve all equipped armor pieces for a given set of equipped item IDs. */
export function equippedRyudeArmors(
  equippedItemIds: string[],
  catalog: ReferenceCatalog | null,
  customItems: CustomItem[],
): RyudeArmor[] {
  return equippedItemIds
    .map((id) => resolveRyudeItem(normalizeRyudeItemId(id), catalog, customItems))
    .filter((r): r is { kind: 'armor'; item: RyudeArmor } => r?.kind === 'armor')
    .map((r) => r.item);
}
