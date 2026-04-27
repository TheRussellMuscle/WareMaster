import { describe, expect, it } from 'vitest';
import {
  effectiveMonsterStatus,
  endSegment,
  monsterDerivedStatus,
  nextAttunementState,
  ryudeOperationalStatus,
  tickActiveEffects,
  type ActiveEffect,
} from './instance-bookkeeping';
import type { CurrentSegment } from '@/domain/action-log';

describe('monsterDerivedStatus', () => {
  it('returns fine when both tracks at or below durability', () => {
    expect(monsterDerivedStatus(0, 0, 10)).toBe('fine');
    expect(monsterDerivedStatus(10, 10, 10)).toBe('fine');
  });

  it('flips to wounded once damage > durability', () => {
    expect(monsterDerivedStatus(11, 0, 10)).toBe('wounded');
    expect(monsterDerivedStatus(0, 11, 10)).toBe('wounded'); // mental track too
  });

  it('flips to incapacitated above 2× durability', () => {
    expect(monsterDerivedStatus(21, 0, 10)).toBe('incapacitated');
  });

  it('flips to dead above 3× durability', () => {
    expect(monsterDerivedStatus(31, 0, 10)).toBe('dead');
    expect(monsterDerivedStatus(0, 31, 10)).toBe('dead');
  });

  it('takes the worse of the two tracks', () => {
    expect(monsterDerivedStatus(5, 25, 10)).toBe('incapacitated');
  });

  it('returns fine when durability is zero (template lacks the field)', () => {
    expect(monsterDerivedStatus(50, 50, 0)).toBe('fine');
  });
});

describe('effectiveMonsterStatus', () => {
  it('returns the override when status_override is true', () => {
    const status = effectiveMonsterStatus(
      {
        status: 'dead',
        status_override: true,
        current_physical_damage: 0,
        current_mental_damage: 0,
      },
      10,
    );
    expect(status).toBe('dead');
  });

  it('returns the derived value when override is false', () => {
    const status = effectiveMonsterStatus(
      {
        status: 'fine',
        status_override: false,
        current_physical_damage: 25,
        current_mental_damage: 0,
      },
      10,
    );
    expect(status).toBe('incapacitated');
  });
});

describe('ryudeOperationalStatus', () => {
  it('intact at 100%', () => {
    expect(ryudeOperationalStatus(100, 100)).toBe('intact');
  });

  it('damaged-light at 75-99%', () => {
    expect(ryudeOperationalStatus(99, 100)).toBe('damaged-light');
    expect(ryudeOperationalStatus(75, 100)).toBe('damaged-light');
  });

  it('damaged-heavy at 25-74%', () => {
    expect(ryudeOperationalStatus(74, 100)).toBe('damaged-heavy');
    expect(ryudeOperationalStatus(25, 100)).toBe('damaged-heavy');
    expect(ryudeOperationalStatus(50, 100)).toBe('damaged-heavy');
  });

  it('disabled at 1-24%', () => {
    expect(ryudeOperationalStatus(24, 100)).toBe('disabled');
    expect(ryudeOperationalStatus(1, 100)).toBe('disabled');
  });

  it('destroyed at 0', () => {
    expect(ryudeOperationalStatus(0, 100)).toBe('destroyed');
    expect(ryudeOperationalStatus(-5, 100)).toBe('destroyed');
  });

  it('destroyed when max is invalid', () => {
    expect(ryudeOperationalStatus(50, 0)).toBe('destroyed');
  });
});

describe('tickActiveEffects', () => {
  const eff = (id: string, expires: number | null): ActiveEffect => ({
    id,
    label: id,
    expires_at_segment: expires,
  });

  it('removes effects whose expiry is at or before current', () => {
    const result = tickActiveEffects(
      { active_effects: [eff('a', 0), eff('b', 1), eff('c', 2)] },
      1,
    );
    expect(result.state.active_effects.map((e) => e.id)).toEqual(['c']);
    expect(result.expired.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('preserves null-expiry effects', () => {
    const result = tickActiveEffects(
      { active_effects: [eff('persistent', null), eff('expiring', 1)] },
      5,
    );
    expect(result.state.active_effects.map((e) => e.id)).toEqual(['persistent']);
    expect(result.expired.map((e) => e.id)).toEqual(['expiring']);
  });

  it('preserves other state fields via spread', () => {
    const result = tickActiveEffects(
      { active_effects: [], extra: 42 } as { active_effects: ActiveEffect[]; extra: number },
      0,
    );
    expect(result.state.extra).toBe(42);
  });
});

describe('endSegment', () => {
  it('increments index, ticks, clears segment snapshot', () => {
    const state = {
      active_effects: [
        { id: 'a', label: 'a', expires_at_segment: 1 } as ActiveEffect,
        { id: 'b', label: 'b', expires_at_segment: 5 } as ActiveEffect,
      ],
      current_segment_index: 0,
      segment: { in: 14, dn: 8, absorption_modifier: 1 as const, in_halved_next_segment: false, set_at_real: '2026-01-01' } satisfies CurrentSegment as CurrentSegment | null,
    };
    const result = endSegment(state);
    expect(result.state.current_segment_index).toBe(1);
    expect(result.state.segment).toBeNull();
    expect(result.state.active_effects.map((e) => e.id)).toEqual(['b']);
    expect(result.expired.map((e) => e.id)).toEqual(['a']);
  });
});

describe('nextAttunementState', () => {
  it('any total-failure → rejected', () => {
    expect(nextAttunementState('unattuned', 'total-failure')).toBe('rejected');
    expect(nextAttunementState('attuning', 'total-failure')).toBe('rejected');
  });

  it('attuned and rejected are sticky', () => {
    expect(nextAttunementState('attuned', 'failure')).toBe('attuned');
    expect(nextAttunementState('rejected', 'perfect-success')).toBe('rejected');
  });

  it('unattuned → attuning on success or perfect', () => {
    expect(nextAttunementState('unattuned', 'success')).toBe('attuning');
    expect(nextAttunementState('unattuned', 'perfect-success')).toBe('attuning');
  });

  it('unattuned + failure stays unattuned (retry)', () => {
    expect(nextAttunementState('unattuned', 'failure')).toBe('unattuned');
  });

  it('attuning → attuned only on perfect-success', () => {
    expect(nextAttunementState('attuning', 'perfect-success')).toBe('attuned');
    expect(nextAttunementState('attuning', 'success')).toBe('attuning');
    expect(nextAttunementState('attuning', 'failure')).toBe('attuning');
  });
});
