/**
 * Adapter: synthesize a `Character` view from a Full-Character NPC instance
 * (instance + template) so the existing character sheet can render it without
 * modification, and apply state-only edits back onto the NPC instance.
 *
 * Phase 4 polish (Track 3). Only the state slice round-trips: identity,
 * abilities, skills, equipment, techniques live on the template and are
 * shown read-only on the NPC sheet (the wrapper enforces this).
 */

import type { Character, CharacterState, CharacterStatus } from '@/domain/character';
import type { FullCharacterNpc } from '@/domain/npc';
import type {
  NpcInstance,
  NpcInstanceState,
  NpcInstanceStatus,
} from '@/domain/npc-instance';

/** NPC enum → Character enum. Lossy on physical/mental side; defaults to physical. */
function npcToCharacterStatus(s: NpcInstanceStatus): CharacterStatus {
  switch (s) {
    case 'fine':
      return 'fine';
    case 'wounded':
      return 'heavy-physical';
    case 'incapacitated':
      return 'incap-physical';
    case 'dead':
      return 'dead';
  }
}

/** Character enum → NPC enum. Collapses physical/mental into one. */
function characterToNpcStatus(s: CharacterStatus): NpcInstanceStatus {
  switch (s) {
    case 'fine':
      return 'fine';
    case 'heavy-physical':
    case 'heavy-mental':
      return 'wounded';
    case 'incap-physical':
    case 'incap-mental':
      return 'incapacitated';
    case 'dead':
    case 'insane':
      return 'dead';
  }
}

function npcStateToCharacterState(
  inst: NpcInstance,
  tpl: FullCharacterNpc,
): CharacterState {
  return {
    physical_damage: inst.state.current_physical_damage,
    mental_damage: inst.state.current_mental_damage,
    available_luc: inst.state.available_luc ?? tpl.initial_luc,
    status: npcToCharacterStatus(inst.state.status),
    status_override: inst.state.status_override,
    active_effects: inst.state.active_effects,
    last_recovery_tick: inst.state.last_recovery_tick,
    current_segment: inst.state.segment,
  };
}

/**
 * Synthesize a Character object from a Full-Character NPC instance + its
 * template. Identity / class / abilities / skills / equipment come from the
 * template; mutable state comes from the instance.
 */
export function npcInstanceToCharacter(
  inst: NpcInstance,
  tpl: FullCharacterNpc,
  campaignId: string,
): Character {
  return {
    schema_version: 1,
    id: inst.id,
    campaign_id: campaignId,
    name: inst.name,
    age: tpl.age,

    gender: tpl.gender,
    title: tpl.title,
    homeland: tpl.homeland,
    current_home: tpl.current_home,
    family_relationships: tpl.family_relationships,
    personality_notes: tpl.personality_notes,
    ryude_name: tpl.ryude_name,

    class_id: tpl.class_id,
    word_caster_gate: tpl.word_caster_gate,
    spiritualist_order: tpl.spiritualist_order,
    tradesfolk_profession: tpl.tradesfolk_profession,

    memory_points_spent: tpl.memory_points_spent,
    spiritualist_doctrine: tpl.spiritualist_doctrine,
    spiritualist_restrictions: tpl.spiritualist_restrictions,
    spiritualist_special_implements: tpl.spiritualist_special_implements,

    skill_package_id: tpl.skill_package_id,
    equipment_package_id: tpl.equipment_package_id,
    appearance_modifier: tpl.appearance_modifier,

    abilities: tpl.abilities,
    skills: tpl.skills,
    techniques: tpl.techniques,
    equipment: tpl.equipment,

    golda: tpl.golda,
    completion_bonus: inst.state.completion_bonus_pp ?? tpl.completion_bonus,
    luc_reserves: tpl.luc_reserves,
    initial_luc: tpl.initial_luc,

    state: npcStateToCharacterState(inst, tpl),

    portrait_path: inst.portrait_path,
    notes_path: inst.notes_path,
    created_at: inst.created_at,
    updated_at: inst.updated_at,
  };
}

/**
 * Inverse direction: given a Character that was synthesized from an NPC
 * instance and then mutated via the sheet, fold the mutable parts back onto
 * the NPC instance. Template-owned fields (identity, abilities, skills,
 * equipment, techniques) are intentionally ignored — the wrapper marks them
 * read-only on the sheet.
 */
export function applyCharacterStateToNpc(
  inst: NpcInstance,
  patched: Character,
): NpcInstance {
  const nextState: NpcInstanceState = {
    ...inst.state,
    current_physical_damage: patched.state.physical_damage,
    current_mental_damage: patched.state.mental_damage,
    status: characterToNpcStatus(patched.state.status),
    status_override: patched.state.status_override,
    active_effects: patched.state.active_effects,
    last_recovery_tick: patched.state.last_recovery_tick,
    segment: patched.state.current_segment,
    available_luc: patched.state.available_luc,
    completion_bonus_pp: patched.completion_bonus,
  };
  return {
    ...inst,
    name: patched.name,
    portrait_path: patched.portrait_path,
    notes_path: patched.notes_path,
    state: nextState,
    updated_at: new Date().toISOString(),
  };
}
