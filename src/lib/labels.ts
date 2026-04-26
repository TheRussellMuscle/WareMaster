import type { Character } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

/** Display name for the character's chosen equipment package, or null. */
export function equipmentPackageName(
  character: Character,
  catalog: ReferenceCatalog | null,
): string | null {
  if (!catalog || !character.equipment_package_id) return null;
  const cls = catalog.classes.classes.find((c) => c.id === character.class_id);
  const pkg = cls?.equipment_packages?.find(
    (p) => p.id === character.equipment_package_id,
  );
  return pkg?.name ?? null;
}

/** Display name for the character's chosen skill package (or Tradesfolk profession). */
export function skillPackageName(
  character: Character,
  catalog: ReferenceCatalog | null,
): string | null {
  if (!catalog || !character.skill_package_id) return null;
  const cls = catalog.classes.classes.find((c) => c.id === character.class_id);
  if (cls?.id === 'tradesfolk') {
    const prof = cls.professions?.find((p) => p.id === character.skill_package_id);
    return prof?.name ?? null;
  }
  const pkg = cls?.skill_packages?.find(
    (p) => p.id === character.skill_package_id,
  );
  return pkg?.name ?? null;
}

/** Catalog skill name by id, falling back to the id itself when missing. */
export function skillLabel(
  skillId: string,
  catalog: ReferenceCatalog | null,
): string {
  if (!catalog) return skillId;
  return catalog.skills.skills.find((s) => s.id === skillId)?.name ?? skillId;
}
