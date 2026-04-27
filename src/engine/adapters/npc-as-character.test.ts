import { describe, expect, it } from 'vitest';
import {
  applyCharacterStateToNpc,
  npcInstanceToCharacter,
} from './npc-as-character';
import type { FullCharacterNpc } from '@/domain/npc';
import type { NpcInstance } from '@/domain/npc-instance';

const tpl = (over: Partial<FullCharacterNpc> = {}): FullCharacterNpc =>
  ({
    archetype: 'full-character',
    schema_version: 1,
    id: 'tpl_npc_001',
    name: 'Sir Aldric',
    age: 35,
    gender: 'male',
    title: 'Knight',
    homeland: 'Hightower',
    current_home: 'Crown Keep',
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
    appearance_modifier: 1,
    abilities: { SEN: 9, AGI: 11, WIL: 7, CON: 12, CHA: 8, LUC: 6 },
    skills: [{ skill_id: 'longsword', level: 3, pp: 0 }],
    techniques: [],
    equipment: {
      weapons: ['longsword'],
      body_armor: null,
      head_armor: null,
      shield: null,
      other: [],
      bastard_sword_grip: '1H',
    },
    golda: 100,
    completion_bonus: 0,
    luc_reserves: 0,
    initial_luc: 6,
    portrait_path: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  }) as FullCharacterNpc;

const inst = (over: Partial<NpcInstance> = {}): NpcInstance =>
  ({
    schema_version: 1,
    id: 'npc_001',
    campaign_id: 'cam_001',
    template_id: 'tpl_npc_001',
    name: 'Sir Aldric (instance)',
    overrides: {},
    state: {
      current_physical_damage: 5,
      current_mental_damage: 0,
      status: 'fine',
      status_override: false,
      active_effects: [],
      last_recovery_tick: 0,
      location: 'Crown Keep',
      segment: null,
      current_segment_index: 0,
    },
    portrait_path: null,
    notes_path: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  }) as NpcInstance;

describe('npcInstanceToCharacter', () => {
  it('id, campaign_id, name come from instance + caller', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_999');
    expect(c.id).toBe('npc_001');
    expect(c.campaign_id).toBe('cam_999');
    expect(c.name).toBe('Sir Aldric (instance)');
  });

  it('class / abilities / skills come from template', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    expect(c.class_id).toBe('warrior');
    expect(c.abilities.AGI).toBe(11);
    expect(c.skills).toHaveLength(1);
  });

  it('state mapped from instance: damage, status, segment', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    expect(c.state.physical_damage).toBe(5);
    expect(c.state.mental_damage).toBe(0);
    expect(c.state.status).toBe('fine');
    expect(c.state.current_segment).toBeNull();
  });

  it('available_luc defaults to template initial_luc when missing', () => {
    const c = npcInstanceToCharacter(inst(), tpl({ initial_luc: 6 }), 'cam_001');
    expect(c.state.available_luc).toBe(6);
  });

  it('available_luc uses instance value when set', () => {
    const i = inst();
    i.state.available_luc = 2;
    const c = npcInstanceToCharacter(i, tpl(), 'cam_001');
    expect(c.state.available_luc).toBe(2);
  });

  it('NPC wounded → character heavy-physical', () => {
    const i = inst();
    i.state.status = 'wounded';
    const c = npcInstanceToCharacter(i, tpl(), 'cam_001');
    expect(c.state.status).toBe('heavy-physical');
  });

  it('NPC dead → character dead', () => {
    const i = inst();
    i.state.status = 'dead';
    const c = npcInstanceToCharacter(i, tpl(), 'cam_001');
    expect(c.state.status).toBe('dead');
  });
});

describe('applyCharacterStateToNpc', () => {
  it('round-trips state.physical_damage', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    c.state.physical_damage = 12;
    const next = applyCharacterStateToNpc(inst(), c);
    expect(next.state.current_physical_damage).toBe(12);
  });

  it('round-trips available_luc spend', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    c.state.available_luc = 1;
    const next = applyCharacterStateToNpc(inst(), c);
    expect(next.state.available_luc).toBe(1);
  });

  it('character heavy-mental → npc wounded', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    c.state.status = 'heavy-mental';
    const next = applyCharacterStateToNpc(inst(), c);
    expect(next.state.status).toBe('wounded');
  });

  it('character insane → npc dead', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    c.state.status = 'insane';
    const next = applyCharacterStateToNpc(inst(), c);
    expect(next.state.status).toBe('dead');
  });

  it('preserves location and other instance-only state fields', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    c.state.physical_damage = 2;
    const next = applyCharacterStateToNpc(inst(), c);
    expect(next.state.location).toBe('Crown Keep');
    expect(next.state.current_segment_index).toBe(0);
  });

  it('updates updated_at', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    const next = applyCharacterStateToNpc(inst(), c);
    expect(next.updated_at).not.toBe(inst().updated_at);
  });

  it('name written back from character to instance', () => {
    const c = npcInstanceToCharacter(inst(), tpl(), 'cam_001');
    c.name = 'Sir Aldric the Renamed';
    const next = applyCharacterStateToNpc(inst(), c);
    expect(next.name).toBe('Sir Aldric the Renamed');
  });
});
