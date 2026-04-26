/**
 * Parses the free-text strings in `classes.yaml`'s
 * `skill_packages[].optional_choose_one[].description` and converts them
 * into structured bonuses the wizard can apply.
 *
 * The strings follow recurring shapes — examples from docs/data/classes.yaml:
 *
 *   "Drive: Level 1"
 *   "Weapon*: +1 Level"
 *   "Weapon/One Type: +1 Level, +100 Golda"
 *   "Athletics: Level 1, Throwing: Level 1, +100 Golda"
 *   "Physical Resistance: +1 Level, Mental Resistance: Level 1, +50 Golda"
 *   "Weapon*: Level 1 / Defense: Level 1, +50 golda"
 *   "Numenism: Level 1, +50 Golda"
 *
 * Parsing strategy:
 *   1. Split top-level on `,` and `/` (both are separators in this corpus).
 *   2. Each segment is either `+N [Gg]olda` (golda bonus) or
 *      `<SkillName>: <spec>` where `<spec>` is `Level <N>` or `+<N> Level`.
 *   3. `<SkillName>` matching `Weapon*` / `Weapon/One Type` becomes a
 *      separate `weaponPlaceholder` entry the wizard surfaces as an extra
 *      Specialty slot. (Phase-3 simplification: for now we record it as a
 *      warning the WM handles manually; the full integration is small and
 *      can land in a follow-up.)
 *   4. Anything we don't recognize becomes a warning the UI shows verbatim.
 *
 * Pure: no IO, no React.
 */

export interface ParsedSkillBonus {
  /** Display name as written in the description (e.g. "Drive", "Athletics"). */
  name: string;
  /** Numeric level. */
  level: number;
  /** `set` = "Level N" (set to N); `add` = "+N Level" (add N to existing). */
  mode: 'set' | 'add';
}

export interface ParsedOptionalBonus {
  /** Skill bonuses that can be applied directly. */
  skills: ParsedSkillBonus[];
  /** `+N Golda` extra purse on top of the package's bonus_golda. */
  goldaBonus: number;
  /** Whether the description includes a Weapon* / Weapon/One Type slot. */
  weaponPlaceholder: ParsedSkillBonus | null;
  /** Tokens we couldn't parse. UI surfaces these as "WM applies manually". */
  warnings: string[];
}

const WEAPON_PLACEHOLDERS = ['weapon*', 'weapon/one type', 'weapon/one-type'];

function isWeaponPlaceholderName(name: string): boolean {
  return WEAPON_PLACEHOLDERS.includes(name.trim().toLowerCase());
}

function parseSpec(spec: string): { level: number; mode: 'set' | 'add' } | null {
  const setMatch = spec.match(/^level\s+(\d+)$/i);
  if (setMatch) return { level: parseInt(setMatch[1]!, 10), mode: 'set' };
  const addMatch = spec.match(/^\+\s*(\d+)\s+level$/i);
  if (addMatch) return { level: parseInt(addMatch[1]!, 10), mode: 'add' };
  return null;
}

function parseGolda(token: string): number | null {
  const m = token.match(/^\+\s*(\d+)\s*golda$/i);
  return m ? parseInt(m[1]!, 10) : null;
}

export function parseOptionalBonus(description: string): ParsedOptionalBonus {
  const out: ParsedOptionalBonus = {
    skills: [],
    goldaBonus: 0,
    weaponPlaceholder: null,
    warnings: [],
  };

  // Split by both `,` and `/` at the top level. The grammar doesn't nest,
  // so a single regex split is fine.
  const tokens = description
    .split(/[,/]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  for (const token of tokens) {
    const golda = parseGolda(token);
    if (golda != null) {
      out.goldaBonus += golda;
      continue;
    }

    const colon = token.indexOf(':');
    if (colon < 0) {
      out.warnings.push(token);
      continue;
    }
    const name = token.slice(0, colon).trim();
    const spec = token.slice(colon + 1).trim();
    const parsed = parseSpec(spec);
    if (!parsed) {
      out.warnings.push(token);
      continue;
    }

    if (isWeaponPlaceholderName(name)) {
      // Multiple weapon placeholders in one description aren't expected;
      // if seen, append the warning rather than silently dropping.
      if (out.weaponPlaceholder) {
        out.warnings.push(token);
      } else {
        out.weaponPlaceholder = { name, level: parsed.level, mode: parsed.mode };
      }
      continue;
    }

    out.skills.push({ name, level: parsed.level, mode: parsed.mode });
  }

  return out;
}

/** Apply parsed skill bonuses to an already-resolved skill list. */
export function applyOptionalSkillBonuses(
  resolved: Array<{ skill_id: string; level: number; pp: number }>,
  bonuses: ParsedSkillBonus[],
  resolveSkillId: (displayName: string) => string,
): Array<{ skill_id: string; level: number; pp: number }> {
  let next = [...resolved];
  for (const bonus of bonuses) {
    const id = resolveSkillId(bonus.name);
    const idx = next.findIndex((s) => s.skill_id === id);
    if (idx >= 0) {
      const current = next[idx]!;
      const newLevel =
        bonus.mode === 'set'
          ? Math.max(current.level, bonus.level)
          : current.level + bonus.level;
      next = next.map((s, i) => (i === idx ? { ...s, level: newLevel } : s));
    } else {
      // `add` against a missing skill → treat as `set` (effective starting level).
      next = [...next, { skill_id: id, level: bonus.level, pp: 0 }];
    }
  }
  return next;
}
