import { describe, expect, it } from 'vitest';
import {
  equipItem,
  unequipItem,
  dropInventoryItem,
  sellInventoryItem,
  purchaseItem,
  setBastardGrip,
} from './apply';
import type { Character } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

function mkCharacter(over: Partial<Character> = {}): Character {
  return {
    schema_version: 1,
    id: 'cha_test',
    campaign_id: 'cmp_test',
    name: 'Test',
    age: null,
    gender: '',
    title: '',
    homeland: '',
    current_home: '',
    family_relationships: '',
    personality_notes: '',
    ryude_name: '',
    class_id: 'warrior',
    memory_points_spent: 0,
    spiritualist_doctrine: '',
    spiritualist_restrictions: '',
    spiritualist_special_implements: '',
    skill_package_id: 'battler',
    equipment_package_id: null,
    appearance_modifier: 0,
    abilities: { SEN: 9, AGI: 9, WIL: 9, CON: 10, CHA: 9, LUC: 9 },
    skills: [],
    techniques: [],
    equipment: {
      weapons: [],
      body_armor: null,
      head_armor: null,
      shield: null,
      other: [],
      bastard_sword_grip: '1H',
    },
    golda: 100,
    completion_bonus: 0,
    luc_reserves: 0,
    initial_luc: 9,
    state: {
      physical_damage: 0,
      mental_damage: 0,
      available_luc: 9,
      status: 'fine',
      status_override: false,
      active_effects: [],
      last_recovery_tick: 0,
      current_segment: null,
    },
    portrait_path: null,
    notes_path: null,
    created_at: '',
    updated_at: '',
    ...over,
  };
}

const catalog: ReferenceCatalog = {
  classes: { classes: [] },
  skills: { skills: [] },
  weapons: {
    weapons: [
      {
        id: 'longsword',
        name: 'Longsword',
        source: 't',
        category: 'swords',
        hands: 1,
        critical_value: 8,
        bn_modifier: { melee: 0, charge: -2, range: null },
        damage_value: { melee: '1D10', ranged: null },
        price_golda: 25,
      },
      {
        id: 'greatsword',
        name: 'Greatsword',
        source: 't',
        category: 'swords',
        hands: 2,
        critical_value: 8,
        bn_modifier: { melee: -5, charge: -10, range: null },
        damage_value: { melee: '1D10+10', ranged: null },
        price_golda: 50,
      },
      {
        id: 'dagger',
        name: 'Dagger',
        source: 't',
        category: 'daggers',
        hands: 1,
        critical_value: 8,
        bn_modifier: { melee: 3, charge: 0, range: 1 },
        damage_value: { melee: '1D5-1', ranged: '1D5-2' },
        price_golda: 10,
      },
      {
        id: 'bastard-sword',
        name: 'Bastard Sword',
        source: 't',
        category: 'swords',
        hands: '1 or 2',
        critical_value: 8,
        bn_modifier: { melee: -2, charge: -4, range: null },
        damage_value: { melee: '1D10+3(5)', ranged: null },
        price_golda: 35,
      },
    ],
  },
  armor: [
    {
      id: 'lamellar',
      name: 'Lamellar Armor',
      source: 't',
      slot: 'body',
      absorption: 3,
      armor_modifier: -1,
      price_golda: 60,
    },
    {
      id: 'heater',
      name: 'Heater Shield',
      source: 't',
      slot: 'shield',
      absorption: 1,
      armor_modifier: 0,
      price_golda: 30,
    },
  ],
  generalGoods: {
    starter_kit: { description: 't', items: [] },
    goods: [
      {
        id: 'rope',
        name: 'Hemp Rope',
        source: 't',
        category: 'gear',
        price_golda: 5,
      },
    ],
  },
  beastiary: { monsters: [] },
  ryudeUnits: { ryude_units: [] },
  ryudeEquipment: { ryude_weapons: [], ryude_armor: [] },
  tables: {} as ReferenceCatalog['tables'],
  techniques: {
    wordCasting: {},
    numeticArts: { discipline: 'numetic-arts', techniques: [] },
    invocations: { discipline: 'invocation', techniques: [] },
  },
};

describe('equipItem', () => {
  it('routes a weapon from inventory into weapons[]', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        other: [{ item_id: 'longsword', quantity: 1 }],
      },
    });
    const r = equipItem(c, 'longsword', catalog);
    expect(r.equipment.weapons).toContain('longsword');
    expect(r.equipment.other).toEqual([]);
  });

  it('routes body armor into the body slot', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        other: [{ item_id: 'lamellar', quantity: 1 }],
      },
    });
    const r = equipItem(c, 'lamellar', catalog);
    expect(r.equipment.body_armor).toBe('lamellar');
    expect(r.equipment.other).toEqual([]);
  });

  it('displaces an existing slot item back to inventory', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        body_armor: 'lamellar',
        other: [{ item_id: 'lamellar', quantity: 1 }],
      },
    });
    const r = equipItem(c, 'lamellar', catalog);
    expect(r.equipment.body_armor).toBe('lamellar');
    // The previously equipped item moved to inventory; quantity stacks.
    expect(r.equipment.other).toEqual([{ item_id: 'lamellar', quantity: 1 }]);
    expect(r.displaced.length).toBe(1);
  });

  it('auto-displaces shield when equipping a 2H weapon', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        shield: 'heater',
        other: [{ item_id: 'greatsword', quantity: 1 }],
      },
    });
    const r = equipItem(c, 'greatsword', catalog);
    expect(r.equipment.weapons).toContain('greatsword');
    expect(r.equipment.shield).toBeNull();
    expect(r.equipment.other.find((i) => i.item_id === 'heater')).toBeTruthy();
    expect(r.conflicts.length).toBeGreaterThan(0);
  });

  it('rejects equipping a general good', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        other: [{ item_id: 'rope', quantity: 1 }],
      },
    });
    const r = equipItem(c, 'rope', catalog);
    expect(r.equipment).toBe(c.equipment); // unchanged
    expect(r.conflicts.length).toBeGreaterThan(0);
  });
});

describe('unequipItem', () => {
  it('moves an equipped weapon back to inventory', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        weapons: ['longsword'],
      },
    });
    const r = unequipItem(c, { kind: 'weapon', index: 0 });
    expect(r.equipment.weapons).toEqual([]);
    expect(r.equipment.other).toEqual([{ item_id: 'longsword', quantity: 1 }]);
  });

  it('moves body armor back to inventory', () => {
    const c = mkCharacter({
      equipment: { ...mkCharacter().equipment, body_armor: 'lamellar' },
    });
    const r = unequipItem(c, { kind: 'body' });
    expect(r.equipment.body_armor).toBeNull();
    expect(r.equipment.other).toEqual([{ item_id: 'lamellar', quantity: 1 }]);
  });
});

describe('sellInventoryItem', () => {
  it('refunds 50% (floored) of catalog price', () => {
    const c = mkCharacter({
      golda: 0,
      equipment: {
        ...mkCharacter().equipment,
        other: [{ item_id: 'dagger', quantity: 1 }],
      },
    });
    const r = sellInventoryItem(c, 'dagger', catalog);
    expect(r.golda).toBe(5); // floor(10/2)
    expect(r.equipment.other).toEqual([]);
  });

  it('does nothing when the item lacks a numeric price', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        other: [{ item_id: 'unknown-item', quantity: 1 }],
      },
    });
    const r = sellInventoryItem(c, 'unknown-item', catalog);
    expect(r.golda).toBe(c.golda);
    expect(r.refund).toBe(0);
  });
});

describe('purchaseItem', () => {
  it('subtracts cost and adds to inventory', () => {
    const c = mkCharacter({ golda: 100 });
    const r = purchaseItem(c, 'longsword', 1, catalog);
    expect(r.error).toBeUndefined();
    expect(r.golda).toBe(75);
    expect(r.equipment.other).toEqual([
      { item_id: 'longsword', quantity: 1 },
    ]);
  });

  it('rejects when the price exceeds available golda', () => {
    const c = mkCharacter({ golda: 10 });
    const r = purchaseItem(c, 'longsword', 1, catalog);
    expect(r.error).toMatch(/more golda/);
    expect(r.equipment).toBe(c.equipment);
  });

  it('handles bulk purchase quantity', () => {
    const c = mkCharacter({ golda: 30 });
    const r = purchaseItem(c, 'rope', 5, catalog);
    expect(r.error).toBeUndefined();
    expect(r.golda).toBe(5);
    expect(r.equipment.other).toEqual([{ item_id: 'rope', quantity: 5 }]);
  });
});

describe('dropInventoryItem', () => {
  it('removes the item without affecting golda', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        other: [{ item_id: 'dagger', quantity: 2 }],
      },
    });
    const r = dropInventoryItem(c, 'dagger');
    expect(r.equipment.other).toEqual([{ item_id: 'dagger', quantity: 1 }]);
  });
});

describe('setBastardGrip', () => {
  it('toggles grip without conflict when no shield', () => {
    const c = mkCharacter({
      equipment: { ...mkCharacter().equipment, weapons: ['bastard-sword'] },
    });
    const r = setBastardGrip(c, '2H', catalog);
    expect(r.equipment.bastard_sword_grip).toBe('2H');
    expect(r.conflicts).toEqual([]);
  });

  it('flags shield conflict when switching to 2H with shield equipped', () => {
    const c = mkCharacter({
      equipment: {
        ...mkCharacter().equipment,
        weapons: ['bastard-sword'],
        shield: 'heater',
      },
    });
    const r = setBastardGrip(c, '2H', catalog);
    expect(r.equipment.bastard_sword_grip).toBe('2H');
    expect(r.conflicts.length).toBeGreaterThan(0);
  });
});
