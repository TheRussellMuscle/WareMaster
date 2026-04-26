/**
 * Wares Blade native vocabulary. Source: docs/rules/15-units-and-glossary.md.
 *
 * The UI uses these as primary labels everywhere; real-world equivalents are
 * surfaced in tooltips via the <UnitTooltip> component.
 */

export type WaresUnitKey =
  // time
  | 'segment'
  | 'round'
  | 'turn'
  | 'hour'
  | 'etch'
  | 'day'
  // distance
  | 'litte'
  | 'liet'
  | 'li'
  // mass
  | 'gran'
  | 'gren'
  | 'gro'
  // volume
  | 'garom'
  // currency
  | 'golda';

export interface WaresUnit {
  key: WaresUnitKey;
  label: string;
  pluralLabel?: string;
  abbr?: string;
  category: 'time' | 'distance' | 'mass' | 'volume' | 'currency';
  realWorld: string;
}

export const WARES_UNITS: Record<WaresUnitKey, WaresUnit> = {
  segment: {
    key: 'segment',
    label: 'Segment',
    pluralLabel: 'Segments',
    abbr: 'S',
    category: 'time',
    realWorld: '~2 sec — used during combat',
  },
  round: {
    key: 'round',
    label: 'Round',
    pluralLabel: 'Rounds',
    abbr: 'R',
    category: 'time',
    realWorld: '~30 sec (15 Segments)',
  },
  turn: {
    key: 'turn',
    label: 'Turn',
    pluralLabel: 'Turns',
    abbr: 'T',
    category: 'time',
    realWorld: '~5 min (10 Rounds)',
  },
  hour: {
    key: 'hour',
    label: 'Hour',
    pluralLabel: 'Hours',
    abbr: 'H',
    category: 'time',
    realWorld: '1 half-etch (~1 hour)',
  },
  etch: {
    key: 'etch',
    label: 'Etch',
    pluralLabel: 'Etches',
    category: 'time',
    realWorld: '~2 hours (12 Etches = 1 day)',
  },
  day: {
    key: 'day',
    label: 'Day',
    pluralLabel: 'Days',
    category: 'time',
    realWorld: '12 Etches (~24 hours)',
  },
  litte: {
    key: 'litte',
    label: 'litte',
    pluralLabel: 'littes',
    category: 'distance',
    realWorld: '~4 cm',
  },
  liet: {
    key: 'liet',
    label: 'liet',
    pluralLabel: 'liets',
    category: 'distance',
    realWorld: '~4 m',
  },
  li: {
    key: 'li',
    label: 'li',
    pluralLabel: 'li',
    category: 'distance',
    realWorld: '~4 km',
  },
  gran: {
    key: 'gran',
    label: 'gran',
    pluralLabel: 'grans',
    category: 'mass',
    realWorld: '~1.2 g',
  },
  gren: {
    key: 'gren',
    label: 'gren',
    pluralLabel: 'grens',
    category: 'mass',
    realWorld: '~1.2 kg',
  },
  gro: {
    key: 'gro',
    label: 'gro',
    pluralLabel: 'gros',
    category: 'mass',
    realWorld: '~1.2 tons',
  },
  garom: {
    key: 'garom',
    label: 'garom',
    pluralLabel: 'garoms',
    category: 'volume',
    realWorld: '~0.9 liters',
  },
  golda: {
    key: 'golda',
    label: 'golda',
    pluralLabel: 'golda',
    abbr: 'G',
    category: 'currency',
    realWorld:
      'Currency: 1 silver = 1 golda; 1 gold = 100 silver = 100,000 copper',
  },
};

/**
 * Player-facing acronyms from rule §15.
 * Source: docs/rules/15-units-and-glossary.md.
 */
export type WaresAcronymKey =
  | 'PC'
  | 'NPC'
  | 'WM'
  | 'PP'
  | 'IN'
  | 'DN'
  | 'BN'
  | 'D5'
  | 'D10'
  | 'G'
  | 'LUC'
  | 'SEN'
  | 'AGI'
  | 'WIL'
  | 'CON'
  | 'CHA';

export const WARES_ACRONYMS: Record<WaresAcronymKey, string> = {
  PC: 'Player Character — a character controlled by a player. Also called a Maverick.',
  NPC: 'Non-Player Character — controlled by the Wares Maker. Includes monsters.',
  WM: 'Wares Maker — the person who moderates the game (game master equivalent).',
  PP: 'Proficiency Points — earned on Perfect Success / Total Failure; spent to raise Skill Levels.',
  IN: 'Initiative Number — combat order. Higher acts first.',
  DN: 'Defense Number — what an attacker must meet or beat.',
  BN: 'Battle Number — the attacker’s roll total against the target’s DN.',
  D5: 'Five-sided die — roll a D10 and halve, rounding up.',
  D10: 'Ten-sided die.',
  G: 'Golda — the standard currency. 1 silver = 1 golda.',
  LUC: 'Luck — spendable Ability Score; each LUC adds a die or grants extra outcomes.',
  SEN: 'Sensation — perception, insight; governs IN.',
  AGI: 'Agility — quickness, dexterity; governs BN and DN.',
  WIL: 'Willpower — mental resilience; basis of Mental Durability.',
  CON: 'Constitution — physical resilience; basis of Physical Durability.',
  CHA: 'Charisma — presence and persuasion.',
};

/**
 * Pluralize a unit display: 1 etch / 3 etches.
 */
export function formatUnit(key: WaresUnitKey, amount?: number): string {
  const unit = WARES_UNITS[key];
  if (amount === undefined) return unit.label;
  if (key === 'golda' && unit.abbr) {
    return `${amount} ${unit.abbr}`;
  }
  const isPlural = amount !== 1 && amount !== -1;
  const label = isPlural && unit.pluralLabel ? unit.pluralLabel : unit.label;
  return `${amount} ${label}`;
}
