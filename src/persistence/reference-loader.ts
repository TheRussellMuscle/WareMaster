import { invoke } from '@tauri-apps/api/core';
import { parseYaml, type YamlResult } from './yaml';
import { ClassesFileSchema, type ClassesFile } from '@/domain/class';
import { SkillsFileSchema, type SkillsFile } from '@/domain/skill';
import {
  ArmorFileSchema,
  GeneralGoodsFileSchema,
  RyudeEquipmentFileSchema,
  WeaponsFileSchema,
  type GeneralGoodsFile,
  type RyudeEquipmentFile,
  type WeaponsFile,
  type Armor,
} from '@/domain/item';
import { BestiaryFileSchema, type BestiaryFile } from '@/domain/monster';
import { RyudeUnitsFileSchema, type RyudeUnitsFile } from '@/domain/ryude';
import {
  TechniqueFileSchema,
  type TechniqueFile,
  type Discipline,
  type Gate,
} from '@/domain/technique';
import { TablesFileSchema, type TablesFile } from '@/domain/tables';

export interface ReferenceCatalog {
  classes: ClassesFile;
  skills: SkillsFile;
  weapons: WeaponsFile;
  armor: Armor[];
  generalGoods: GeneralGoodsFile;
  beastiary: BestiaryFile;
  ryudeUnits: RyudeUnitsFile;
  ryudeEquipment: RyudeEquipmentFile;
  tables: TablesFile;
  techniques: {
    wordCasting: Partial<Record<Gate, TechniqueFile>>;
    numeticArts: TechniqueFile;
    invocations: TechniqueFile;
  };
}

export interface ReferenceLoadFailure {
  file: string;
  message: string;
  detail?: unknown;
}

export interface ReferenceLoadResult {
  catalog: ReferenceCatalog | null;
  failures: ReferenceLoadFailure[];
}

const TECHNIQUE_GATE_FILES: Array<[Gate, string]> = [
  ['gateless', 'techniques/word-casting-gateless.yaml'],
  ['sun', 'techniques/word-casting-sun.yaml'],
  ['metal', 'techniques/word-casting-metal.yaml'],
  ['fire', 'techniques/word-casting-fire.yaml'],
  ['wood', 'techniques/word-casting-wood.yaml'],
  ['moon', 'techniques/word-casting-moon.yaml'],
  ['wind', 'techniques/word-casting-wind.yaml'],
  ['water', 'techniques/word-casting-water.yaml'],
  ['earth', 'techniques/word-casting-earth.yaml'],
];

async function readDataFile(relative: string): Promise<string> {
  return invoke<string>('read_data_file', { relative });
}

function unwrap<T>(
  failures: ReferenceLoadFailure[],
  result: YamlResult<T>,
): T | null {
  if (result.ok) return result.value;
  failures.push({
    file: result.error.source,
    message: result.error.message,
    detail: result.error.detail,
  });
  return null;
}

async function loadParsed<T>(
  failures: ReferenceLoadFailure[],
  relative: string,
  schema: Parameters<typeof parseYaml<T>>[2],
): Promise<T | null> {
  try {
    const text = await readDataFile(relative);
    return unwrap(failures, parseYaml<T>(relative, text, schema));
  } catch (err) {
    failures.push({
      file: relative,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function loadReferenceCatalog(): Promise<ReferenceLoadResult> {
  const failures: ReferenceLoadFailure[] = [];

  const [
    classes,
    skills,
    weapons,
    armorFile,
    generalGoods,
    beastiary,
    ryudeUnits,
    ryudeEquipment,
    tables,
    numeticArts,
    invocations,
  ] = await Promise.all([
    loadParsed(failures, 'classes.yaml', ClassesFileSchema),
    loadParsed(failures, 'skills.yaml', SkillsFileSchema),
    loadParsed(failures, 'weapons.yaml', WeaponsFileSchema),
    loadParsed(failures, 'armor.yaml', ArmorFileSchema),
    loadParsed(failures, 'general-goods.yaml', GeneralGoodsFileSchema),
    loadParsed(failures, 'beastiary.yaml', BestiaryFileSchema),
    loadParsed(failures, 'ryude-units.yaml', RyudeUnitsFileSchema),
    loadParsed(failures, 'ryude-equipment.yaml', RyudeEquipmentFileSchema),
    loadParsed(failures, 'tables.yaml', TablesFileSchema),
    loadParsed(
      failures,
      'techniques/numetic-arts.yaml',
      TechniqueFileSchema,
    ),
    loadParsed(failures, 'techniques/invocations.yaml', TechniqueFileSchema),
  ]);

  const wordCasting: Partial<Record<Gate, TechniqueFile>> = {};
  await Promise.all(
    TECHNIQUE_GATE_FILES.map(async ([gate, file]) => {
      const result = await loadParsed(failures, file, TechniqueFileSchema);
      if (result) wordCasting[gate] = result;
    }),
  );

  if (
    !classes ||
    !skills ||
    !weapons ||
    !armorFile ||
    !generalGoods ||
    !beastiary ||
    !ryudeUnits ||
    !ryudeEquipment ||
    !tables ||
    !numeticArts ||
    !invocations
  ) {
    return { catalog: null, failures };
  }

  const catalog: ReferenceCatalog = {
    classes,
    skills,
    weapons,
    armor: armorFile.armor,
    generalGoods,
    beastiary,
    ryudeUnits,
    ryudeEquipment,
    tables,
    techniques: {
      wordCasting,
      numeticArts,
      invocations,
    },
  };

  return { catalog, failures };
}

export const TECHNIQUE_FILES: ReadonlyArray<readonly [string, Discipline, Gate?]> = [
  ['techniques/word-casting-gateless.yaml', 'word-casting', 'gateless'],
  ['techniques/word-casting-sun.yaml', 'word-casting', 'sun'],
  ['techniques/word-casting-metal.yaml', 'word-casting', 'metal'],
  ['techniques/word-casting-fire.yaml', 'word-casting', 'fire'],
  ['techniques/word-casting-wood.yaml', 'word-casting', 'wood'],
  ['techniques/word-casting-moon.yaml', 'word-casting', 'moon'],
  ['techniques/word-casting-wind.yaml', 'word-casting', 'wind'],
  ['techniques/word-casting-water.yaml', 'word-casting', 'water'],
  ['techniques/word-casting-earth.yaml', 'word-casting', 'earth'],
  ['techniques/numetic-arts.yaml', 'numetic-arts'],
  ['techniques/invocations.yaml', 'invocation'],
];
