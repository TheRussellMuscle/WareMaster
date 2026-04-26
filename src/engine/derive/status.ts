/**
 * Auto-derives a character's status from current damage and durabilities.
 *
 * Source: rule §09 (damage stages):
 *   accumulated damage ≤ Durability       → Light (no penalty)
 *   accumulated damage > Durability        → Heavy
 *   accumulated damage > 2 × Durability    → Incapacitated
 *   accumulated damage ≥ 3 × Durability    → Dead (Physical) / Insane (Mental)
 *
 * "Durability" here is the resistance-modified value (rule §05: Resistance
 * adds to Light tolerance, which shifts the Light/Heavy boundary). All
 * subsequent thresholds (Heavy/Incap/Dead) use the same effective value;
 * matches what `DurabilityTracks` renders and what the tester's reference
 * spreadsheet uses.
 *
 * Pure: no IO, no React.
 */

import type { Character, CharacterStatus } from '@/domain/character';
import type { DerivedCombatValues } from './combat-values';

export function deriveStatus(
  character: Character,
  derived: Pick<DerivedCombatValues, 'physicalDurability' | 'mentalDurability'>,
): CharacterStatus {
  const phys = character.state.physical_damage;
  const ment = character.state.mental_damage;
  const pdur = derived.physicalDurability;
  const mdur = derived.mentalDurability;

  // Death / insanity take precedence (no recovery from these).
  if (phys >= pdur * 3) return 'dead';
  if (ment >= mdur * 3) return 'insane';

  // Incapacitation: physical takes precedence over mental for the status
  // string (the sheet shows both as separate banners regardless).
  if (phys > pdur * 2) return 'incap-physical';
  if (ment > mdur * 2) return 'incap-mental';

  if (phys > pdur) return 'heavy-physical';
  if (ment > mdur) return 'heavy-mental';

  return 'fine';
}

/**
 * Returns the status the sheet should show, honoring an explicit WM
 * override (`character.state.status_override === true`). When override is
 * active, the stored `status` value is returned verbatim; otherwise the
 * auto-derivation runs.
 */
export function effectiveStatus(
  character: Character,
  derived: Pick<DerivedCombatValues, 'physicalDurability' | 'mentalDurability'>,
): CharacterStatus {
  if (character.state.status_override) return character.state.status;
  return deriveStatus(character, derived);
}
