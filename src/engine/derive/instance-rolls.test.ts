import { describe, expect, it } from 'vitest';
import {
  abilityBaseValue,
  effectiveRyudeAttribute,
  monsterAbilityRoll,
  monsterDamageFormula,
  ryudeAttackContext,
  ryudeAttunementContext,
  ryudeDriveModifier,
  ryudeOperatorRoll,
  simpleNpcSkillContext,
} from './instance-rolls';
import type { MonsterTemplate } from '@/domain/monster';
import type { MonsterInstance } from '@/domain/monster-instance';
import type { RyudeTemplate } from '@/domain/ryude';
import type { RyudeInstance } from '@/domain/ryude-instance';
import type { Character } from '@/domain/character';
import type { SimpleNpc } from '@/domain/npc';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { RyudeWeapon } from '@/domain/item';

const monster = (over: Partial<MonsterTemplate> = {}): MonsterTemplate => ({
  id: 'tusktooth',
  name: 'Tusktooth',
  rank: 'C',
  source: 'Playkit',
  reaction: 'Attack',
  damage_value: '1D5+2',
  movement_speed: 4,
  intelligence: 'Low',
  primary_habitat: 'forest',
  encounter_rate: 1,
  number_encountered: '1D5',
  description: '',
  base_sen: 6,
  base_agi: 5,
  base_con: 7,
  base_wil: 4,
  base_cha: 2,
  ...over,
});

const monsterInstance = (over: Partial<MonsterInstance> = {}): MonsterInstance =>
  ({
    schema_version: 1,
    id: 'mon_001',
    campaign_id: 'cam_001',
    template_id: 'tusktooth',
    name: 'Tusktooth A',
    overrides: {},
    state: {
      current_physical_damage: 0,
      current_mental_damage: 0,
      status: 'fine',
      status_override: false,
      active_effects: [],
      last_recovery_tick: 0,
      location: '',
      segment: null,
      current_segment_index: 0,
    },
    portrait_path: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  }) as MonsterInstance;

describe('monsterAbilityRoll', () => {
  it('returns base_<ability> against character target', () => {
    const r = monsterAbilityRoll(monster(), monsterInstance(), 'agi', 'character');
    expect(r.base).toBe(5);
    expect(r.label).toContain('AGI');
    expect(r.breakdown[0].value).toBe(5);
  });

  it('falls back to character base when no _vs_ryude variant set', () => {
    const r = monsterAbilityRoll(monster(), monsterInstance(), 'agi', 'ryude');
    expect(r.base).toBe(5);
    expect(r.label).toContain('vs Ryude');
  });

  it('uses base_<ability>_vs_ryude when present', () => {
    const tpl = monster({ base_agi: 5, base_agi_vs_ryude: 9 });
    const r = monsterAbilityRoll(tpl, monsterInstance(), 'agi', 'ryude');
    expect(r.base).toBe(9);
  });

  it('uses cha_modifier_vs_ryude for CHA against Ryude', () => {
    const tpl = monster({ base_cha: 2, cha_modifier_vs_ryude: 7 });
    const r = monsterAbilityRoll(tpl, monsterInstance(), 'cha', 'ryude');
    expect(r.base).toBe(7);
  });

  it('handles null ability values (Skeleton CON case)', () => {
    const tpl = monster({ base_con: null });
    const r = monsterAbilityRoll(tpl, monsterInstance(), 'con', 'character');
    expect(r.base).toBe(0);
  });
});

describe('monsterDamageFormula', () => {
  it('returns base damage_value vs character', () => {
    const r = monsterDamageFormula(monster(), monsterInstance(), 'character');
    expect(r.formula).toBe('1D5+2');
  });

  it('uses damage_value_vs_ryude when present', () => {
    const tpl = monster({ damage_value_vs_ryude: '5D5+80' });
    const r = monsterDamageFormula(tpl, monsterInstance(), 'ryude');
    expect(r.formula).toBe('5D5+80');
  });

  it('applies vs-Ryude multiplier when only multiplier defined', () => {
    const tpl = monster({
      damage_value: '1D10',
      damage_value_vs_ryude_multiplier: 2,
    });
    const r = monsterDamageFormula(tpl, monsterInstance(), 'ryude');
    expect(r.formula).toBe('1D10 ×2');
  });

  it('override beats template', () => {
    const inst = monsterInstance({ overrides: { damage_value: '99' } });
    const r = monsterDamageFormula(monster(), inst, 'character');
    expect(r.formula).toBe('99');
  });
});

/* ----- Ryude ----- */

const ryudeTpl = (over: Partial<RyudeTemplate> = {}): RyudeTemplate => ({
  id: 'maltu-ragorsu',
  name: 'Maltu-Ragorsu',
  source: 'Playkit',
  type: 'Courser',
  attributes: { spe: 8, pow: 6, arm: 5, bal: 7 },
  durability: 60,
  required_drive: 3,
  persona_rank: 'B',
  attunement_value: 12,
  ryude_rank: 'B',
  equipment: ['ryude-longsword'],
  description: '',
  ...over,
});

const ryudeInst = (over: Partial<RyudeInstance> = {}): RyudeInstance =>
  ({
    schema_version: 1,
    id: 'ryu_001',
    campaign_id: 'cam_001',
    template_id: 'maltu-ragorsu',
    name: 'Pike Maltu',
    equipped_operator: { kind: 'character', id: 'pc_001' },
    overrides: {},
    state: {
      current_unit_durability: 60,
      attribute_damage: { spe: 0, pow: 0, arm: 0, bal: 0 },
      attunement_state: 'attuned',
      repair_queue: [],
      last_recovery_tick: 0,
      location: '',
      segment: null,
      current_segment_index: 0,
    },
    portrait_path: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  }) as RyudeInstance;

const character = (over: Partial<Character> = {}): Character =>
  ({
    schema_version: 1,
    id: 'pc_001',
    campaign_id: 'cam_001',
    name: 'Pike',
    age: 22,
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
    skill_package_id: 'pkg-warrior',
    equipment_package_id: null,
    appearance_modifier: 0,
    abilities: { SEN: 9, AGI: 12, WIL: 6, CON: 9, CHA: 5, LUC: 8 },
    skills: [
      { skill_id: 'drive', level: 4, pp: 0 },
      { skill_id: 'ryude-longsword', level: 2, pp: 0 },
    ],
    techniques: [],
    equipment: {
      weapons: [],
      body_armor: null,
      head_armor: null,
      shield: null,
      other: [],
      bastard_sword_grip: '1H',
    },
    golda: 0,
    completion_bonus: 0,
    luc_reserves: 0,
    initial_luc: 8,
    state: {
      physical_damage: 0,
      mental_damage: 0,
      available_luc: 8,
      status: 'fine',
      status_override: false,
      active_effects: [],
      last_recovery_tick: 0,
      current_segment: null,
    },
    portrait_path: null,
    notes_path: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  }) as Character;

describe('abilityBaseValue', () => {
  it('floors AGI 12 to 4', () => {
    expect(abilityBaseValue(12)).toBe(4);
  });
  it('floors AGI 11 to 3', () => {
    expect(abilityBaseValue(11)).toBe(3);
  });
});

describe('ryudeDriveModifier', () => {
  it('drive 4 - required 3 = +1', () => {
    expect(ryudeDriveModifier(ryudeTpl(), character())).toBe(1);
  });
  it('untrained operator returns -required', () => {
    const op = character({ skills: [] });
    expect(ryudeDriveModifier(ryudeTpl(), op)).toBe(-3);
  });
});

describe('effectiveRyudeAttribute', () => {
  it('subtracts attribute damage', () => {
    const inst = ryudeInst({
      state: {
        ...ryudeInst().state,
        attribute_damage: { spe: 2, pow: 0, arm: 1, bal: 0 },
      },
    });
    expect(effectiveRyudeAttribute(ryudeTpl(), inst, 'spe')).toBe(6); // 8 - 2
    expect(effectiveRyudeAttribute(ryudeTpl(), inst, 'arm')).toBe(4); // 5 - 1
  });
});

describe('ryudeOperatorRoll', () => {
  it('builds breakdown lines', () => {
    const r = ryudeOperatorRoll(ryudeTpl(), ryudeInst(), character());
    // Operator AGI 12 → base 4; SPE 8; Drive Mod +1
    expect(r.base).toBe(4);
    expect(r.modifier).toBe(9); // 8 + 1
    expect(r.breakdown.map((b) => b.label)).toEqual([
      'Operator AGI Base (Pike)',
      'Ryude SPE',
      'Drive Modifier',
    ]);
    expect(r.breakdown[1].value).toBe(8);
  });

  it('reflects attribute damage in SPE line', () => {
    const inst = ryudeInst({
      state: {
        ...ryudeInst().state,
        attribute_damage: { spe: 3, pow: 0, arm: 0, bal: 0 },
      },
    });
    const r = ryudeOperatorRoll(ryudeTpl(), inst, character());
    expect(r.breakdown[1].value).toBe(5); // 8 - 3
  });
});

describe('ryudeAttunementContext', () => {
  it('returns attunement_value + drive modifier + condition string', () => {
    const ctx = ryudeAttunementContext(ryudeTpl(), ryudeInst(), character());
    expect(ctx.attunementValue).toBe(12);
    expect(ctx.driveModifier).toBe(1);
    expect(ctx.successCondition).toBe('1D10 − 1 ≤ 12');
  });
});

describe('ryudeAttackContext', () => {
  const longsword: RyudeWeapon = {
    id: 'ryude-longsword',
    name: 'Ryude Longsword',
    source: 'Playkit',
    category: 'swords',
    hands: 1,
    critical_value: 8,
    bn_modifier: { melee: 0, charge: -2, range: null },
    damage_value: { melee: '1D10', ranged: null },
    price_golda: 250,
  };

  it('vs character → ×10 multiplier', () => {
    const ctx = ryudeAttackContext(
      ryudeTpl(),
      ryudeInst(),
      character(),
      longsword,
      'character',
    );
    expect(ctx.vsHumanMultiplier).toBe(10);
    expect(ctx.damageFormula).toBe('1D10');
  });

  it('vs ryude → ×1 multiplier', () => {
    const ctx = ryudeAttackContext(
      ryudeTpl(),
      ryudeInst(),
      character(),
      longsword,
      'ryude',
    );
    expect(ctx.vsHumanMultiplier).toBe(1);
  });

  it('weaponBnModifier folds in weapon BN + Ryude SPE + Drive Mod', () => {
    const ctx = ryudeAttackContext(
      ryudeTpl(),
      ryudeInst(),
      character(),
      longsword,
      'character',
    );
    expect(ctx.weaponBnModifier).toBe(0 + 8 + 1); // melee bn 0, SPE 8, Drive +1
    expect(ctx.weaponSkillLevel).toBe(2);
    expect(ctx.criticalValue).toBe(8);
  });
});

/* ----- Simple NPC ----- */

const skillCatalog = (): ReferenceCatalog =>
  ({
    skills: {
      skills: [
        { id: 'negotiation', name: 'Negotiation', category: 'social', attribute: 'CHA', source: '' },
        { id: 'appraise', name: 'Appraise', category: 'general', attribute: 'SEN', source: '' },
        { id: 'word-casting', name: 'Word-Casting', category: 'specialized', attribute: null, source: '' },
      ],
    },
  }) as unknown as ReferenceCatalog;

const simple = (over: Partial<SimpleNpc> = {}): SimpleNpc =>
  ({
    archetype: 'simple',
    id: 'tpl_npc_001',
    name: 'Merchant Hara',
    source: 'user',
    role: 'merchant',
    cha_modifier: 3,
    reaction_value: null,
    notable_skills: [
      { skill_id: 'negotiation', level: 3 },
      { skill_id: 'appraise', level: 2 },
    ],
    description: '',
    ...over,
  }) as SimpleNpc;

describe('simpleNpcSkillContext', () => {
  it('CHA-governed skill auto-fills baseAttributeValue from cha_modifier', () => {
    const ctx = simpleNpcSkillContext(simple(), 'negotiation', skillCatalog());
    expect(ctx.level).toBe(3);
    expect(ctx.governingAttribute).toBe('CHA');
    expect(ctx.baseAttributeValue).toBe(3);
  });

  it('non-CHA skill leaves baseAttributeValue null (WM enters at roll time)', () => {
    const ctx = simpleNpcSkillContext(simple(), 'appraise', skillCatalog());
    expect(ctx.governingAttribute).toBe('SEN');
    expect(ctx.baseAttributeValue).toBeNull();
  });

  it('specialized skill (no attribute) → null governing', () => {
    const ctx = simpleNpcSkillContext(simple(), 'word-casting', skillCatalog());
    expect(ctx.governingAttribute).toBeNull();
  });

  it('unknown skill → level 0, label falls back to id', () => {
    const ctx = simpleNpcSkillContext(simple(), 'unknown-skill', skillCatalog());
    expect(ctx.level).toBe(0);
    expect(ctx.label).toContain('unknown-skill');
  });
});
