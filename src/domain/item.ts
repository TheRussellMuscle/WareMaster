import { z } from 'zod';
import { IdSchema } from './ids';

/** A weapon's BN modifier varies by attack stance. null = stance unavailable. */
const BnModifierSchema = z.object({
  melee: z.number().nullable().optional(),
  charge: z.number().nullable().optional(),
  range: z.number().nullable().optional(),
});

/** Damage values are dice formulas as strings (e.g. "1D10+3", "2D5+5"). */
const DamageValueSchema = z.object({
  melee: z.string().nullable().optional(),
  ranged: z.string().nullable().optional(),
});

export const WeaponCategorySchema = z.enum([
  'daggers',
  'swords',
  'bludgeons',
  'spears',
  'slings',
  'bows',
  'crossbows',
]);
export type WeaponCategory = z.infer<typeof WeaponCategorySchema>;

export const WeaponSchema = z.object({
  id: IdSchema,
  name: z.string(),
  source: z.string(),
  category: WeaponCategorySchema,
  hands: z.union([z.number().int(), z.string()]),
  critical_value: z.number().int(),
  bn_modifier: BnModifierSchema,
  damage_value: DamageValueSchema,
  price_golda: z.union([z.number(), z.string()]),
  range_liets: z.number().optional(),
  reload_segments: z.number().int().optional(),
  notes: z.string().optional(),
});
export type Weapon = z.infer<typeof WeaponSchema>;

export const AmmunitionSchema = z.object({
  id: IdSchema,
  name: z.string(),
  source: z.string(),
  bundle: z.string(),
  note: z.string().optional(),
});
export type Ammunition = z.infer<typeof AmmunitionSchema>;

export const WeaponsFileSchema = z.object({
  weapons: z.array(WeaponSchema),
  ammunition: z.array(AmmunitionSchema).optional(),
});
export type WeaponsFile = z.infer<typeof WeaponsFileSchema>;

export const ArmorSlotSchema = z.enum(['body', 'head', 'shield']);
export type ArmorSlot = z.infer<typeof ArmorSlotSchema>;
export const ArmorClassSchema = z.enum(['partial', 'full']);

export const ArmorSchema = z.object({
  id: IdSchema,
  name: z.string(),
  source: z.string(),
  slot: ArmorSlotSchema,
  armor_class: ArmorClassSchema.optional(),
  absorption: z.number().int(),
  armor_modifier: z.number().int(),
  price_golda: z.number().int(),
  notes: z.string().optional(),
});
export type Armor = z.infer<typeof ArmorSchema>;

export const ArmorFileSchema = z.object({
  armor: z.array(ArmorSchema),
});

const StarterKitItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
  notes: z.string().optional(),
});

const StarterKitSchema = z.object({
  description: z.string(),
  items: z.array(StarterKitItemSchema),
});

export const GeneralGoodSchema = z.object({
  id: IdSchema,
  name: z.string(),
  source: z.string(),
  category: z.string(),
  price_golda: z.union([z.number(), z.string()]),
  notes: z.string().optional(),
});
export type GeneralGood = z.infer<typeof GeneralGoodSchema>;

export const GeneralGoodsFileSchema = z.object({
  starter_kit: StarterKitSchema,
  goods: z.array(GeneralGoodSchema),
});
export type GeneralGoodsFile = z.infer<typeof GeneralGoodsFileSchema>;

/* ---------------- Ryude weapons + armor ---------------- */

export const RyudeWeaponSchema = z.object({
  id: IdSchema,
  name: z.string(),
  source: z.string(),
  category: z.enum(['swords', 'bludgeons', 'spears']),
  hands: z.union([z.number().int(), z.string()]),
  critical_value: z.number().int(),
  bn_modifier: BnModifierSchema,
  damage_value: DamageValueSchema,
  price_golda: z.number().int(),
});
export type RyudeWeapon = z.infer<typeof RyudeWeaponSchema>;

export const RyudeArmorClassSchema = z.enum(['partial', 'shield']);

export const RyudeArmorSchema = z.object({
  id: IdSchema,
  name: z.string(),
  source: z.string(),
  armor_class: RyudeArmorClassSchema,
  arm_modifier: z.number().int(),
  spe_modifier: z.number().int(),
  price_golda: z.number().int(),
  notes: z.string().optional(),
});
export type RyudeArmor = z.infer<typeof RyudeArmorSchema>;

export const RyudeEquipmentFileSchema = z.object({
  ryude_weapons: z.array(RyudeWeaponSchema),
  ryude_armor: z.array(RyudeArmorSchema),
});
export type RyudeEquipmentFile = z.infer<typeof RyudeEquipmentFileSchema>;
