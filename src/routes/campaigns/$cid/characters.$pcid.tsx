import * as React from 'react';
import {
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { Pencil, Trash2, X } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
  SealedDivider,
} from '@/components/parchment/ParchmentCard';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { Portrait } from '@/components/portraits/Portrait';
import { PortraitPicker } from '@/components/portraits/PortraitPicker';
import { StatBlock } from '@/components/stat/StatBlock';
import {
  CombatLegend,
  DerivedStatsBlock,
} from '@/components/stat/DerivedStatsBlock';
import { AbsorptionPanel } from '@/components/stat/AbsorptionPanel';
import { WeaponsTable } from '@/components/stat/WeaponsTable';
import { DurabilityTracks } from '@/components/stat/DurabilityTracks';
import { WordCasterPanel } from '@/components/stat/WordCasterPanel';
import { SpiritualistPanel } from '@/components/stat/SpiritualistPanel';
import { EquippedGearPanel } from '@/components/stat/EquippedGearPanel';
import { InventoryPanel } from '@/components/stat/InventoryPanel';
import { GearShop } from '@/components/stat/GearShop';
import { ClassBenefitsSection } from '@/components/stat/ClassBenefitsSection';
import { ActiveEffectsPanel } from '@/components/stat/ActiveEffectsPanel';
import { RecoveryPreview } from '@/components/stat/RecoveryPreview';
import { StatusBanner } from '@/components/stat/StatusBanner';
import { QuickAdjust } from '@/components/stat/QuickAdjust';
import { ActionPanel } from '@/components/sheet/ActionPanel';
import { ActionLog } from '@/components/sheet/ActionLog';
import { useSheetDialogs } from '@/components/sheet/useSheetDialogs';
import { SheetActionsProvider } from '@/components/sheet/SheetActionsContext';
import { SkillsList } from '@/components/stat/SkillsList';
import { SheetDialogsRoot } from '@/components/sheet/SheetDialogsRoot';
import { useActionLogStore } from '@/stores/action-log-store';
import type { ActionLogEntry } from '@/domain/action-log';

/**
 * Module-level stable empty array — used as the fallback for the
 * action-log Zustand selector so the same reference is returned on every
 * render when the campaign's log isn't yet cached. Returning `[]` literal
 * inline would trigger an infinite re-render loop.
 */
const EMPTY_LOG: ActionLogEntry[] = [];
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RequireVault } from '@/components/shell/RequireVault';
import { useCampaignStore } from '@/stores/campaign-store';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  getCharacter,
  updateCharacter,
  deleteCharacter,
} from '@/persistence/character-repo';
import { removeCharacterPortrait } from '@/persistence/portrait-repo';
import { vaultExists, vaultReadText, vaultWriteText } from '@/persistence/vault';
import {
  characterMarkdownPath,
  campaignPaths,
} from '@/persistence/paths';
import { parseMarkdown } from '@/persistence/markdown';
import type {
  Character,
  CharacterStatus,
} from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import { deriveCombatValues } from '@/engine/derive/combat-values';
import { buildWeaponLines } from '@/engine/derive/weapon-lines';
import { deriveStatus, effectiveStatus } from '@/engine/derive/status';
import { equipmentPackageName } from '@/lib/labels';
import {
  equipItem,
  unequipItem,
  dropInventoryItem,
  sellInventoryItem,
  addInventoryItem,
  setBastardGrip,
  type UnequipTarget,
} from '@/engine/equipment/apply';
import type { BastardSwordGrip } from '@/domain/character';
import type { CustomItem } from '@/domain/custom-item';
import { useCustomItemStore } from '@/stores/custom-item-store';

export const Route = createFileRoute('/campaigns/$cid/characters/$pcid')({
  component: CharacterSheet,
});

function CharacterSheet(): React.JSX.Element {
  // Force a full unmount + remount of the inner sheet whenever we switch
  // characters within the same campaign. TanStack Router reuses this route
  // component when only the `$pcid` param changes, so without the key React
  // would keep all of the sheet's state — including the previously-loaded
  // `character` object, refs, and in-flight `reload()` promises. That let
  // a late-resolving fetch stomp `setCharacter(prevCharacter)` over the new
  // one, and auto-effects then wrote the mongrel state back to disk —
  // showing up as the previous character's weapons accumulating on the new
  // sheet. A fresh mount per `pcid` makes every navigation a clean slate.
  const { pcid } = useParams({
    from: '/campaigns/$cid/characters/$pcid',
  });
  return (
    <RequireVault>
      <CharacterSheetInner key={pcid} />
    </RequireVault>
  );
}

function CharacterSheetInner(): React.JSX.Element {
  const { cid, pcid } = useParams({
    from: '/campaigns/$cid/characters/$pcid',
  });
  const navigate = useNavigate();
  const current = useCampaignStore((s) => s.current);
  const loadByDir = useCampaignStore((s) => s.loadByDir);
  const { catalog } = useReferenceData();

  const [character, setCharacter] = React.useState<Character | null>(null);
  const [bio, setBio] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const lastSyncedStatus = React.useRef<string | null>(null);

  const reload = React.useCallback(async () => {
    const ch = await getCharacter(cid, pcid);
    if (!ch) {
      void navigate({ to: '/campaigns/$cid', params: { cid } });
      return;
    }
    setCharacter(ch);

    const paths = campaignPaths(cid);
    const mdPath = characterMarkdownPath(paths.dir, pcid);
    try {
      if (await vaultExists(mdPath)) {
        const text = await vaultReadText(mdPath);
        const doc = parseMarkdown<Record<string, unknown>>(text);
        setBio(doc.body.trim());
      } else {
        setBio('');
      }
    } catch {
      // biography optional
    }
  }, [cid, pcid, navigate]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!current) await loadByDir(cid);
      if (cancelled) return;
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cid, current, loadByDir, reload]);

  // Auto-sync status to disk when the derivation diverges from the stored
  // value (and the WM hasn't pinned a manual override). MUST sit above any
  // early returns so the hook order stays stable across loading → ready
  // transitions. Guarded by a ref so we don't write-amplify across renders.
  React.useEffect(() => {
    if (!character || !catalog) return;
    if (character.state.status_override) return;
    const d = deriveCombatValues(character, catalog);
    const next = deriveStatus(character, d);
    if (next === character.state.status) return;
    if (lastSyncedStatus.current === next) return;
    lastSyncedStatus.current = next;
    const updated: Character = {
      ...character,
      state: { ...character.state, status: next },
    };
    setCharacter(updated);
    void updateCharacter(cid, updated);
  }, [character, catalog, cid]);

  // Global custom items store
  const customItems = useCustomItemStore((s) => s.items ?? []);
  const loadCustomItems = useCustomItemStore((s) => s.load);
  const createCustomItemGlobal = useCustomItemStore((s) => s.create);

  React.useEffect(() => {
    void loadCustomItems();
  }, [loadCustomItems]);

  // Silently migrate legacy per-character custom_items to global store
  React.useEffect(() => {
    if (!character || character.custom_items.length === 0) return;
    void (async () => {
      const existing = await loadCustomItems({ force: true });
      const existingIds = new Set(existing.map((i) => i.id));
      for (const item of character.custom_items) {
        if (!existingIds.has(item.id)) {
          await createCustomItemGlobal(item);
        }
      }
      const migrated: Character = { ...character, custom_items: [] };
      setCharacter(migrated);
      await updateCharacter(cid, migrated);
    })();
  }, [character?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dialogs = useSheetDialogs();
  // Don't `?? EMPTY_LOG` inside the selector: that returns a fresh array
  // every render when the campaign's log isn't yet cached, which Zustand
  // sees as a new value and triggers an infinite render loop. Select the
  // raw value (Character[] | undefined) and fall back outside the hook.
  const cachedEntries = useActionLogStore(
    (s) => s.entriesByCampaign[cid],
  );
  const logEntries = cachedEntries ?? EMPTY_LOG;
  const logLoading = useActionLogStore((s) => !!s.loading[cid]);
  const loadLog = useActionLogStore((s) => s.load);
  const clearLog = useActionLogStore((s) => s.clear);

  React.useEffect(() => {
    void loadLog(cid);
  }, [cid, loadLog]);

  if (loading || !character) {
    return (
      <ParchmentCard className="mx-auto max-w-2xl">
        Loading character…
      </ParchmentCard>
    );
  }

  const derived = deriveCombatValues(character, catalog);
  const weaponLines = buildWeaponLines(character, catalog, derived.baseBN, customItems);
  const cls = catalog?.classes.classes.find((c) => c.id === character.class_id);
  const displayedStatus = effectiveStatus(character, derived);
  const onCharacterChange = async (next: Character) => {
    setCharacter(next);
    await updateCharacter(cid, next);
  };

  return (
    <SheetActionsProvider value={dialogs}>
    <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="flex w-full flex-col gap-4">
      {/* Identity block */}
      <ParchmentCard className="flex flex-col gap-4">
        <header className="flex items-center gap-4">
          <Portrait
            vaultPath={character.portrait_path}
            classId={character.class_id}
            name={character.name}
            size="lg"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <IlluminatedHeading level={1}>{character.name}</IlluminatedHeading>
              {character.title && (
                <span className="font-display text-base italic text-[var(--color-ink-soft)]">
                  {character.title}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm italic text-[var(--color-ink-soft)]">
              {classLabel(character)}
              {(() => {
                const pkg = equipmentPackageName(character, catalog);
                return pkg ? ` · ${pkg}` : '';
              })()}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--color-ink-faint)]">
              {character.gender && <span>{character.gender}</span>}
              {character.age != null && <span>age {character.age}</span>}
              {character.homeland && <span>from {character.homeland}</span>}
              {character.current_home && (
                <span>now in {character.current_home}</span>
              )}
              {character.ryude_name && (
                <span>Ryude: {character.ryude_name}</span>
              )}
              <span className="font-mono">{character.id}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-xs hover:bg-[var(--color-parchment-200)]/60"
            >
              {editing ? (
                <>
                  <X className="h-3.5 w-3.5" aria-hidden /> Cancel
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </>
              )}
            </button>
            {!editing && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
              </button>
            )}
          </div>
        </header>

        {(character.family_relationships || character.personality_notes) && !editing && (
          <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            {character.family_relationships && (
              <FieldDisplay
                label="Family / Relationships"
                value={character.family_relationships}
              />
            )}
            {character.personality_notes && (
              <FieldDisplay
                label="Personality"
                value={character.personality_notes}
              />
            )}
          </div>
        )}

        <SealedDivider />

        {editing ? (
          <EditForm
            character={character}
            initialBio={bio}
            cid={cid}
            pcid={pcid}
            onSaved={async () => {
              setEditing(false);
              await reload();
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <CombatLegend />
            <section>
              <h2 className="mb-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
                Abilities
              </h2>
              <StatBlock scores={character.abilities} />
            </section>

            <section>
              <h2 className="mb-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
                Derived
              </h2>
              <DerivedStatsBlock values={derived} />
            </section>

            <ActionPanel
              character={character}
              derived={derived}
              onChange={onCharacterChange}
            />

            <section className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              <QuickAdjust
                label={
                  <>
                    Available <AcronymTooltip code="LUC" />
                  </>
                }
                value={character.state.available_luc}
                display={`${character.state.available_luc} / ${character.initial_luc}`}
                min={0}
                max={character.initial_luc}
                onChange={async (next) => {
                  const updated: Character = {
                    ...character,
                    state: { ...character.state, available_luc: next },
                  };
                  setCharacter(updated);
                  await updateCharacter(cid, updated);
                }}
              />
              <QuickAdjust
                label="Golda"
                value={character.golda}
                display={<UnitTooltip unit="golda" amount={character.golda} />}
                min={0}
                onChange={async (next) => {
                  const updated: Character = { ...character, golda: next };
                  setCharacter(updated);
                  await updateCharacter(cid, updated);
                }}
              />
              <QuickAdjust
                label="Completion bonus"
                value={character.completion_bonus}
                min={0}
                onChange={async (next) => {
                  const updated: Character = {
                    ...character,
                    completion_bonus: next,
                  };
                  setCharacter(updated);
                  await updateCharacter(cid, updated);
                }}
              />
              <KV
                label={<><AcronymTooltip code="LUC" /> reserves</>}
                value={String(character.luc_reserves)}
              />
              <KV
                label={
                  character.state.status_override ? 'Status (manual)' : 'Status'
                }
                value={
                  <span
                    className={
                      displayedStatus === 'fine'
                        ? ''
                        : displayedStatus === 'heavy-physical' ||
                            displayedStatus === 'heavy-mental'
                          ? 'text-[var(--color-rust)]'
                          : displayedStatus === 'dead' ||
                              displayedStatus === 'insane'
                            ? 'text-[var(--color-rust)] line-through'
                            : 'text-[var(--color-rust)] font-medium'
                    }
                  >
                    {displayedStatus}
                  </span>
                }
              />
              {character.class_id === 'word-caster' && (
                <QuickAdjust
                  label="MP spent"
                  value={character.memory_points_spent}
                  min={0}
                  onChange={async (next) => {
                    const updated: Character = {
                      ...character,
                      memory_points_spent: next,
                    };
                    setCharacter(updated);
                    await updateCharacter(cid, updated);
                  }}
                />
              )}
            </section>

            <ClassBenefitsSection
              character={character}
              derived={derived}
              classEntry={cls ?? null}
              actions={dialogs}
            />
          </>
        )}
      </ParchmentCard>

      {/* Status banner — one per axis when applicable (rule §09 stages) */}
      {!editing && (
        <StatusBanner
          character={character}
          derived={derived}
          onResurrect={async () => {
            const updated: Character = {
              ...character,
              state: {
                ...character.state,
                physical_damage: 0,
                mental_damage: 0,
                status: 'fine',
                status_override: false,
              },
            };
            setCharacter(updated);
            lastSyncedStatus.current = 'fine';
            await updateCharacter(cid, updated);
          }}
        />
      )}

      {/* Damage tracks + recovery preview */}
      {!editing && (
        <ParchmentCard className="flex flex-col gap-4">
          <DurabilityTracks
            label="Physical"
            durability={derived.physicalDurability}
            current={character.state.physical_damage}
            resistanceLevel={derived.physicalResistanceLevel}
            onChange={async (next) => {
              const updated: Character = {
                ...character,
                state: { ...character.state, physical_damage: next },
              };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
          />
          <DurabilityTracks
            label="Mental"
            durability={derived.mentalDurability}
            current={character.state.mental_damage}
            resistanceLevel={derived.mentalResistanceLevel}
            onChange={async (next) => {
              const updated: Character = {
                ...character,
                state: { ...character.state, mental_damage: next },
              };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
          />
          <RecoveryPreview character={character} derived={derived} />
          <p className="text-[10px] italic text-[var(--color-ink-faint)]">
            Click a cell to set damage to that value; click the current cell
            to clear back one. Use the ± buttons in the header for quick
            ±1/±5 adjustments or "full" to heal completely.
          </p>
        </ParchmentCard>
      )}

      {/* Equipped gear + absorption + weapons */}
      {!editing && catalog && (
        <>
          <EquippedGearPanel
            character={character}
            catalog={catalog}
            customItems={customItems}
            onUnequip={async (target: UnequipTarget) => {
              const result = unequipItem(character, target);
              const updated = { ...character, equipment: result.equipment };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
            onSetBastardGrip={async (grip: BastardSwordGrip) => {
              const result = setBastardGrip(character, grip, catalog);
              const updated = { ...character, equipment: result.equipment };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
          />
          <AbsorptionPanel character={character} catalog={catalog} derived={derived} customItems={customItems} />
          <WeaponsTable lines={weaponLines} />
        </>
      )}

      {/* Skills */}
      {!editing && (
        <ParchmentCard className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-[var(--color-ink)]">
            Skills
          </h2>
          <SkillsList character={character} catalog={catalog} />
        </ParchmentCard>
      )}

      {/* Class-specific panels */}
      {!editing && (
        <>
          <WordCasterPanel character={character} derived={derived} catalog={catalog} />
          <SpiritualistPanel character={character} derived={derived} catalog={catalog} />
        </>
      )}

      {/* Active effects (WM-managed in Phase 3) */}
      {!editing && (
        <ActiveEffectsPanel
          character={character}
          onChange={async (next) => {
            const updated: Character = {
              ...character,
              state: { ...character.state, active_effects: next },
            };
            await updateCharacter(cid, updated);
            await reload();
          }}
        />
      )}

      {/* Inventory + gear shop */}
      {!editing && catalog && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <GearShop
              character={character}
              catalog={catalog}
              customItems={customItems}
              onPurchase={async ({ equipment, golda }) => {
                const updated = { ...character, equipment, golda };
                setCharacter(updated);
                await updateCharacter(cid, updated);
              }}
            />
          </div>
          <InventoryPanel
            character={character}
            catalog={catalog}
            customItems={customItems}
            onEquip={async (itemId: string) => {
              const result = equipItem(character, itemId, catalog, customItems);
              const updated = { ...character, equipment: result.equipment };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
            onDrop={async (itemId: string, qty?: number) => {
              const result = dropInventoryItem(character, itemId, qty);
              const updated = { ...character, equipment: result.equipment };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
            onSell={async (itemId: string, qty?: number) => {
              const result = sellInventoryItem(
                character,
                itemId,
                catalog,
                qty,
                customItems,
              );
              const updated = {
                ...character,
                equipment: result.equipment,
                golda: result.golda,
              };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
            onAddItem={async (itemId: string, qty: number) => {
              const result = addInventoryItem(character, itemId, qty);
              const updated = { ...character, equipment: result.equipment };
              setCharacter(updated);
              await updateCharacter(cid, updated);
            }}
            onCreateItem={async (item: CustomItem, addToInventory: boolean) => {
              await createCustomItemGlobal(item);
              if (addToInventory) {
                const result = addInventoryItem(character, item.id, 1);
                const updated = { ...character, equipment: result.equipment };
                setCharacter(updated);
                await updateCharacter(cid, updated);
              }
            }}
          />
        </div>
      )}

      {/* Biography */}
      {bio && !editing && (
        <ParchmentCard>
          <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
            Biography
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
            {bio}
          </p>
        </ParchmentCard>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${character.name}?`}
        description={
          <>
            Permanently removes the character's YAML, biography, and portrait
            file from the vault. This cannot be undone (an undo log arrives in
            Phase 7 — for now, manual recovery means restoring from backup or
            git).
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (character.portrait_path) {
            try {
              await removeCharacterPortrait(character.portrait_path);
            } catch {
              /* non-fatal: continue with delete */
            }
          }
          await deleteCharacter(cid, pcid);
          void navigate({ to: '/campaigns/$cid', params: { cid } });
        }}
      />
    </div>
    {/* Right column: sticky campaign-wide Action Log on xl+; hidden below xl */}
    {!editing && (
      <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] self-start overflow-y-auto xl:block">
        <ActionLog
          entries={logEntries}
          loading={logLoading}
          campaignDir={cid}
          currentCharacterId={character.id}
          onClear={() => clearLog(cid)}
        />
      </aside>
    )}
    </div>
    {/*
      key={character.id} forces a fresh mount of every dialog when you
      navigate between characters in the campaign. Without it, dialog
      state (selected weapon, manual dice values, the result preview)
      survives the navigation — leading to the previous character's
      weapons appearing in the new character's Attack dropdown.
    */}
    <SheetDialogsRoot
      key={character.id}
      dialogs={dialogs}
      character={character}
      derived={derived}
      catalog={catalog}
      customItems={customItems}
      campaignDir={cid}
      onChange={onCharacterChange}
    />
    </SheetActionsProvider>
  );
}

/* ---------- Edit form ---------- */

const STATUSES: CharacterStatus[] = [
  'fine',
  'heavy-physical',
  'heavy-mental',
  'incap-physical',
  'incap-mental',
  'dead',
  'insane',
];

function EditForm({
  character,
  initialBio,
  cid,
  pcid,
  onSaved,
  onCancel,
}: {
  character: Character;
  initialBio: string;
  cid: string;
  pcid: string;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}): React.JSX.Element {
  // Identity
  const [name, setName] = React.useState(character.name);
  const [age, setAge] = React.useState<number | ''>(character.age ?? '');
  const [gender, setGender] = React.useState(character.gender);
  const [title, setTitle] = React.useState(character.title);
  const [homeland, setHomeland] = React.useState(character.homeland);
  const [currentHome, setCurrentHome] = React.useState(character.current_home);
  const [family, setFamily] = React.useState(character.family_relationships);
  const [personality, setPersonality] = React.useState(
    character.personality_notes,
  );
  const [ryudeName, setRyudeName] = React.useState(character.ryude_name);
  const [appearanceMod, setAppearanceMod] = React.useState(
    character.appearance_modifier,
  );

  // State
  const [physDmg, setPhysDmg] = React.useState(character.state.physical_damage);
  const [mentalDmg, setMentalDmg] = React.useState(character.state.mental_damage);
  const [availLuc, setAvailLuc] = React.useState(character.state.available_luc);
  const [lucReserves, setLucReserves] = React.useState(character.luc_reserves);
  const [golda, setGolda] = React.useState(character.golda);
  const [completion, setCompletion] = React.useState(character.completion_bonus);
  const [status, setStatus] = React.useState<CharacterStatus>(
    character.state.status,
  );
  const [statusOverride, setStatusOverride] = React.useState(
    character.state.status_override,
  );
  const [memoryPoints, setMemoryPoints] = React.useState(
    character.memory_points_spent,
  );
  const [doctrine, setDoctrine] = React.useState(character.spiritualist_doctrine);
  const [restrictions, setRestrictions] = React.useState(
    character.spiritualist_restrictions,
  );
  const [implements_, setImplements] = React.useState(
    character.spiritualist_special_implements,
  );

  const [portraitPath, setPortraitPath] = React.useState<string | null>(
    character.portrait_path,
  );

  const [bio, setBio] = React.useState(initialBio);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated: Character = {
        ...character,
        name: name.trim() || character.name,
        age: age === '' ? null : Number(age),
        gender,
        title,
        homeland,
        current_home: currentHome,
        family_relationships: family,
        personality_notes: personality,
        ryude_name: ryudeName,
        memory_points_spent: Math.max(0, memoryPoints),
        spiritualist_doctrine: doctrine,
        spiritualist_restrictions: restrictions,
        spiritualist_special_implements: implements_,
        golda,
        completion_bonus: completion,
        luc_reserves: lucReserves,
        portrait_path: portraitPath,
        appearance_modifier: appearanceMod,
        state: {
          ...character.state,
          physical_damage: Math.max(0, physDmg),
          mental_damage: Math.max(0, mentalDmg),
          available_luc: Math.max(
            0,
            Math.min(character.initial_luc, availLuc),
          ),
          status,
          status_override: statusOverride,
        },
      };
      await updateCharacter(cid, updated);

      if (bio.trim() !== initialBio.trim()) {
        const paths = campaignPaths(cid);
        const mdPath = characterMarkdownPath(paths.dir, pcid);
        const md = `---\ncharacter_id: ${pcid}\nname: ${JSON.stringify(updated.name)}\n---\n\n${bio.trim()}\n`;
        await vaultWriteText(mdPath, md);
      }

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
      className="flex flex-col gap-3"
    >
      <h3 className="font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
        Portrait
      </h3>
      <PortraitPicker
        classId={character.class_id}
        name={name || character.name}
        mode={{
          kind: 'live',
          target: { kind: 'character', id: pcid },
          vaultPath: portraitPath,
          onChange: setPortraitPath,
        }}
      />

      <h3 className="font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
        Identity
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Gender">
          <input
            type="text"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Age">
          <input
            type="number"
            min={1}
            value={age}
            onChange={(e) =>
              setAge(e.target.value === '' ? '' : Number(e.target.value))
            }
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Homeland">
          <input
            type="text"
            value={homeland}
            onChange={(e) => setHomeland(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Current home">
          <input
            type="text"
            value={currentHome}
            onChange={(e) => setCurrentHome(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Ryude name">
          <input
            type="text"
            value={ryudeName}
            onChange={(e) => setRyudeName(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      <Field label="Family / Relationships">
        <textarea
          rows={2}
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="Personality">
        <textarea
          rows={2}
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className={INPUT_CLASS}
        />
      </Field>

      <h3 className="mt-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
        State
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Physical damage">
          <input
            type="number"
            min={0}
            value={physDmg}
            onChange={(e) => setPhysDmg(parseInt(e.target.value, 10) || 0)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Mental damage">
          <input
            type="number"
            min={0}
            value={mentalDmg}
            onChange={(e) => setMentalDmg(parseInt(e.target.value, 10) || 0)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label={`Available LUC (max ${character.initial_luc})`}>
          <input
            type="number"
            min={0}
            max={character.initial_luc}
            value={availLuc}
            onChange={(e) => setAvailLuc(parseInt(e.target.value, 10) || 0)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="LUC reserves">
          <input
            type="number"
            min={0}
            value={lucReserves}
            onChange={(e) => setLucReserves(parseInt(e.target.value, 10) || 0)}
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Golda">
          <input
            type="number"
            min={0}
            value={golda}
            onChange={(e) => setGolda(parseInt(e.target.value, 10) || 0)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Completion bonus">
          <input
            type="number"
            min={0}
            value={completion}
            onChange={(e) => setCompletion(parseInt(e.target.value, 10) || 0)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field
          label={
            statusOverride
              ? 'Status (manual)'
              : 'Status (auto from damage)'
          }
        >
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CharacterStatus)}
            disabled={!statusOverride}
            className={INPUT_CLASS}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
        <input
          type="checkbox"
          checked={statusOverride}
          onChange={(e) => setStatusOverride(e.target.checked)}
          className="h-3.5 w-3.5 rounded-sm border-[var(--color-parchment-400)]"
        />
        <span>
          Override auto-status — pin a manual value (otherwise status follows
          accumulated damage)
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Appearance modifier">
          <input
            type="number"
            value={appearanceMod}
            onChange={(e) =>
              setAppearanceMod(parseInt(e.target.value, 10) || 0)
            }
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      {character.class_id === 'word-caster' && (
        <>
          <h3 className="mt-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
            Word-Caster
          </h3>
          <Field label="Memory Points spent">
            <input
              type="number"
              min={0}
              value={memoryPoints}
              onChange={(e) =>
                setMemoryPoints(parseInt(e.target.value, 10) || 0)
              }
              className={INPUT_CLASS}
            />
          </Field>
        </>
      )}

      {character.class_id === 'spiritualist' && (
        <>
          <h3 className="mt-2 font-display text-sm uppercase tracking-wider text-[var(--color-ink-faint)]">
            Spiritualist
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Doctrine">
              <input
                type="text"
                value={doctrine}
                onChange={(e) => setDoctrine(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Restrictions">
              <input
                type="text"
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <Field label="Special implements">
            <input
              type="text"
              value={implements_}
              onChange={(e) => setImplements(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </>
      )}

      <Field label="Biography">
        <textarea
          rows={6}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={INPUT_CLASS}
        />
      </Field>

      {error && (
        <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-2 text-sm text-[var(--color-rust)]">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-gilt)]/15 px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-gilt)]/25 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-4 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const INPUT_CLASS =
  'w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 font-body text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gilt)]/40';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-display text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ---------- Helpers ---------- */

function classLabel(c: Character): string {
  if (c.class_id === 'word-caster' && c.word_caster_gate) {
    return `Word-Caster · Gate of ${cap(c.word_caster_gate)}`;
  }
  if (c.class_id === 'spiritualist' && c.spiritualist_order) {
    return prettify(c.spiritualist_order);
  }
  if (c.class_id === 'tradesfolk' && c.tradesfolk_profession) {
    return `Tradesfolk · ${cap(c.tradesfolk_profession)}`;
  }
  return cap(c.class_id.replace('-', ' '));
}

function cap(s: string): string {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

function prettify(s: string): string {
  return s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}


function KV({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </dt>
      <dd className="font-mono text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

function FieldDisplay({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div className="text-[var(--color-ink)]">{value}</div>
    </div>
  );
}

// Reference type imports kept for clarity — not used directly in this file.
export type { ReferenceCatalog };
