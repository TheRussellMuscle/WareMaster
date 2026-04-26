import * as React from 'react';
import {
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { Lock, LockOpen } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
  SealedDivider,
} from '@/components/parchment/ParchmentCard';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { Portrait } from '@/components/portraits/Portrait';
import { PortraitPicker } from '@/components/portraits/PortraitPicker';
import { RequireVault } from '@/components/shell/RequireVault';
import { useCampaignStore } from '@/stores/campaign-store';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  createCharacter,
  updateCharacter,
  type NewCharacter,
} from '@/persistence/character-repo';
import { importCharacterPortrait } from '@/persistence/portrait-repo';
import {
  ABILITY_CODES,
  type AbilityCode,
} from '@/domain/attributes';
import type { Class, ClassId } from '@/domain/class';
import type { Gate } from '@/domain/technique';
import type {
  Abilities,
  SpiritualistOrder,
  TradesfolkProfession,
} from '@/domain/character';
import type { Weapon, GeneralGood, Armor } from '@/domain/item';
import {
  resolveKit,
} from '@/engine/derive/equipment-kit';
import {
  rollValidSixAbilities,
  rollSixAbilities,
  roll3D5,
  rerollExcept,
  validateAbilityRoll,
  pairedSkillForGate,
} from '@/engine/derive/ability-roll';
import {
  detectPlaceholders,
  resolveSkillPackage,
  type AllocationMap,
  type PlaceholderSlot,
  type WeaponAllocation,
} from '@/engine/derive/skill-resolution';
import {
  resolveAdditionalPurchases,
  type PurchaseSelection,
} from '@/engine/derive/additional-purchase';
import {
  parseOptionalBonus,
  applyOptionalSkillBonuses,
} from '@/engine/derive/optional-bonus-parser';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

export const Route = createFileRoute('/campaigns/$cid/characters/new')({
  component: NewCharacter,
});

function NewCharacter(): React.JSX.Element {
  return (
    <RequireVault>
      <NewCharacterInner />
    </RequireVault>
  );
}

const STEPS = [
  'Class',
  'Skill Package',
  'Skill Specialties',
  'Path',
  'Abilities',
  'Equipment',
  'Additional Golda',
  'Identity',
  'Confirm',
] as const;
type Step = (typeof STEPS)[number];

interface WizardState {
  step: Step;
  classId: ClassId | null;
  skill_package_id: string | null;
  /** Index into the chosen package's `optional_choose_one[]`, or null = none. */
  optional_choice_index: number | null;
  word_caster_gate: Gate | null;
  spiritualist_order: SpiritualistOrder | null;
  tradesfolk_profession: TradesfolkProfession | null;
  abilities: Abilities;
  /** Abilities the user has locked from the "Roll all" affordance. */
  ability_locks: AbilityCode[];
  equipment_package_id: string | null;
  /** Result of 3D5 × 10 — initial purse before subtracting equipment cost. */
  starting_money_roll: number | null;
  /** Player's allocation of placeholder skills (e.g. Weapon/One Type → specific weapon ids). */
  weapon_allocations: AllocationMap;
  /** Free-spend purchases on top of the equipment package, per rule §03 step 6. */
  additional_purchases: PurchaseSelection[];
  // Identity (Playkit p. 79)
  name: string;
  age: number | null;
  gender: string;
  title: string;
  homeland: string;
  current_home: string;
  family_relationships: string;
  personality_notes: string;
  ryude_name: string;
  biography: string;
  /** Host-absolute path of a portrait the user chose; copied into vault after createCharacter. */
  pending_portrait_source: string | null;
}

const INITIAL: WizardState = {
  step: 'Class',
  classId: null,
  skill_package_id: null,
  optional_choice_index: null,
  word_caster_gate: null,
  spiritualist_order: null,
  tradesfolk_profession: null,
  abilities: { SEN: 9, AGI: 9, WIL: 9, CON: 9, CHA: 9, LUC: 9 },
  ability_locks: [],
  equipment_package_id: null,
  starting_money_roll: null,
  weapon_allocations: {},
  additional_purchases: [],
  name: '',
  age: null,
  gender: '',
  title: '',
  homeland: '',
  current_home: '',
  family_relationships: '',
  personality_notes: '',
  ryude_name: '',
  biography: '',
  pending_portrait_source: null,
};

function NewCharacterInner(): React.JSX.Element {
  const { cid } = useParams({ from: '/campaigns/$cid/characters/new' });
  const navigate = useNavigate();
  const current = useCampaignStore((s) => s.current);
  const loadByDir = useCampaignStore((s) => s.loadByDir);
  const { status, catalog } = useReferenceData();

  React.useEffect(() => {
    if (!current) void loadByDir(cid);
  }, [current, cid, loadByDir]);

  const [state, setState] = React.useState<WizardState>(INITIAL);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Roll starting money the first time the Equipment step is reached
  // (per rule §03 step 4: 3D5 × 10 golda + skill-package bonus).
  React.useEffect(() => {
    if (state.step === 'Equipment' && state.starting_money_roll == null) {
      setState((s) => ({ ...s, starting_money_roll: roll3D5() * 10 }));
    }
  }, [state.step, state.starting_money_roll]);

  // Compute class + placeholders BEFORE any early returns so the hook order
  // stays stable across loading → ready transitions.
  const cls: Class | null =
    catalog && state.classId
      ? catalog.classes.classes.find((c) => c.id === state.classId) ?? null
      : null;

  const placeholders = React.useMemo(
    () =>
      cls
        ? detectPlaceholders(pickedSkills(state, cls).skills)
        : [],
    [state, cls],
  );

  if (status !== 'ready' || !catalog) {
    return <ParchmentCard className="mx-auto max-w-2xl">Loading reference data…</ParchmentCard>;
  }
  if (!current) {
    return <ParchmentCard className="mx-auto max-w-2xl">Loading campaign…</ParchmentCard>;
  }

  const goNext = () =>
    setState((s) => ({ ...s, step: advanceStep(s.step, s, cls, placeholders) }));
  const goBack = () =>
    setState((s) => ({ ...s, step: retreatStep(s.step, s, cls, placeholders) }));

  const canNext = canAdvance(state, cls, placeholders, catalog);

  const onCreate = async () => {
    if (!cls || !state.classId || !state.skill_package_id) return;
    setSubmitting(true);
    setError(null);
    try {
      const draft = buildDraft(state, cls, current.id, catalog);
      const created = await createCharacter(cid, draft, state.biography);

      // If the user picked a portrait during the wizard, import it now and
      // patch the character with its vault path. (Two-write at create — the
      // resulting updated_at sliding past created_at is cosmetic.)
      if (state.pending_portrait_source) {
        try {
          const path = await importCharacterPortrait(
            created.id,
            state.pending_portrait_source,
          );
          await updateCharacter(cid, { ...created, portrait_path: path });
        } catch (e) {
          // Non-fatal: character is created, portrait failed. Surface the
          // error inline but still navigate.
          console.error('portrait import failed:', e);
        }
      }

      void navigate({
        to: '/campaigns/$cid/characters/$pcid',
        params: { cid, pcid: created.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <IlluminatedHeading level={1}>New character</IlluminatedHeading>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          For campaign{' '}
          <span className="font-medium text-[var(--color-ink)]">
            {current.name}
          </span>
          .
        </p>
      </header>

      <Stepper current={state.step} />

      {state.step === 'Class' && (
        <ClassStep
          classes={catalog.classes.classes}
          value={state.classId}
          onChange={(classId) =>
            setState({
              ...INITIAL,
              classId,
              step: state.step,
            })
          }
        />
      )}

      {state.step === 'Skill Package' && cls && (
        <SkillPackageStep
          cls={cls}
          value={state.skill_package_id}
          optionalIndex={state.optional_choice_index}
          onChange={(id) =>
            setState((s) => ({
              ...s,
              skill_package_id: id,
              // Reset allocations + optional choice when the package changes.
              weapon_allocations: {},
              optional_choice_index: null,
            }))
          }
          onOptionalChange={(index) =>
            setState((s) => ({ ...s, optional_choice_index: index }))
          }
        />
      )}

      {state.step === 'Skill Specialties' && cls && (
        <SpecializeStep
          placeholders={placeholders}
          allocations={state.weapon_allocations}
          weapons={catalog.weapons.weapons}
          onChange={(allocations) =>
            setState((s) => ({ ...s, weapon_allocations: allocations }))
          }
        />
      )}

      {state.step === 'Path' && cls && (
        <SpecializationStep
          cls={cls}
          gate={state.word_caster_gate}
          order={state.spiritualist_order}
          profession={state.tradesfolk_profession}
          onGate={(g) => setState((s) => ({ ...s, word_caster_gate: g }))}
          onOrder={(o) => setState((s) => ({ ...s, spiritualist_order: o }))}
          onProfession={(p) =>
            setState((s) => ({ ...s, tradesfolk_profession: p }))
          }
        />
      )}

      {state.step === 'Abilities' && (
        <AbilityStep
          abilities={state.abilities}
          locks={state.ability_locks}
          onChange={(abilities) => setState((s) => ({ ...s, abilities }))}
          onLocksChange={(locks) =>
            setState((s) => ({ ...s, ability_locks: locks }))
          }
        />
      )}

      {state.step === 'Equipment' && cls && (
        <EquipmentStep
          cls={cls}
          catalog={catalog}
          value={state.equipment_package_id}
          startingMoneyRoll={state.starting_money_roll}
          skillBonusGolda={pickedSkills(state, cls).bonusGolda}
          onChange={(id) =>
            setState((s) => ({
              ...s,
              equipment_package_id: id,
              // New package → invalidate any additional purchases that depend on remaining.
              additional_purchases: [],
            }))
          }
          onRollStartingMoney={() =>
            setState((s) => ({
              ...s,
              starting_money_roll: roll3D5() * 10,
            }))
          }
        />
      )}

      {state.step === 'Additional Golda' && cls && (
        <AdditionalGoldaStep
          catalog={catalog}
          remainingBeforePurchase={
            computePurse(state, cls) -
            (cls.equipment_packages?.find(
              (p) => p.id === state.equipment_package_id,
            )?.total_golda ?? 0)
          }
          purchases={state.additional_purchases}
          onChange={(purchases) =>
            setState((s) => ({ ...s, additional_purchases: purchases }))
          }
        />
      )}

      {state.step === 'Identity' && (
        <IdentityStep
          state={state}
          classId={state.classId}
          onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        />
      )}

      {state.step === 'Confirm' && cls && (
        <ConfirmStep state={state} cls={cls} catalog={catalog} />
      )}

      {error && (
        <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-2 text-sm text-[var(--color-rust)]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          disabled={state.step === 'Class' || submitting}
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-4 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-40"
        >
          Back
        </button>
        {state.step !== 'Confirm' ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={submitting || !canNext}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:opacity-40"
          >
            {submitting ? 'Creating…' : 'Create character'}
          </button>
        )}
        <button
          type="button"
          onClick={() => void navigate({ to: '/campaigns/$cid', params: { cid } })}
          className="ml-auto rounded-sm px-3 py-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function shouldSkip(
  step: Step,
  _state: WizardState,
  _cls: Class | null,
  placeholders: PlaceholderSlot[],
): boolean {
  if (step === 'Skill Specialties' && placeholders.length === 0) return true;
  return false;
}

function advanceStep(
  current: Step,
  state: WizardState,
  cls: Class | null,
  placeholders: PlaceholderSlot[],
): Step {
  let i = STEPS.indexOf(current);
  while (i < STEPS.length - 1) {
    i += 1;
    const candidate = STEPS[i]!;
    if (!shouldSkip(candidate, state, cls, placeholders)) return candidate;
  }
  return current;
}

function retreatStep(
  current: Step,
  state: WizardState,
  cls: Class | null,
  placeholders: PlaceholderSlot[],
): Step {
  let i = STEPS.indexOf(current);
  while (i > 0) {
    i -= 1;
    const candidate = STEPS[i]!;
    if (!shouldSkip(candidate, state, cls, placeholders)) return candidate;
  }
  return current;
}

function canAdvance(
  state: WizardState,
  cls: Class | null,
  placeholders: PlaceholderSlot[],
  catalog: ReferenceCatalog,
): boolean {
  switch (state.step) {
    case 'Class':
      return state.classId != null;
    case 'Skill Package':
      return state.skill_package_id != null;
    case 'Skill Specialties': {
      // Every placeholder must be fully allocated.
      for (const slot of placeholders) {
        const allocation = state.weapon_allocations[slot.slotId];
        if (!allocation || allocation.length === 0) return false;
        const sum = allocation.reduce((acc, a) => acc + a.level, 0);
        if (sum !== slot.level) return false;
        if (allocation.some((a) => a.level <= 0 || !a.specificId)) return false;
      }
      return true;
    }
    case 'Path':
      if (!cls) return false;
      if (cls.id === 'word-caster') return state.word_caster_gate != null;
      if (cls.id === 'spiritualist') return state.spiritualist_order != null;
      if (cls.id === 'tradesfolk') return state.tradesfolk_profession != null;
      return true;
    case 'Abilities':
      return validateAbilityRoll(state.abilities).ok;
    case 'Equipment':
      return true;
    case 'Additional Golda': {
      const purse = computePurse(state, cls);
      const equipCost =
        cls?.equipment_packages?.find(
          (p) => p.id === state.equipment_package_id,
        )?.total_golda ?? 0;
      const result = resolveAdditionalPurchases(
        catalog,
        purse - equipCost,
        state.additional_purchases,
      );
      return result.remaining >= 0 && result.invalid.length === 0;
    }
    case 'Identity':
      return state.name.trim().length > 0;
    case 'Confirm':
      return state.name.trim().length > 0;
  }
}

function computePurse(state: WizardState, cls: Class | null): number {
  if (!cls) return 0;
  const bonus = pickedSkills(state, cls).bonusGolda;
  return (state.starting_money_roll ?? 0) + bonus;
}

interface SkillEntryRaw {
  name: string;
  level: number;
}

function skillNameToId(
  name: string,
  skills: Array<{ id: string; name: string }>,
): string {
  const lower = name.trim().toLowerCase();
  const match = skills.find((s) => s.name.toLowerCase() === lower);
  if (match) return match.id;
  // Tolerate "Word-Casting/Metal" style qualifiers by stripping the trailing slash.
  const base = lower.split('/')[0]?.trim();
  if (base && base !== lower) {
    const baseMatch = skills.find((s) => s.name.toLowerCase() === base);
    if (baseMatch) return baseMatch.id;
  }
  return lower.replace(/\s+/g, '-');
}

function pickedSkills(state: WizardState, cls: Class): {
  skills: SkillEntryRaw[];
  bonusGolda: number;
} {
  if (cls.id === 'tradesfolk') {
    const prof = cls.professions?.find((p) => p.id === state.skill_package_id);
    return {
      skills: prof?.skill_package ?? [],
      bonusGolda: prof?.bonus_golda ?? 0,
    };
  }
  const pkg = cls.skill_packages?.find((p) => p.id === state.skill_package_id);
  return {
    skills: pkg?.skills ?? [],
    bonusGolda: pkg?.bonus_golda ?? 0,
  };
}

function buildDraft(
  state: WizardState,
  cls: Class,
  campaignId: string,
  catalog: ReferenceCatalog,
): NewCharacter {
  const { skills: rawSkills, bonusGolda } = pickedSkills(state, cls);

  // Resolve placeholders (e.g. Weapon/One Type → Longsword Lv 2) and merge
  // in any class-driven extras (Word-Caster paired Gate skill).
  const extraSkills: SkillEntryRaw[] = [];
  if (cls.id === 'word-caster' && state.word_caster_gate) {
    const paired = pairedSkillForGate(state.word_caster_gate, cls);
    if (paired) {
      extraSkills.push({ name: 'Word-Casting', level: 2 });
      extraSkills.push({ name: paired.pairedSkillName, level: 2 });
    }
  }
  const resolved = resolveSkillPackage(
    rawSkills,
    state.weapon_allocations,
    catalog,
    extraSkills,
  );

  // Apply chosen optional_choose_one bonus (rule §03 §3) on top of resolved.
  let resolvedSkills = resolved.skills;
  let optionalGoldaBonus = 0;
  const skillPkg = cls.skill_packages?.find(
    (p) => p.id === state.skill_package_id,
  );
  if (
    skillPkg?.optional_choose_one &&
    state.optional_choice_index != null &&
    state.optional_choice_index < skillPkg.optional_choose_one.length
  ) {
    const desc =
      skillPkg.optional_choose_one[state.optional_choice_index]!.description;
    const parsed = parseOptionalBonus(desc);
    optionalGoldaBonus = parsed.goldaBonus;
    resolvedSkills = applyOptionalSkillBonuses(
      resolvedSkills,
      parsed.skills,
      (name) => skillNameToId(name, catalog.skills.skills),
    );
    // Weapon-placeholder bonuses from optional choices are surfaced in the
    // wizard with a "WM applies manually" warning; not auto-applied here.
  }

  // Equipment: start with the package, then merge additional purchases.
  const equipPkg = cls.equipment_packages?.find(
    (p) => p.id === state.equipment_package_id,
  );
  const kit = equipPkg ? resolveKit(equipPkg.items, catalog) : null;

  const purse = (state.starting_money_roll ?? 0) + bonusGolda + optionalGoldaBonus;
  const equipCost = equipPkg?.total_golda ?? 0;
  const purchaseResult = resolveAdditionalPurchases(
    catalog,
    purse - equipCost,
    state.additional_purchases,
  );

  const weapons: string[] = [...(kit?.weaponIds ?? [])];
  let bodyArmor: string | null = kit?.bodyArmorId ?? null;
  let headArmor: string | null = kit?.headArmorId ?? null;
  let shield: string | null = kit?.shieldId ?? null;
  const inventory: Array<{ item_id: string; quantity: number }> = [
    ...(kit?.other ?? []),
  ];

  for (const line of purchaseResult.lines) {
    if (line.kind === 'weapon') {
      for (let i = 0; i < line.qty; i++) weapons.push(line.itemId);
      continue;
    }
    if (line.kind === 'armor') {
      const slot = line.armorSlot;
      if (slot === 'body' && bodyArmor == null) {
        bodyArmor = line.itemId;
        if (line.qty > 1) {
          for (let i = 1; i < line.qty; i++) {
            inventory.push({ item_id: line.itemId, quantity: 1 });
          }
        }
        continue;
      }
      if (slot === 'head' && headArmor == null) {
        headArmor = line.itemId;
        if (line.qty > 1) {
          for (let i = 1; i < line.qty; i++) {
            inventory.push({ item_id: line.itemId, quantity: 1 });
          }
        }
        continue;
      }
      if (slot === 'shield' && shield == null) {
        shield = line.itemId;
        if (line.qty > 1) {
          for (let i = 1; i < line.qty; i++) {
            inventory.push({ item_id: line.itemId, quantity: 1 });
          }
        }
        continue;
      }
      // Slot occupied or unknown — push to inventory.
      inventory.push({ item_id: line.itemId, quantity: line.qty });
      continue;
    }
    // general goods
    inventory.push({ item_id: line.itemId, quantity: line.qty });
  }

  const initialLuc = state.abilities.LUC;
  const startingGolda = Math.max(0, purchaseResult.remaining);

  return {
    campaign_id: campaignId,
    name: state.name.trim(),
    age: state.age,
    gender: state.gender,
    title: state.title,
    homeland: state.homeland,
    current_home: state.current_home,
    family_relationships: state.family_relationships,
    personality_notes: state.personality_notes,
    ryude_name: state.ryude_name,
    class_id: cls.id,
    word_caster_gate: state.word_caster_gate ?? undefined,
    spiritualist_order: state.spiritualist_order ?? undefined,
    tradesfolk_profession: state.tradesfolk_profession ?? undefined,
    memory_points_spent: 0,
    spiritualist_doctrine: '',
    spiritualist_restrictions: '',
    spiritualist_special_implements: '',
    skill_package_id: state.skill_package_id ?? '',
    equipment_package_id: state.equipment_package_id,
    appearance_modifier: 0,
    abilities: state.abilities,
    skills: resolvedSkills,
    techniques: [],
    equipment: {
      weapons,
      body_armor: bodyArmor,
      head_armor: headArmor,
      shield,
      other: inventory,
      bastard_sword_grip: '1H',
    },
    golda: startingGolda,
    completion_bonus: 0,
    luc_reserves: 0,
    initial_luc: initialLuc,
    state: {
      physical_damage: 0,
      mental_damage: 0,
      available_luc: initialLuc,
      status: 'fine',
      status_override: false,
      active_effects: [],
      last_recovery_tick: 0,
    },
    portrait_path: null,
    notes_path: null,
  };
}

/* ---------- Step components ---------- */

function Stepper({ current }: { current: Step }): React.JSX.Element {
  const idx = STEPS.indexOf(current);
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={
            i < idx
              ? 'rounded-sm border border-[var(--color-verdigris)]/40 bg-[var(--color-verdigris)]/10 px-2 py-1 text-[var(--color-verdigris)]'
              : i === idx
                ? 'rounded-sm border border-[var(--color-gilt)] bg-[var(--color-gilt)]/15 px-2 py-1 font-medium text-[var(--color-ink)]'
                : 'rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/40 px-2 py-1 text-[var(--color-ink-faint)]'
          }
        >
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}

function ClassStep({
  classes,
  value,
  onChange,
}: {
  classes: Class[];
  value: ClassId | null;
  onChange: (id: ClassId) => void;
}): React.JSX.Element {
  return (
    <ParchmentCard>
      <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
        Choose a class
      </h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`flex flex-col gap-1 rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
              value === c.id
                ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 hover:bg-[var(--color-parchment-200)]/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Portrait classId={c.id} name={c.name} size="sm" />
              <span className="font-display text-base text-[var(--color-ink)]">
                {c.name}
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-soft)]">
              {c.description}
            </p>
          </button>
        ))}
      </div>
    </ParchmentCard>
  );
}

function SkillPackageStep({
  cls,
  value,
  optionalIndex,
  onChange,
  onOptionalChange,
}: {
  cls: Class;
  value: string | null;
  optionalIndex: number | null;
  onChange: (id: string) => void;
  onOptionalChange: (index: number | null) => void;
}): React.JSX.Element {
  const isTradesfolk = cls.id === 'tradesfolk';
  const options = isTradesfolk
    ? (cls.professions ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        skills: p.skill_package?.map((s) => `${s.name}: Lv ${s.level}`) ?? [],
        notes: undefined as string | undefined,
        optional: undefined as undefined | { description: string }[],
      }))
    : (cls.skill_packages ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        skills: p.skills?.map((s) => `${s.name}: Lv ${s.level}`) ?? [],
        notes: p.notes,
        optional: p.optional_choose_one,
      }));

  const chosen = options.find((o) => o.id === value);
  const optionalList = chosen?.optional ?? [];

  return (
    <ParchmentCard className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-[var(--color-ink)]">
        Choose a {isTradesfolk ? 'profession' : 'skill package'}
      </h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex flex-col gap-1 rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
              value === opt.id
                ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 hover:bg-[var(--color-parchment-200)]/40'
            }`}
          >
            <div className="font-display text-base">{opt.name}</div>
            {opt.notes && (
              <div className="text-xs italic text-[var(--color-ink-faint)]">
                {opt.notes}
              </div>
            )}
            <ul className="mt-0.5 list-disc pl-5 font-mono text-xs">
              {opt.skills.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {chosen && optionalList.length > 0 && (
        <section className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3">
          <header className="mb-2">
            <h3 className="font-display text-base text-[var(--color-ink)]">
              Optional bonus
            </h3>
            <p className="text-xs italic text-[var(--color-ink-faint)]">
              Rule §03 §3 — pick one (or skip).
            </p>
          </header>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-baseline gap-2 text-sm">
              <input
                type="radio"
                name="optional-choice"
                checked={optionalIndex == null}
                onChange={() => onOptionalChange(null)}
              />
              <span className="italic text-[var(--color-ink-faint)]">
                Skip — no optional bonus
              </span>
            </label>
            {optionalList.map((opt, i) => {
              const parsed = parseOptionalBonus(opt.description);
              const hasWeaponSlot = parsed.weaponPlaceholder != null;
              const hasWarnings = parsed.warnings.length > 0;
              return (
                <label
                  key={i}
                  className="flex items-baseline gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="optional-choice"
                    checked={optionalIndex === i}
                    onChange={() => onOptionalChange(i)}
                  />
                  <span className="flex-1">
                    {opt.description}
                    {(hasWeaponSlot || hasWarnings) && (
                      <span className="ml-2 rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-1.5 py-0 text-[10px] text-[var(--color-rust)]">
                        WM applies manually
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}
    </ParchmentCard>
  );
}

function SpecializationStep({
  cls,
  gate,
  order,
  profession,
  onGate,
  onOrder,
  onProfession,
}: {
  cls: Class;
  gate: Gate | null;
  order: SpiritualistOrder | null;
  profession: TradesfolkProfession | null;
  onGate: (g: Gate) => void;
  onOrder: (o: SpiritualistOrder) => void;
  onProfession: (p: TradesfolkProfession) => void;
}): React.JSX.Element {
  if (cls.id === 'word-caster') {
    const gates: Gate[] = [
      'sun',
      'metal',
      'fire',
      'wood',
      'moon',
      'wind',
      'water',
      'earth',
    ];
    return (
      <ParchmentCard>
        <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
          Choose your Gate
        </h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {gates.map((g) => {
            const paired = cls.gates_with_paired_skills?.[g]?.paired_skill;
            return (
              <button
                key={g}
                type="button"
                onClick={() => onGate(g)}
                className={`rounded-sm border px-3 py-2 text-left text-sm capitalize transition-colors ${
                  gate === g
                    ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                    : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 hover:bg-[var(--color-parchment-200)]/40'
                }`}
              >
                <div className="font-display text-base">{g}</div>
                {paired && (
                  <div className="text-[10px] text-[var(--color-ink-faint)]">
                    Paired: {paired}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ParchmentCard>
    );
  }
  if (cls.id === 'spiritualist') {
    const orders: Array<{ id: SpiritualistOrder; name: string }> = [
      { id: 'monk-votarist', name: 'Monk — Votarist' },
      { id: 'monk-militant', name: 'Monk — Militant' },
      { id: 'invoker-evangelist', name: 'Invoker — Evangelist' },
      { id: 'invoker-denouncer', name: 'Invoker — Denouncer' },
    ];
    return (
      <ParchmentCard>
        <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
          Choose your Order
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onOrder(o.id)}
              className={`rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                order === o.id
                  ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                  : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 hover:bg-[var(--color-parchment-200)]/40'
              }`}
            >
              <div className="font-display text-base">{o.name}</div>
            </button>
          ))}
        </div>
      </ParchmentCard>
    );
  }
  if (cls.id === 'tradesfolk') {
    const professions: TradesfolkProfession[] = ['thief', 'bard', 'alchemist', 'doctor'];
    return (
      <ParchmentCard>
        <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
          Confirm your profession
        </h2>
        <p className="mb-2 text-xs text-[var(--color-ink-faint)]">
          Picked the same in the previous step? Great. This page makes the
          choice explicit on the character record.
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {professions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onProfession(p)}
              className={`rounded-sm border px-3 py-2 text-left text-sm capitalize transition-colors ${
                profession === p
                  ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                  : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 hover:bg-[var(--color-parchment-200)]/40'
              }`}
            >
              <div className="font-display text-base">{p}</div>
            </button>
          ))}
        </div>
      </ParchmentCard>
    );
  }
  return (
    <ParchmentCard>
      <p className="text-sm text-[var(--color-ink-soft)]">
        Warriors have no class-specific specialization beyond their skill
        package. Continue to abilities.
      </p>
    </ParchmentCard>
  );
}

function AbilityStep({
  abilities,
  locks,
  onChange,
  onLocksChange,
}: {
  abilities: Abilities;
  locks: AbilityCode[];
  onChange: (a: Abilities) => void;
  onLocksChange: (locks: AbilityCode[]) => void;
}): React.JSX.Element {
  const lockSet = React.useMemo(() => new Set(locks), [locks]);
  const validation = validateAbilityRoll(abilities);

  const setOne = (code: AbilityCode, value: number) =>
    onChange({ ...abilities, [code]: Math.max(1, Math.min(15, value)) });

  const rollOne = (code: AbilityCode) => setOne(code, roll3D5());

  const rollAll = () => onChange(rerollExcept(abilities, lockSet));

  const rollAllValid = () => {
    if (lockSet.size === 0) {
      onChange(rollValidSixAbilities());
      return;
    }
    // With locks set, the rule constraint may be unsatisfiable. Try a few
    // bounded attempts; on failure, fall back to a single un-validated roll.
    for (let i = 0; i < 50; i++) {
      const attempt = rerollExcept(abilities, lockSet);
      if (validateAbilityRoll(attempt).ok) {
        onChange(attempt);
        return;
      }
    }
    onChange(rollSixAbilities());
  };

  const toggleLock = (code: AbilityCode) => {
    onLocksChange(
      lockSet.has(code)
        ? locks.filter((c) => c !== code)
        : [...locks, code],
    );
  };

  return (
    <ParchmentCard>
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg text-[var(--color-ink)]">
          Roll abilities
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={rollAll}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2.5 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
          >
            Roll all 3D5
          </button>
          <button
            type="button"
            onClick={rollAllValid}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-2.5 py-1 text-xs hover:bg-[var(--color-gilt)]/25"
          >
            Roll until valid
          </button>
        </div>
      </header>
      <p className="mb-3 text-xs text-[var(--color-ink-faint)]">
        Roll 3D5 per ability (range 3–15). Lock a score to keep it on a re-roll.
        LUC has no Base value. Per Rule §03 §1.1 you must re-roll all six if
        three or more scores end up below 8, or any single score is above 13.
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {ABILITY_CODES.map((code) => {
          const locked = lockSet.has(code);
          return (
            <div
              key={code}
              className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-2"
            >
              <div className="mb-1 flex items-baseline justify-between gap-1">
                <span className="text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
                  <AcronymTooltip code={code} />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleLock(code)}
                    title={locked ? 'Unlock (allow re-roll)' : 'Lock (skip on re-roll all)'}
                    className={`rounded-sm border border-[var(--color-parchment-400)] px-1 py-0.5 text-[10px] ${
                      locked
                        ? 'bg-[var(--color-gilt)]/20 text-[var(--color-ink)]'
                        : 'bg-[var(--color-parchment-50)] text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]/60'
                    }`}
                    aria-pressed={locked}
                    aria-label={locked ? 'Locked' : 'Unlocked'}
                  >
                    {locked ? (
                      <Lock className="h-3 w-3" aria-hidden />
                    ) : (
                      <LockOpen className="h-3 w-3" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => rollOne(code)}
                    className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0.5 text-[10px] hover:bg-[var(--color-parchment-200)]/60"
                  >
                    Roll 3D5
                  </button>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={15}
                value={abilities[code]}
                onChange={(e) => setOne(code, parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-center font-mono text-lg"
              />
              {code !== 'LUC' && (
                <div className="mt-0.5 text-center text-[10px] text-[var(--color-ink-faint)]">
                  Base {Math.floor(abilities[code] / 3)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!validation.ok && (
        <div className="mt-3 rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/10 px-3 py-2 text-sm text-[var(--color-rust)]">
          {validation.reason}
        </div>
      )}
    </ParchmentCard>
  );
}

function EquipmentStep({
  cls,
  catalog,
  value,
  startingMoneyRoll,
  skillBonusGolda,
  onChange,
  onRollStartingMoney,
}: {
  cls: Class;
  catalog: ReferenceCatalog;
  value: string | null;
  startingMoneyRoll: number | null;
  skillBonusGolda: number;
  onChange: (id: string | null) => void;
  onRollStartingMoney: () => void;
}): React.JSX.Element {
  const packages = cls.equipment_packages ?? [];
  const purse = (startingMoneyRoll ?? 0) + skillBonusGolda;
  const selectedPkg = value
    ? packages.find((p) => p.id === value) ?? null
    : null;
  const equipCost = selectedPkg?.total_golda ?? 0;
  const remaining = purse - equipCost;

  return (
    <ParchmentCard className="flex flex-col gap-3">
      <header>
        <h2 className="font-display text-lg text-[var(--color-ink)]">
          Starting money
        </h2>
        <p className="text-xs text-[var(--color-ink-faint)]">
          Rule §03 step 4: <span className="font-mono">3D5 × 10</span>{' '}
          <UnitTooltip unit="golda" /> plus any skill-package bonus.
        </p>
      </header>

      <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono">
          <span>
            3D5×10:{' '}
            <span className="text-[var(--color-ink)]">
              {startingMoneyRoll ?? '—'}
            </span>
          </span>
          <span>
            + skill bonus:{' '}
            <span className="text-[var(--color-ink)]">{skillBonusGolda}</span>
          </span>
          <span>
            = purse:{' '}
            <span className="text-[var(--color-ink)]">
              {startingMoneyRoll != null ? (
                <UnitTooltip unit="golda" amount={purse} />
              ) : (
                '—'
              )}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={onRollStartingMoney}
          className="mt-2 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2.5 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
        >
          Re-roll 3D5×10
        </button>
      </div>

      {packages.length > 0 && (
        <>
          <h3 className="mt-1 font-display text-base text-[var(--color-ink)]">
            Choose an equipment package
          </h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={() => onChange(null)}
              className={`rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                value === null
                  ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                  : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 hover:bg-[var(--color-parchment-200)]/40'
              }`}
            >
              <div className="font-display text-base">No package</div>
              <div className="text-xs italic text-[var(--color-ink-faint)]">
                Keep all {purse} <UnitTooltip unit="golda" /> as starting purse.
              </div>
            </button>
            {packages.map((pkg) => {
              const cost = pkg.total_golda ?? 0;
              const wouldBeNegative = cost > purse;
              const preview = resolveKit(pkg.items, catalog);
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onChange(pkg.id)}
                  className={`rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                    value === pkg.id
                      ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                      : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 hover:bg-[var(--color-parchment-200)]/40'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-display text-base">{pkg.name}</div>
                    {pkg.total_golda != null && (
                      <span
                        className={`font-mono text-xs ${
                          wouldBeNegative
                            ? 'text-[var(--color-rust)]'
                            : 'text-[var(--color-ink-soft)]'
                        }`}
                      >
                        −<UnitTooltip unit="golda" amount={cost} />
                      </span>
                    )}
                  </div>
                  <ul className="mt-1 space-y-0.5 font-mono text-xs">
                    {preview.resolved.map((r, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="text-[var(--color-ink)]">{r.raw}</span>
                        {r.kind === 'armor' && r.slot && (
                          <span className="text-[10px] uppercase tracking-wider text-[var(--color-verdigris)]">
                            {r.slot}
                          </span>
                        )}
                        {r.kind === 'weapon' && (
                          <span className="text-[10px] uppercase tracking-wider text-[var(--color-rust)]">
                            weapon
                          </span>
                        )}
                        {r.kind === 'unmatched' && (
                          <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                            inv.
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {pkg.notes && (
                    <p className="mt-1 text-xs italic text-[var(--color-ink-faint)]">
                      {pkg.notes}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-3 py-2 text-sm font-mono">
            Remaining:{' '}
            <span
              className={
                remaining < 0
                  ? 'text-[var(--color-rust)]'
                  : 'text-[var(--color-verdigris)]'
              }
            >
              <UnitTooltip unit="golda" amount={Math.max(0, remaining)} />
            </span>
            {remaining < 0 && (
              <span className="ml-2 text-[var(--color-rust)]">
                (overspent by {Math.abs(remaining)})
              </span>
            )}
          </div>
        </>
      )}
    </ParchmentCard>
  );
}

type IdentityPatch = Partial<
  Pick<
    WizardState,
    | 'name'
    | 'age'
    | 'gender'
    | 'title'
    | 'homeland'
    | 'current_home'
    | 'family_relationships'
    | 'personality_notes'
    | 'ryude_name'
    | 'biography'
    | 'pending_portrait_source'
  >
>;

function IdentityStep({
  state,
  onChange,
  classId,
}: {
  state: WizardState;
  onChange: (patch: IdentityPatch) => void;
  classId: ClassId | null;
}): React.JSX.Element {
  return (
    <ParchmentCard className="flex flex-col gap-3">
      <h2 className="mb-1 font-display text-lg text-[var(--color-ink)]">
        Identity
      </h2>
      <p className="text-xs text-[var(--color-ink-faint)]">
        All fields except Name are optional — you can fill them later from the
        character sheet's Edit form. Mirrors the official sheet's identity
        block (Playkit p. 79).
      </p>

      <PortraitPicker
        classId={classId}
        name={state.name || 'New character'}
        mode={{
          kind: 'deferred',
          pendingSource: state.pending_portrait_source,
          onPendingChange: (s) => onChange({ pending_portrait_source: s }),
        }}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Name" required>
          <input
            type="text"
            value={state.name}
            required
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Mira of Teela-tein"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Title">
          <input
            type="text"
            value={state.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Knight-Errant"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Gender">
          <input
            type="text"
            value={state.gender}
            onChange={(e) => onChange({ gender: e.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Age">
          <input
            type="number"
            min={1}
            value={state.age ?? ''}
            onChange={(e) =>
              onChange({
                age: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Homeland">
          <input
            type="text"
            value={state.homeland}
            onChange={(e) => onChange({ homeland: e.target.value })}
            placeholder="Teela-tein"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Current home">
          <input
            type="text"
            value={state.current_home}
            onChange={(e) => onChange({ current_home: e.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Ryude name">
          <input
            type="text"
            value={state.ryude_name}
            onChange={(e) => onChange({ ryude_name: e.target.value })}
            placeholder="Az-Cude"
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      <Field label="Family / Relationships">
        <textarea
          rows={2}
          value={state.family_relationships}
          onChange={(e) => onChange({ family_relationships: e.target.value })}
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="Personality">
        <textarea
          rows={2}
          value={state.personality_notes}
          onChange={(e) => onChange({ personality_notes: e.target.value })}
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="Biography">
        <textarea
          value={state.biography}
          onChange={(e) => onChange({ biography: e.target.value })}
          rows={6}
          placeholder="Background, motivations, allegiances. Saved alongside the character as a Markdown file."
          className={INPUT_CLASS}
        />
      </Field>
    </ParchmentCard>
  );
}

function ConfirmStep({
  state,
  cls,
  catalog,
}: {
  state: WizardState;
  cls: Class;
  catalog: ReferenceCatalog;
}): React.JSX.Element {
  const { skills: rawSkills, bonusGolda } = pickedSkills(state, cls);

  const extraSkills: SkillEntryRaw[] = [];
  let pairedSkillName: string | null = null;
  if (cls.id === 'word-caster' && state.word_caster_gate) {
    const paired = pairedSkillForGate(state.word_caster_gate, cls);
    if (paired) {
      pairedSkillName = paired.pairedSkillName;
      extraSkills.push({ name: 'Word-Casting', level: 2 });
      extraSkills.push({ name: paired.pairedSkillName, level: 2 });
    }
  }
  const resolved = resolveSkillPackage(
    rawSkills,
    state.weapon_allocations,
    catalog,
    extraSkills,
  );

  // Mirror buildDraft's optional-bonus application so the preview matches.
  let resolvedSkills = resolved.skills;
  let optionalGoldaBonus = 0;
  let optionalDescription: string | null = null;
  const skillPkg = cls.skill_packages?.find(
    (p) => p.id === state.skill_package_id,
  );
  if (
    skillPkg?.optional_choose_one &&
    state.optional_choice_index != null &&
    state.optional_choice_index < skillPkg.optional_choose_one.length
  ) {
    optionalDescription =
      skillPkg.optional_choose_one[state.optional_choice_index]!.description;
    const parsed = parseOptionalBonus(optionalDescription);
    optionalGoldaBonus = parsed.goldaBonus;
    resolvedSkills = applyOptionalSkillBonuses(
      resolvedSkills,
      parsed.skills,
      (name) => skillNameToId(name, catalog.skills.skills),
    );
  }

  const equipPkg = cls.equipment_packages?.find(
    (p) => p.id === state.equipment_package_id,
  );
  const kit = equipPkg ? resolveKit(equipPkg.items, catalog) : null;

  const purse = (state.starting_money_roll ?? 0) + bonusGolda + optionalGoldaBonus;
  const equipCost = equipPkg?.total_golda ?? 0;
  const purchaseResult = resolveAdditionalPurchases(
    catalog,
    purse - equipCost,
    state.additional_purchases,
  );
  const finalGolda = Math.max(0, purchaseResult.remaining);

  const skillLabel = (id: string): string =>
    catalog.skills.skills.find((s) => s.id === id)?.name ?? id;

  return (
    <ParchmentCard className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Portrait classId={cls.id} name={state.name || 'New character'} size="lg" />
        <div className="flex-1">
          <h2 className="font-display text-2xl text-[var(--color-ink)]">
            {state.name || 'Unnamed'}
          </h2>
          <div className="text-sm italic text-[var(--color-ink-soft)]">
            {cls.name}
            {state.word_caster_gate
              ? ` · Gate of ${cap(state.word_caster_gate)}`
              : ''}
            {state.spiritualist_order
              ? ` · ${state.spiritualist_order
                  .split('-')
                  .map(cap)
                  .join(' · ')}`
              : ''}
            {state.tradesfolk_profession
              ? ` · ${cap(state.tradesfolk_profession)}`
              : ''}
          </div>
          {(state.title ||
            state.age != null ||
            state.gender ||
            state.homeland) && (
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-[var(--color-ink-faint)]">
              {state.title && <span>{state.title}</span>}
              {state.gender && <span>{state.gender}</span>}
              {state.age != null && <span>age {state.age}</span>}
              {state.homeland && <span>from {state.homeland}</span>}
            </div>
          )}
        </div>
      </header>

      <SealedDivider />

      <section>
        <SectionHeader>Abilities</SectionHeader>
        <dl className="grid grid-cols-3 gap-2 text-sm md:grid-cols-6">
          {ABILITY_CODES.map((code) => (
            <div
              key={code}
              className="flex flex-col items-center rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/70 px-2 py-1.5"
            >
              <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                <AcronymTooltip code={code} />
              </dt>
              <dd className="font-mono text-lg leading-tight">
                {state.abilities[code]}
              </dd>
              {code !== 'LUC' && (
                <div className="text-[10px] text-[var(--color-ink-faint)]">
                  Base {Math.floor(state.abilities[code] / 3)}
                </div>
              )}
            </div>
          ))}
        </dl>
      </section>

      <section>
        <SectionHeader>
          Skills{' '}
          <span className="ml-1 normal-case text-[var(--color-ink-faint)]">
            ({equipPkg ? `${pickedPackageName(state, cls)} package` : pickedPackageName(state, cls)})
          </span>
        </SectionHeader>
        {resolvedSkills.length === 0 ? (
          <p className="text-sm italic text-[var(--color-ink-faint)]">
            No skills resolved.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
            {resolvedSkills.map((s) => (
              <li
                key={s.skill_id}
                className="flex items-baseline justify-between rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1"
              >
                <span>{skillLabel(s.skill_id)}</span>
                <span className="font-mono text-xs text-[var(--color-ink-soft)]">
                  Lv {s.level}
                </span>
              </li>
            ))}
          </ul>
        )}
        {pairedSkillName && (
          <p className="mt-2 text-[11px] italic text-[var(--color-ink-faint)]">
            Word-Casting and {pairedSkillName} added at Level 2 (Rule §03 §5).
          </p>
        )}
        {optionalDescription && (
          <p className="mt-2 text-[11px] italic text-[var(--color-ink-faint)]">
            Optional bonus applied: <span className="not-italic">{optionalDescription}</span>
          </p>
        )}
        {resolved.errors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-[var(--color-rust)]">
            {resolved.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </section>

      {equipPkg && (
        <section>
          <SectionHeader>Equipment</SectionHeader>
          <div className="text-xs italic text-[var(--color-ink-faint)]">
            {equipPkg.name}
          </div>
          {kit && (
            <ul className="mt-1 space-y-0.5 font-mono text-xs">
              {kit.weaponIds.map((id) => (
                <li key={`w-${id}`}>
                  ⚔ {catalog.weapons.weapons.find((w) => w.id === id)?.name ?? id}
                </li>
              ))}
              {kit.bodyArmorId && (
                <li>
                  ◯ Body:{' '}
                  {catalog.armor.find((a) => a.id === kit.bodyArmorId)?.name ??
                    kit.bodyArmorId}
                </li>
              )}
              {kit.headArmorId && (
                <li>
                  ◯ Head:{' '}
                  {catalog.armor.find((a) => a.id === kit.headArmorId)?.name ??
                    kit.headArmorId}
                </li>
              )}
              {kit.shieldId && (
                <li>
                  ◯ Shield:{' '}
                  {catalog.armor.find((a) => a.id === kit.shieldId)?.name ??
                    kit.shieldId}
                </li>
              )}
              {kit.other.map((item, i) => (
                <li key={`o-${i}`}>· {item.item_id}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {purchaseResult.lines.length > 0 && (
        <section>
          <SectionHeader>Additional purchases</SectionHeader>
          <ul className="space-y-0.5 font-mono text-xs">
            {purchaseResult.lines.map((l) => (
              <li key={l.itemId} className="flex items-baseline justify-between">
                <span>
                  {l.qty > 1 ? `${l.qty}× ` : ''}
                  {l.name}
                </span>
                <span className="text-[var(--color-ink-soft)]">
                  −<UnitTooltip unit="golda" amount={l.totalPrice} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-3 py-2 text-xs font-mono">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
          <span>
            Purse: <UnitTooltip unit="golda" amount={purse} />
          </span>
          {equipCost > 0 && (
            <span>
              − pkg: <UnitTooltip unit="golda" amount={equipCost} />
            </span>
          )}
          {purchaseResult.totalCost > 0 && (
            <span>
              − extras:{' '}
              <UnitTooltip unit="golda" amount={purchaseResult.totalCost} />
            </span>
          )}
          <span className="font-medium text-[var(--color-verdigris)]">
            = <UnitTooltip unit="golda" amount={finalGolda} />
          </span>
        </div>
      </section>

      {state.biography && (
        <section>
          <SectionHeader>Biography</SectionHeader>
          <p className="whitespace-pre-line text-xs italic text-[var(--color-ink-soft)]">
            {state.biography}
          </p>
        </section>
      )}
    </ParchmentCard>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h3 className="mb-1 font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
      {children}
    </h3>
  );
}

function pickedPackageName(state: WizardState, cls: Class): string {
  if (cls.id === 'tradesfolk') {
    const prof = cls.professions?.find((p) => p.id === state.skill_package_id);
    return prof?.name ?? state.skill_package_id ?? '';
  }
  const pkg = cls.skill_packages?.find((p) => p.id === state.skill_package_id);
  return pkg?.name ?? state.skill_package_id ?? '';
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- Skill Specialties (Weapon allocation) ---------- */

function SpecializeStep({
  placeholders,
  allocations,
  weapons,
  onChange,
}: {
  placeholders: PlaceholderSlot[];
  allocations: AllocationMap;
  weapons: Weapon[];
  onChange: (next: AllocationMap) => void;
}): React.JSX.Element {
  return (
    <ParchmentCard className="flex flex-col gap-3">
      <header>
        <h2 className="font-display text-lg text-[var(--color-ink)]">
          Specialize skill placeholders
        </h2>
        <p className="text-xs text-[var(--color-ink-faint)]">
          Each weapon type is its own Skill in Wares Blade — there is no
          generic "weapon" Skill (Rule §05). Allocate the package's weapon
          levels across the specific weapons you want your character to
          have practiced with. Splitting (e.g. Longsword Lv 1 + Dagger Lv 1)
          is allowed; the totals must match the package level.
        </p>
      </header>
      {placeholders.map((slot) => (
        <WeaponSlotPanel
          key={slot.slotId}
          slot={slot}
          allocation={allocations[slot.slotId] ?? []}
          weapons={weapons}
          onChange={(next) =>
            onChange({ ...allocations, [slot.slotId]: next })
          }
        />
      ))}
    </ParchmentCard>
  );
}

function WeaponSlotPanel({
  slot,
  allocation,
  weapons,
  onChange,
}: {
  slot: PlaceholderSlot;
  allocation: WeaponAllocation[];
  weapons: Weapon[];
  onChange: (next: WeaponAllocation[]) => void;
}): React.JSX.Element {
  const allocated = allocation.reduce((acc, a) => acc + a.level, 0);
  const remaining = slot.level - allocated;

  const weaponsById = React.useMemo(() => {
    const map = new Map<string, Weapon>();
    for (const w of weapons) map.set(w.id, w);
    return map;
  }, [weapons]);

  const setLevel = (specificId: string, nextLevel: number) => {
    const filtered = allocation.filter((a) => a.specificId !== specificId);
    if (nextLevel > 0) {
      filtered.push({ specificId, level: nextLevel });
    }
    // Sort for stable display.
    filtered.sort((a, b) => a.specificId.localeCompare(b.specificId));
    onChange(filtered);
  };

  const levelFor = (id: string): number =>
    allocation.find((a) => a.specificId === id)?.level ?? 0;

  // Group weapons by category for readability.
  const groups = React.useMemo(() => {
    const byCat = new Map<string, Weapon[]>();
    for (const w of weapons) {
      const arr = byCat.get(w.category) ?? [];
      arr.push(w);
      byCat.set(w.category, arr);
    }
    return Array.from(byCat.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [weapons]);

  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-display text-base text-[var(--color-ink)]">
          {slot.rawName} — Lv {slot.level}
        </div>
        <div
          className={`font-mono text-xs ${
            allocated === slot.level
              ? 'text-[var(--color-verdigris)]'
              : 'text-[var(--color-rust)]'
          }`}
        >
          {allocated} / {slot.level} allocated
          {remaining > 0 && ` · ${remaining} left`}
          {remaining < 0 && ` · ${-remaining} over`}
        </div>
      </div>

      {allocation.length > 0 && (
        <ul className="mb-2 space-y-0.5 font-mono text-xs">
          {allocation.map((a) => (
            <li key={a.specificId} className="flex items-baseline justify-between">
              <span>
                {weaponsById.get(a.specificId)?.name ?? a.specificId} — Lv{' '}
                {a.level}
              </span>
              <button
                type="button"
                onClick={() => setLevel(a.specificId, 0)}
                className="text-[10px] text-[var(--color-ink-faint)] hover:text-[var(--color-rust)]"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex max-h-72 flex-col gap-2 overflow-auto pr-1">
        {groups.map(([category, list]) => (
          <div key={category}>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              {category}
            </div>
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              {list.map((w) => {
                const lvl = levelFor(w.id);
                const max = slot.level;
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs"
                  >
                    <span className="font-medium">{w.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLevel(w.id, Math.max(0, lvl - 1))}
                        disabled={lvl === 0}
                        className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0 text-[10px] disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-mono">{lvl}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setLevel(w.id, Math.min(max, lvl + 1))
                        }
                        disabled={allocated >= max && lvl < max}
                        className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0 text-[10px] disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Additional Golda ---------- */

function AdditionalGoldaStep({
  catalog,
  remainingBeforePurchase,
  purchases,
  onChange,
}: {
  catalog: ReferenceCatalog;
  remainingBeforePurchase: number;
  purchases: PurchaseSelection[];
  onChange: (next: PurchaseSelection[]) => void;
}): React.JSX.Element {
  type Tab = 'weapons' | 'armor' | 'goods';
  const [tab, setTab] = React.useState<Tab>('weapons');

  const result = resolveAdditionalPurchases(
    catalog,
    remainingBeforePurchase,
    purchases,
  );

  const setQty = (itemId: string, qty: number) => {
    const filtered = purchases.filter((p) => p.itemId !== itemId);
    if (qty > 0) filtered.push({ itemId, qty });
    onChange(filtered);
  };
  const qtyFor = (itemId: string): number =>
    purchases.find((p) => p.itemId === itemId)?.qty ?? 0;

  return (
    <ParchmentCard className="flex flex-col gap-3">
      <header>
        <h2 className="font-display text-lg text-[var(--color-ink)]">
          Spend remaining golda
        </h2>
        <p className="text-xs text-[var(--color-ink-faint)]">
          Rule §03 step 6: any golda left over after the equipment package
          may be spent on additional weapons, armor, or general goods. What
          you don't spend stays as your starting purse.
        </p>
      </header>

      <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-3 py-2 text-sm font-mono">
        <span>
          Available: <UnitTooltip unit="golda" amount={remainingBeforePurchase} />
        </span>
        {result.totalCost > 0 && (
          <span className="ml-3">
            − spent: <UnitTooltip unit="golda" amount={result.totalCost} />
          </span>
        )}
        <span
          className={`ml-3 ${
            result.remaining < 0
              ? 'text-[var(--color-rust)]'
              : 'text-[var(--color-verdigris)]'
          }`}
        >
          = remaining:{' '}
          <UnitTooltip unit="golda" amount={Math.max(0, result.remaining)} />
          {result.remaining < 0 && (
            <span className="ml-1">(over by {-result.remaining})</span>
          )}
        </span>
      </div>

      <div className="flex gap-1 text-xs">
        {(['weapons', 'armor', 'goods'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-sm border px-3 py-1 capitalize ${
              tab === t
                ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] hover:bg-[var(--color-parchment-200)]/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-auto pr-1">
        {tab === 'weapons' && (
          <PurchaseList
            items={catalog.weapons.weapons.map((w) => ({
              id: w.id,
              name: w.name,
              meta: `${w.category} · ${typeof w.hands === 'number' ? `${w.hands}H` : w.hands}`,
              price: typeof w.price_golda === 'number' ? w.price_golda : null,
            }))}
            qtyFor={qtyFor}
            setQty={setQty}
            remaining={result.remaining}
          />
        )}
        {tab === 'armor' && (
          <PurchaseList
            items={catalog.armor.map((a: Armor) => ({
              id: a.id,
              name: a.name,
              meta: `${a.slot} · abs ${a.absorption}, mod ${a.armor_modifier}`,
              price: a.price_golda,
            }))}
            qtyFor={qtyFor}
            setQty={setQty}
            remaining={result.remaining}
          />
        )}
        {tab === 'goods' && (
          <PurchaseList
            items={catalog.generalGoods.goods.map((g: GeneralGood) => ({
              id: g.id,
              name: g.name,
              meta: g.category,
              price: typeof g.price_golda === 'number' ? g.price_golda : null,
            }))}
            qtyFor={qtyFor}
            setQty={setQty}
            remaining={result.remaining}
          />
        )}
      </div>

      {result.invalid.length > 0 && (
        <ul className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-2 text-xs text-[var(--color-rust)]">
          {result.invalid.map((i, k) => (
            <li key={k}>
              {i.itemId}: {i.reason}
            </li>
          ))}
        </ul>
      )}
    </ParchmentCard>
  );
}

function PurchaseList({
  items,
  qtyFor,
  setQty,
  remaining,
}: {
  items: Array<{ id: string; name: string; meta: string; price: number | null }>;
  qtyFor: (id: string) => number;
  setQty: (id: string, qty: number) => void;
  remaining: number;
}): React.JSX.Element {
  return (
    <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
      {items.map((it) => {
        const q = qtyFor(it.id);
        const canIncrement =
          it.price != null && (q > 0 || it.price <= remaining);
        return (
          <li
            key={it.id}
            className="flex items-center justify-between rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs"
          >
            <div className="min-w-0">
              <div className="font-medium">{it.name}</div>
              <div className="text-[10px] text-[var(--color-ink-faint)]">
                {it.meta}
                {it.price != null && (
                  <span className="ml-2 font-mono">
                    <UnitTooltip unit="golda" amount={it.price} />
                  </span>
                )}
                {it.price == null && (
                  <span className="ml-2 italic">price varies</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQty(it.id, Math.max(0, q - 1))}
                disabled={q === 0}
                className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0 text-[10px] disabled:opacity-30"
              >
                −
              </button>
              <span className="w-5 text-center font-mono">{q}</span>
              <button
                type="button"
                onClick={() => setQty(it.id, q + 1)}
                disabled={!canIncrement}
                className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0 text-[10px] disabled:opacity-30"
              >
                +
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const INPUT_CLASS =
  'w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 font-body text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gilt)]/40';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
        {required && <span className="ml-1 text-[var(--color-rust)]">*</span>}
      </span>
      {children}
    </label>
  );
}
