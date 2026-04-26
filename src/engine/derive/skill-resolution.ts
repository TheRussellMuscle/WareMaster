/**
 * Resolves a class skill package into concrete SkillEntry rows.
 *
 * Source: docs/data/classes.yaml `skill_packages` and `professions.skill_package`.
 *
 * The package YAML uses display names like "Riding" or "Mental Resistance"
 * which map to specific skill ids in skills.yaml — and ALSO uses placeholder
 * names that the player must resolve at character creation time:
 *
 *   - "Weapon*"          — pick one (or split levels across several) weapons
 *   - "Weapon/One Type"  — same; alternate spelling used in newer packages
 *
 * Each weapon type is its own Skill in Wares Blade (rule §05); see
 * docs/data/skills.yaml comment block.
 */

import type { Skill } from '@/domain/skill';
import type { SkillEntry } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export type RawPackageSkill = { name: string; level: number };

export type PlaceholderKind = 'weapon';

export interface PlaceholderSlot {
  /** Stable slot id for keying React UI and allocations. */
  slotId: string;
  /** What kind of picker to render. */
  kind: PlaceholderKind;
  /** Display name of the placeholder as written in the package YAML. */
  rawName: string;
  /** Total level the player must allocate across specific ids. */
  level: number;
  /**
   * Where the slot came from — either the package's main skills array,
   * or a chosen optional bonus that itself contains a placeholder.
   */
  origin: 'package' | 'optional';
}

export type WeaponAllocation = { specificId: string; level: number };

/**
 * Map of slotId → list of allocations. The sum of `.level` across each
 * slot's allocations MUST equal the slot's `.level` for the resolution
 * to succeed.
 */
export type AllocationMap = Record<string, WeaponAllocation[]>;

export interface ResolvedPackage {
  /** Final skill rows (concrete ids, deduped, summed if same id appears twice). */
  skills: SkillEntry[];
  /** Validation errors — non-empty means the wizard should block Next. */
  errors: string[];
}

const WEAPON_PLACEHOLDER_NAMES = new Set([
  'weapon*',
  'weapon/one type',
  'weapon/one-type',
]);

function isWeaponPlaceholder(name: string): boolean {
  return WEAPON_PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
}

/** Detect placeholder slots in a package's main skill list. */
export function detectPlaceholders(rawSkills: RawPackageSkill[]): PlaceholderSlot[] {
  const slots: PlaceholderSlot[] = [];
  rawSkills.forEach((s, i) => {
    if (isWeaponPlaceholder(s.name)) {
      slots.push({
        slotId: `pkg:weapon:${i}`,
        kind: 'weapon',
        rawName: s.name,
        level: s.level,
        origin: 'package',
      });
    }
  });
  return slots;
}

/** Case-insensitive name → skill id lookup with a fallback to the input. */
function nameToSkillId(name: string, skills: Skill[]): string {
  const lower = name.trim().toLowerCase();
  const exact = skills.find((s) => s.name.toLowerCase() === lower);
  if (exact) return exact.id;
  // Tolerate `Word-Casting/Metal` style qualifiers (e.g. Alchemist) by
  // stripping the qualifier and re-matching.
  const baseName = lower.split('/')[0]?.trim();
  if (baseName && baseName !== lower) {
    const base = skills.find((s) => s.name.toLowerCase() === baseName);
    if (base) return base.id;
  }
  return lower.replace(/\s+/g, '-');
}

/** Validate that a weapon-allocation matches catalog ids and sums to expected total. */
function validateWeaponAllocation(
  slot: PlaceholderSlot,
  allocation: WeaponAllocation[] | undefined,
  catalog: ReferenceCatalog,
): string[] {
  if (!allocation || allocation.length === 0) {
    return [`Specialize "${slot.rawName}" (Lv ${slot.level}): pick a weapon.`];
  }
  const errors: string[] = [];
  const sum = allocation.reduce((acc, a) => acc + a.level, 0);
  if (sum !== slot.level) {
    errors.push(
      `"${slot.rawName}" needs Lv ${slot.level} allocated; currently Lv ${sum}.`,
    );
  }
  for (const a of allocation) {
    if (a.level <= 0) {
      errors.push(`Allocation for ${a.specificId} must be at least Lv 1.`);
    }
    const known = catalog.weapons.weapons.find((w) => w.id === a.specificId);
    if (!known) {
      errors.push(`Unknown weapon id "${a.specificId}" in allocation.`);
    }
  }
  return errors;
}

/**
 * Take a raw package skill list + the player's placeholder allocations and
 * return the final skill entries (concrete ids) plus any validation errors.
 *
 * `extraSkills` is appended after the package skills; use it for things like
 * the Word-Caster Gate's paired skill (added unconditionally at draft-build
 * time, see ability-roll.pairedSkillForGate).
 */
export function resolveSkillPackage(
  rawSkills: RawPackageSkill[],
  allocations: AllocationMap,
  catalog: ReferenceCatalog,
  extraSkills: RawPackageSkill[] = [],
): ResolvedPackage {
  const errors: string[] = [];
  const placeholders = detectPlaceholders(rawSkills);

  // Aggregate skill_id → level (summed if same id appears in both the
  // package and an allocation, e.g. two Longsword Lv 1 entries).
  const accum = new Map<string, number>();

  rawSkills.forEach((s, i) => {
    if (isWeaponPlaceholder(s.name)) {
      const slot = placeholders.find((p) => p.slotId === `pkg:weapon:${i}`);
      if (!slot) return;
      const allocation = allocations[slot.slotId];
      const slotErrors = validateWeaponAllocation(slot, allocation, catalog);
      errors.push(...slotErrors);
      if (slotErrors.length === 0 && allocation) {
        for (const a of allocation) {
          accum.set(a.specificId, (accum.get(a.specificId) ?? 0) + a.level);
        }
      }
      return;
    }
    const id = nameToSkillId(s.name, catalog.skills.skills);
    accum.set(id, (accum.get(id) ?? 0) + s.level);
  });

  for (const extra of extraSkills) {
    const id = nameToSkillId(extra.name, catalog.skills.skills);
    accum.set(id, Math.max(accum.get(id) ?? 0, extra.level));
    // Use max (not sum) for extras so paired-skill auto-add doesn't double-add
    // if the package already grants the skill.
  }

  const skills: SkillEntry[] = [];
  for (const [skill_id, level] of accum) {
    if (level > 0) skills.push({ skill_id, level, pp: 0 });
  }

  return { skills, errors };
}

/**
 * Convenience helper used by the wizard's optional-bonus picker: a single
 * weapon-id + delta level used for the `+1 Weapon/One Type` style options.
 * Stored alongside the main allocations under a synthetic slotId.
 */
export function applyOptionalWeaponBonus(
  resolved: SkillEntry[],
  bonus: WeaponAllocation | null,
): SkillEntry[] {
  if (!bonus || bonus.level <= 0) return resolved;
  const idx = resolved.findIndex((s) => s.skill_id === bonus.specificId);
  if (idx >= 0) {
    const next = [...resolved];
    next[idx] = { ...next[idx]!, level: next[idx]!.level + bonus.level };
    return next;
  }
  return [...resolved, { skill_id: bonus.specificId, level: bonus.level, pp: 0 }];
}
