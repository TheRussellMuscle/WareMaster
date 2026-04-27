import { z } from 'zod';
import {
  BnModifierSchema,
  DamageValueSchema,
  WeaponCategorySchema,
  ArmorSlotSchema,
  ArmorClassSchema,
  RyudeArmorClassSchema,
  type Weapon,
  type Armor,
  type RyudeWeapon,
  type RyudeArmor,
} from './item';

const CustomItemBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price_golda: z.number().int().nonnegative().nullable().default(null),
  in_shop: z.boolean().default(true),
  is_unique: z.boolean().default(false),
  notes: z.string().default(''),
});

const CustomWeaponSchema = CustomItemBaseSchema.extend({
  kind: z.literal('weapon'),
  category: WeaponCategorySchema.optional(),
  hands: z.union([z.number().int(), z.string()]).optional(),
  critical_value: z.number().int().optional(),
  bn_modifier: BnModifierSchema.optional(),
  damage_value: DamageValueSchema.optional(),
  range_liets: z.number().optional(),
  reload_segments: z.number().int().optional(),
});
export type CustomWeapon = z.infer<typeof CustomWeaponSchema>;

const CustomArmorSchema = CustomItemBaseSchema.extend({
  kind: z.literal('armor'),
  slot: ArmorSlotSchema.optional(),
  armor_class: ArmorClassSchema.optional(),
  absorption: z.number().int().optional(),
  armor_modifier: z.number().int().optional(),
});
export type CustomArmor = z.infer<typeof CustomArmorSchema>;

const CustomGoodSchema = CustomItemBaseSchema.extend({
  kind: z.literal('good'),
});

const CustomRyudeWeaponSchema = CustomItemBaseSchema.extend({
  kind: z.literal('ryude-weapon'),
  category: z.enum(['swords', 'bludgeons', 'spears']).optional(),
  hands: z.union([z.number().int(), z.string()]).optional(),
  critical_value: z.number().int().optional(),
  bn_modifier: BnModifierSchema.optional(),
  damage_value: DamageValueSchema.optional(),
});
export type CustomRyudeWeapon = z.infer<typeof CustomRyudeWeaponSchema>;

const CustomRyudeArmorSchema = CustomItemBaseSchema.extend({
  kind: z.literal('ryude-armor'),
  armor_class: RyudeArmorClassSchema.optional(),
  arm_modifier: z.number().int().optional(),
  spe_modifier: z.number().int().optional(),
});
export type CustomRyudeArmor = z.infer<typeof CustomRyudeArmorSchema>;

export const CustomItemSchema = z.discriminatedUnion('kind', [
  CustomWeaponSchema,
  CustomArmorSchema,
  CustomGoodSchema,
  CustomRyudeWeaponSchema,
  CustomRyudeArmorSchema,
]);
export type CustomItem = z.infer<typeof CustomItemSchema>;

export function isCustomWeapon(item: CustomItem): item is CustomWeapon {
  return item.kind === 'weapon';
}

export function isCustomArmor(item: CustomItem): item is CustomArmor {
  return item.kind === 'armor';
}

/** Convert a custom weapon to the Weapon catalog shape the engine expects. */
export function customWeaponToWeapon(ci: CustomWeapon): Weapon {
  return {
    id: ci.id,
    name: ci.name,
    source: 'custom',
    category: ci.category ?? 'swords',
    hands: ci.hands ?? 1,
    critical_value: ci.critical_value ?? 0,
    bn_modifier: ci.bn_modifier ?? {},
    damage_value: ci.damage_value ?? {},
    price_golda: ci.price_golda ?? 0,
    range_liets: ci.range_liets,
    reload_segments: ci.reload_segments,
    notes: ci.notes || undefined,
  };
}

/** Convert a custom armor piece to the Armor catalog shape the engine expects. */
export function customArmorToArmor(ci: CustomArmor): Armor {
  return {
    id: ci.id,
    name: ci.name,
    source: 'custom',
    slot: ci.slot ?? 'body',
    armor_class: ci.armor_class,
    absorption: ci.absorption ?? 0,
    armor_modifier: ci.armor_modifier ?? 0,
    price_golda: ci.price_golda ?? 0,
    notes: ci.notes || undefined,
  };
}

export function isCustomRyudeWeapon(item: CustomItem): item is CustomRyudeWeapon {
  return item.kind === 'ryude-weapon';
}

export function isCustomRyudeArmor(item: CustomItem): item is CustomRyudeArmor {
  return item.kind === 'ryude-armor';
}

export function customRyudeWeaponToRyudeWeapon(ci: CustomRyudeWeapon): RyudeWeapon {
  return {
    id: ci.id,
    name: ci.name,
    source: 'custom',
    category: ci.category ?? 'swords',
    hands: ci.hands ?? 1,
    critical_value: ci.critical_value ?? 0,
    bn_modifier: ci.bn_modifier ?? {},
    damage_value: ci.damage_value ?? {},
    price_golda: ci.price_golda ?? 0,
  };
}

export function customRyudeArmorToRyudeArmor(ci: CustomRyudeArmor): RyudeArmor {
  return {
    id: ci.id,
    name: ci.name,
    source: 'custom',
    armor_class: ci.armor_class ?? 'partial',
    arm_modifier: ci.arm_modifier ?? 0,
    spe_modifier: ci.spe_modifier ?? 0,
    price_golda: ci.price_golda ?? 0,
    notes: ci.notes || undefined,
  };
}
