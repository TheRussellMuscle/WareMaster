export interface KnownEffect {
  kind: string;
  label: string;
  /** Brief mechanic description shown in the preset picker and effect list. */
  description: string;
  /** Stat modifiers applied by the engine. Absent = narrative only. */
  statMods?: {
    /** Multiplier applied to IN, BN, and DN after bonuses (e.g. 0.5 = halved). */
    inBnDnMultiplier?: number;
    /** Additive bonus applied to DN before the multiplier. */
    dnBonus?: number;
    /** Additive bonus applied to BN before the multiplier. */
    bnBonus?: number;
  };
}

export const KNOWN_EFFECT_KINDS: KnownEffect[] = [
  // ── Effects with computable stat modifiers ──────────────────────────────────
  {
    kind: 'blinded-full',
    label: 'Blinded',
    description: 'IN/DN/BN halved (round down)',
    statMods: { inBnDnMultiplier: 0.5 },
  },
  {
    kind: 'airshield',
    label: 'Airshield',
    description: '+3 DN, −3 incoming physical damage, wind damage halved',
    statMods: { dnBonus: 3 },
  },
  {
    kind: 'mistcalled',
    label: 'Mistcalled',
    description: 'Halved visibility, +2 DN vs Ranged (contextual), −2 BN',
    statMods: { bnBonus: -2 },
  },
  // ── Narrative-only effects ───────────────────────────────────────────────────
  {
    kind: 'paralyzed',
    label: 'Paralyzed',
    description: 'Immobilized — cannot act',
  },
  {
    kind: 'blinded-partial',
    label: 'Blinded (partial)',
    description: '−3 to all Action Rolls',
  },
  {
    kind: 'feared',
    label: 'Feared',
    description: 'Flees from source of fear',
  },
  {
    kind: 'fascinated',
    label: 'Fascinated',
    description: 'Strong affection for caster; caster +6 CHA vs target',
  },
  {
    kind: 'sleeping',
    label: 'Sleeping',
    description: 'Unconscious until woken or 3+ etches of sleep',
  },
  {
    kind: 'hallucinating',
    label: 'Hallucinating',
    description: 'Illusory damage treated as real',
  },
  {
    kind: 'truthbound',
    label: 'Truthbound',
    description: 'Must answer questions truthfully for duration',
  },
  {
    kind: 'courage',
    label: 'Courage',
    description: 'Fear effects at half Difficulty for 12 Turns',
  },
  {
    kind: 'soothed',
    label: 'Soothed',
    description: '1D10 temporary HP removed from damage pool',
  },
  {
    kind: 'phasing-hands',
    label: 'Phasing Hands',
    description: 'Hands pass through living flesh',
  },
  {
    kind: 'heatbarriered',
    label: 'Heatbarriered',
    description: 'Protected from heat damage (5 sq litte area)',
  },
  {
    kind: 'in-darkness',
    label: 'In Darkness',
    description: 'Roll 1D5 for IN/BN in combat',
  },
];

export interface ActiveEffectMods {
  /** Multiplier applied to IN, BN, and DN (default 1.0). */
  inBnDnMultiplier: number;
  /** Additive bonus applied to DN before the multiplier (default 0). */
  dnBonus: number;
  /** Additive bonus applied to BN before the multiplier (default 0). */
  bnBonus: number;
  /** Labels of effects that contributed the inBnDnMultiplier. */
  multiplierSources: string[];
  /** Labels of effects that contributed a dnBonus. */
  dnBonusSources: string[];
  /** Labels of effects that contributed a bnBonus. */
  bnBonusSources: string[];
}

const NO_MODS: ActiveEffectMods = {
  inBnDnMultiplier: 1,
  dnBonus: 0,
  bnBonus: 0,
  multiplierSources: [],
  dnBonusSources: [],
  bnBonusSources: [],
};

export function resolveEffectMods(
  effects: ReadonlyArray<{ kind?: string; label: string }>,
): ActiveEffectMods {
  if (effects.length === 0) return NO_MODS;

  let inBnDnMultiplier = 1;
  let dnBonus = 0;
  let bnBonus = 0;
  const multiplierSources: string[] = [];
  const dnBonusSources: string[] = [];
  const bnBonusSources: string[] = [];

  for (const eff of effects) {
    if (!eff.kind) continue;
    const known = KNOWN_EFFECT_KINDS.find((k) => k.kind === eff.kind);
    if (!known?.statMods) continue;

    const { statMods } = known;

    if (statMods.inBnDnMultiplier != null) {
      inBnDnMultiplier = Math.min(inBnDnMultiplier, statMods.inBnDnMultiplier);
      multiplierSources.push(eff.label);
    }
    if (statMods.dnBonus) {
      dnBonus += statMods.dnBonus;
      dnBonusSources.push(eff.label);
    }
    if (statMods.bnBonus) {
      bnBonus += statMods.bnBonus;
      bnBonusSources.push(eff.label);
    }
  }

  const anyMods =
    multiplierSources.length > 0 ||
    dnBonusSources.length > 0 ||
    bnBonusSources.length > 0;
  if (!anyMods) return NO_MODS;

  return {
    inBnDnMultiplier,
    dnBonus,
    bnBonus,
    multiplierSources,
    dnBonusSources,
    bnBonusSources,
  };
}
