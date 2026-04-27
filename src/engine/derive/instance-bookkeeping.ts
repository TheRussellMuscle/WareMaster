/**
 * Rule-based bookkeeping helpers for monster / Ryude / NPC instances.
 *
 * Pure functions, no IO. Each helper cites its rule source so future-me
 * can verify against the rule book without re-reading PLAN.md.
 *
 * Phase 4 polish (Track 8): brings status auto-derivation, segment effect
 * ticking, Ryude operational thresholds, and attunement-state transitions
 * into the per-instance UI without depending on the (later-phase) clock or
 * combat tracker.
 */

import type { MonsterInstanceStatus } from '@/domain/monster-instance';
import type { RyudeAttunementState } from '@/domain/ryude-instance';
import type { ActionOutcome, CurrentSegment } from '@/domain/action-log';

export interface ActiveEffect {
  id: string;
  label: string;
  source?: string;
  expires_at_segment: number | null;
}

/**
 * Rule §09:28-30 + PLAN.md 322-326. Maps damage to one of the four monster
 * status enum values, taking the worse of physical and mental tracks.
 *
 * Thresholds (using `durability` as the resistance-modified Light tolerance):
 *   damage ≤ durability        → fine
 *   damage > durability        → wounded
 *   damage > 2 × durability    → incapacitated
 *   damage > 3 × durability    → dead
 *
 * Mental damage maps to the same enum (the monster schema collapses
 * incap-physical / incap-mental into one "incapacitated" — we surface the
 * worse of the two tracks).
 */
export function monsterDerivedStatus(
  physicalDamage: number,
  mentalDamage: number,
  durability: number,
): MonsterInstanceStatus {
  if (durability <= 0) return 'fine'; // pathological — template lacks durability
  const worst = Math.max(physicalDamage, mentalDamage);
  if (worst > durability * 3) return 'dead';
  if (worst > durability * 2) return 'incapacitated';
  if (worst > durability) return 'wounded';
  return 'fine';
}

/**
 * Resolves whether the WM's manual override should win over the auto-derived
 * status. Mirrors `effectiveStatus` from `status.ts` for characters.
 */
export function effectiveMonsterStatus(
  state: {
    status: MonsterInstanceStatus;
    status_override: boolean;
    current_physical_damage: number;
    current_mental_damage: number;
  },
  durability: number,
): MonsterInstanceStatus {
  if (state.status_override) return state.status;
  return monsterDerivedStatus(
    state.current_physical_damage,
    state.current_mental_damage,
    durability,
  );
}

export type RyudeOperationalStatus =
  | 'intact'
  | 'damaged-light'
  | 'damaged-heavy'
  | 'disabled'
  | 'destroyed';

/**
 * Rule §14:160 — Ryude operational state from durability ratio.
 *
 *   100%        → intact
 *   75% – 99%   → damaged-light
 *   25% – 74%   → damaged-heavy
 *   1% – 24%    → disabled
 *   0%          → destroyed
 */
export function ryudeOperationalStatus(
  current: number,
  max: number,
): RyudeOperationalStatus {
  if (max <= 0) return 'destroyed';
  if (current <= 0) return 'destroyed';
  const ratio = current / max;
  if (ratio >= 1) return 'intact';
  if (ratio >= 0.75) return 'damaged-light';
  if (ratio >= 0.25) return 'damaged-heavy';
  return 'disabled';
}

/**
 * Removes effects whose `expires_at_segment` is at or before `currentSegment`.
 * Effects with `expires_at_segment === null` (no expiry) are preserved.
 *
 * Returns the new state object (shallow-copied) plus the array of expired
 * effects so the UI can flash a toast naming what dropped.
 */
export function tickActiveEffects<S extends { active_effects: ActiveEffect[] }>(
  state: S,
  currentSegment: number,
): { state: S; expired: ActiveEffect[] } {
  const expired: ActiveEffect[] = [];
  const remaining: ActiveEffect[] = [];
  for (const eff of state.active_effects) {
    if (eff.expires_at_segment !== null && eff.expires_at_segment <= currentSegment) {
      expired.push(eff);
    } else {
      remaining.push(eff);
    }
  }
  return {
    state: { ...state, active_effects: remaining },
    expired,
  };
}

/**
 * End-of-segment housekeeping: increment the local segment counter, tick
 * effects against the *new* counter, and clear the per-segment IN/DN snapshot
 * so the WM has to re-roll IN/DN for the next segment.
 */
export function endSegment<
  S extends {
    active_effects: ActiveEffect[];
    current_segment_index: number;
    segment: CurrentSegment | null;
  },
>(state: S): { state: S; expired: ActiveEffect[] } {
  const nextIndex = state.current_segment_index + 1;
  const ticked = tickActiveEffects(
    { ...state, current_segment_index: nextIndex, segment: null },
    nextIndex,
  );
  return ticked;
}

/**
 * Rule §14:38-66 — Suggested next attunement state from a check outcome.
 *
 * Transitions:
 *   unattuned + success/perfect    → attuning
 *   unattuned + failure            → unattuned (no progress, may retry)
 *   unattuned + total-failure      → rejected
 *   attuning  + success            → attuning (continue, more checks needed)
 *   attuning  + perfect-success    → attuned
 *   attuning  + failure            → attuning
 *   attuning  + total-failure      → rejected
 *   attuned   + any                → attuned (already there)
 *   rejected  + any                → rejected (machine refuses; needs reset)
 *
 * Caller decides whether to apply — WM may want to narrate first.
 */
export function nextAttunementState(
  current: RyudeAttunementState,
  outcome: ActionOutcome,
): RyudeAttunementState {
  if (current === 'attuned') return 'attuned';
  if (current === 'rejected') return 'rejected';
  if (outcome === 'total-failure') return 'rejected';
  if (current === 'unattuned') {
    if (outcome === 'success' || outcome === 'perfect-success') return 'attuning';
    return 'unattuned';
  }
  // attuning
  if (outcome === 'perfect-success') return 'attuned';
  return 'attuning';
}
