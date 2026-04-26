/**
 * Parses Wares Blade dice notation. Pure: no IO, no React.
 *
 * Examples:
 *   "1D10"       → { dice: 1, faces: 10, modifier: 0, min: 1,  max: 10 }
 *   "1D10+3"     → { dice: 1, faces: 10, modifier: 3, min: 4,  max: 13 }
 *   "2D5+5"      → { dice: 2, faces: 5,  modifier: 5, min: 7,  max: 15 }
 *   "1D10-7"     → { dice: 1, faces: 10, modifier: -7,min: -6, max: 3 }
 *   "5D5+80"     → { dice: 5, faces: 5,  modifier: 80,min: 85, max: 105 }
 *   "1D10+3(5)"  → bastard-sword duality; 1H mod=3, 2H mod=5.
 */

export interface DiceFormula {
  dice: number;
  faces: number;
  modifier: number;
  /** Minimum possible total (every die = 1). */
  min: number;
  /** Maximum possible total (every die = faces). LUC dice are capped here. */
  max: number;
}

export type BastardGrip = '1H' | '2H';

export interface BastardDiceFormula {
  oneHanded: DiceFormula;
  twoHanded: DiceFormula;
}

const BASE_RE = /^(\d+)D(\d+)(?:([+-])(\d+))?$/i;
const BASTARD_RE = /^(\d+)D(\d+)\+(\d+)\((\d+)\)$/i;

function build(dice: number, faces: number, modifier: number): DiceFormula {
  return {
    dice,
    faces,
    modifier,
    min: dice * 1 + modifier,
    max: dice * faces + modifier,
  };
}

/**
 * Parse a standard dice formula (no parens). Throws on bastard-sword notation
 * — call `parseBastardDiceFormula` for that.
 *
 * Strips whitespace before parsing. Empty / non-string / unrecognized input
 * throws so callers fail fast on malformed catalog data instead of silently
 * computing wrong damage.
 */
export function parseDiceFormula(input: string): DiceFormula {
  if (typeof input !== 'string') {
    throw new Error(`dice formula must be a string`);
  }
  const s = input.replace(/\s+/g, '');
  if (s === '') throw new Error('empty dice formula');
  if (BASTARD_RE.test(s)) {
    throw new Error(
      `"${input}" is bastard-sword notation; use parseBastardDiceFormula or pass a grip-resolved string`,
    );
  }
  const m = s.match(BASE_RE);
  if (!m) throw new Error(`could not parse dice formula "${input}"`);
  const dice = Number(m[1]);
  const faces = Number(m[2]);
  if (dice < 1 || faces < 1) {
    throw new Error(`dice and faces must be ≥ 1 in "${input}"`);
  }
  const sign = m[3] ?? '+';
  const modAmt = m[4] === undefined ? 0 : Number(m[4]);
  const modifier = sign === '-' ? -modAmt : modAmt;
  return build(dice, faces, modifier);
}

/**
 * Parse bastard-sword notation `<dice>D<faces>+<oneHand>(<twoHand>)`.
 * Returns both variants so a UI can show them side-by-side.
 */
export function parseBastardDiceFormula(input: string): BastardDiceFormula {
  const s = input.replace(/\s+/g, '');
  const m = s.match(BASTARD_RE);
  if (!m) throw new Error(`"${input}" is not bastard-sword notation`);
  const dice = Number(m[1]);
  const faces = Number(m[2]);
  const oneHand = Number(m[3]);
  const twoHand = Number(m[4]);
  return {
    oneHanded: build(dice, faces, oneHand),
    twoHanded: build(dice, faces, twoHand),
  };
}

/**
 * Resolve a damage string (regular or bastard-sword) to a single DiceFormula
 * given the active grip. Bastard input requires `grip`; regular input ignores
 * it.
 */
export function resolveDamageFormula(
  input: string,
  grip?: BastardGrip,
): DiceFormula {
  const s = input.replace(/\s+/g, '');
  if (BASTARD_RE.test(s)) {
    if (!grip) {
      throw new Error(
        `"${input}" is bastard-sword notation but no grip was provided`,
      );
    }
    const { oneHanded, twoHanded } = parseBastardDiceFormula(s);
    return grip === '2H' ? twoHanded : oneHanded;
  }
  return parseDiceFormula(s);
}
