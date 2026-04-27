import { describe, expect, it } from 'vitest';
import {
  indexTemplates,
  resolveMonsterTemplate,
  resolveNpcTemplate,
  resolveRyudeTemplate,
} from './resolve';
import type { MonsterTemplate } from '@/domain/monster';
import type { RyudeTemplate } from '@/domain/ryude';
import type { NpcTemplate } from '@/domain/npc';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

function mkMonster(id: string, name: string): MonsterTemplate {
  return {
    id,
    name,
    rank: 'C',
    source: 'test',
    reaction: 'Attack',
    damage_value: '1D5',
    movement_speed: 1,
    intelligence: 'Low',
    primary_habitat: 'test',
    encounter_rate: 0,
    number_encountered: 1,
    description: '',
  };
}

function mkRyude(id: string, name: string): RyudeTemplate {
  return {
    id,
    name,
    source: 'test',
    type: 'Footman',
    attributes: { spe: 5, pow: 5, arm: 5, bal: 5 },
    durability: 30,
    required_drive: 3,
    persona_rank: 'F',
    attunement_value: 5,
    ryude_rank: 'F',
    equipment: [],
    description: '',
  };
}

function mkNpc(id: string, name: string): NpcTemplate {
  return {
    archetype: 'simple',
    id,
    name,
    source: 'user',
    role: 'merchant',
    cha_modifier: 0,
    reaction_value: null,
    notable_skills: [],
    description: '',
  };
}

function mkCatalog(monsters: MonsterTemplate[], ryude: RyudeTemplate[]): ReferenceCatalog {
  return {
    classes: { classes: [] } as unknown as ReferenceCatalog['classes'],
    skills: { skills: [] } as unknown as ReferenceCatalog['skills'],
    weapons: { weapons: [] } as unknown as ReferenceCatalog['weapons'],
    armor: [],
    generalGoods: { goods: [] } as unknown as ReferenceCatalog['generalGoods'],
    beastiary: { monsters },
    ryudeUnits: { ryude_units: ryude },
    ryudeEquipment: {} as unknown as ReferenceCatalog['ryudeEquipment'],
    tables: {} as unknown as ReferenceCatalog['tables'],
    techniques: {
      wordCasting: {},
      numeticArts: {} as unknown as ReferenceCatalog['techniques']['numeticArts'],
      invocations: {} as unknown as ReferenceCatalog['techniques']['invocations'],
    },
  };
}

describe('resolveMonsterTemplate', () => {
  it('resolves from bundled when no overrides exist', () => {
    const catalog = mkCatalog([mkMonster('tusktooth', 'Tusktooth')], []);
    const r = resolveMonsterTemplate('tusktooth', catalog, new Map(), new Map());
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') {
      expect(r.source).toBe('bundled');
      expect(r.template.name).toBe('Tusktooth');
    }
  });

  it('vault overrides bundled with same id', () => {
    const catalog = mkCatalog([mkMonster('tusktooth', 'Bundled Tusktooth')], []);
    const vault = indexTemplates([mkMonster('tusktooth', 'Vault Tusktooth')]);
    const r = resolveMonsterTemplate('tusktooth', catalog, vault, new Map());
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') {
      expect(r.source).toBe('vault');
      expect(r.template.name).toBe('Vault Tusktooth');
    }
  });

  it('campaign overrides both vault and bundled', () => {
    const catalog = mkCatalog([mkMonster('tusktooth', 'Bundled')], []);
    const vault = indexTemplates([mkMonster('tusktooth', 'Vault')]);
    const campaign = indexTemplates([mkMonster('tusktooth', 'Campaign')]);
    const r = resolveMonsterTemplate('tusktooth', catalog, vault, campaign);
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') {
      expect(r.source).toBe('campaign');
      expect(r.template.name).toBe('Campaign');
    }
  });

  it('returns missing when no source has the id', () => {
    const catalog = mkCatalog([], []);
    const r = resolveMonsterTemplate('nonexistent', catalog, new Map(), new Map());
    expect(r.kind).toBe('missing');
    if (r.kind === 'missing') {
      expect(r.templateKind).toBe('monster');
      expect(r.templateId).toBe('nonexistent');
    }
  });

  it('handles null catalog (no bundled tier loaded yet)', () => {
    const vault = indexTemplates([mkMonster('custom', 'Custom Beast')]);
    const r = resolveMonsterTemplate('custom', null, vault, new Map());
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') expect(r.source).toBe('vault');
  });
});

describe('resolveRyudeTemplate', () => {
  it('campaign overrides bundled', () => {
    const catalog = mkCatalog([], [mkRyude('az-cude', 'Bundled Az-Cude')]);
    const campaign = indexTemplates([mkRyude('az-cude', 'Campaign Az-Cude')]);
    const r = resolveRyudeTemplate('az-cude', catalog, new Map(), campaign);
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') {
      expect(r.source).toBe('campaign');
      expect(r.template.name).toBe('Campaign Az-Cude');
    }
  });

  it('returns missing for unknown ryude id', () => {
    const catalog = mkCatalog([], [mkRyude('az-cude', 'Az-Cude')]);
    const r = resolveRyudeTemplate('mystery', catalog, new Map(), new Map());
    expect(r.kind).toBe('missing');
    if (r.kind === 'missing') expect(r.templateKind).toBe('ryude');
  });
});

describe('resolveNpcTemplate', () => {
  it('vault NPC resolves (no bundled tier)', () => {
    const vault = indexTemplates([mkNpc('tpl_npc_01', 'Bartender Saul')]);
    const r = resolveNpcTemplate('tpl_npc_01', vault, new Map());
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') expect(r.source).toBe('vault');
  });

  it('campaign NPC overrides vault', () => {
    const vault = indexTemplates([mkNpc('tpl_npc_01', 'Vault')]);
    const campaign = indexTemplates([mkNpc('tpl_npc_01', 'Campaign')]);
    const r = resolveNpcTemplate('tpl_npc_01', vault, campaign);
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') {
      expect(r.source).toBe('campaign');
      expect(r.template.name).toBe('Campaign');
    }
  });

  it('returns missing for unknown NPC id', () => {
    const r = resolveNpcTemplate('ghost', new Map(), new Map());
    expect(r.kind).toBe('missing');
  });
});

describe('indexTemplates', () => {
  it('builds a lookup Map keyed by id', () => {
    const m = indexTemplates([
      mkMonster('a', 'A'),
      mkMonster('b', 'B'),
    ]);
    expect(m.size).toBe(2);
    expect(m.get('a')?.name).toBe('A');
  });

  it('later entries override earlier (last write wins)', () => {
    const m = indexTemplates([
      mkMonster('a', 'First'),
      mkMonster('a', 'Second'),
    ]);
    expect(m.get('a')?.name).toBe('Second');
  });
});
