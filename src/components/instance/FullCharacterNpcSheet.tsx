import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { StatBlock } from '@/components/stat/StatBlock';
import { DerivedStatsBlock } from '@/components/stat/DerivedStatsBlock';
import { AbsorptionPanel } from '@/components/stat/AbsorptionPanel';
import { WeaponsTable } from '@/components/stat/WeaponsTable';
import { DurabilityTracks } from '@/components/stat/DurabilityTracks';
import { WordCasterPanel } from '@/components/stat/WordCasterPanel';
import { SpiritualistPanel } from '@/components/stat/SpiritualistPanel';
import { EquippedGearPanel } from '@/components/stat/EquippedGearPanel';
import { ActiveEffectsPanel } from '@/components/stat/ActiveEffectsPanel';
import { RecoveryPreview } from '@/components/stat/RecoveryPreview';
import { QuickAdjust } from '@/components/stat/QuickAdjust';
import { SkillsList } from '@/components/stat/SkillsList';
import { ActionPanel } from '@/components/sheet/ActionPanel';
import { useSheetDialogs } from '@/components/sheet/useSheetDialogs';
import { SheetActionsProvider } from '@/components/sheet/SheetActionsContext';
import { SheetDialogsRoot } from '@/components/sheet/SheetDialogsRoot';
import { deriveCombatValues } from '@/engine/derive/combat-values';
import { effectiveStatus } from '@/engine/derive/status';
import { buildWeaponLines } from '@/engine/derive/weapon-lines';
import {
  applyCharacterStateToNpc,
  npcInstanceToCharacter,
} from '@/engine/adapters/npc-as-character';
import { unequipItem, setBastardGrip } from '@/engine/equipment/apply';
import type { Character, BastardSwordGrip } from '@/domain/character';
import type { NpcInstance } from '@/domain/npc-instance';
import type { FullCharacterNpc } from '@/domain/npc';
import type { Campaign } from '@/domain/campaign';
import type { ReferenceCatalog } from '@/persistence/reference-loader';

interface Props {
  campaign: Campaign;
  instance: NpcInstance;
  template: FullCharacterNpc;
  catalog: ReferenceCatalog | null;
  onPersist: (next: NpcInstance) => Promise<void>;
}

/**
 * Full Character NPC sheet — renders the same roll surface as a PC, fed
 * by the npcInstanceToCharacter adapter. Skips edit / delete / biography /
 * gear-shop / inventory chrome (those live on the template page or aren't
 * meaningful on an NPC instance). State edits round-trip back to the NPC
 * instance via applyCharacterStateToNpc.
 *
 * Phase 4 polish — Track 6.
 */
export function FullCharacterNpcSheet({
  campaign,
  instance,
  template,
  catalog,
  onPersist,
}: Props): React.JSX.Element {
  const character = React.useMemo(
    () => npcInstanceToCharacter(instance, template, campaign.id),
    [instance, template, campaign.id],
  );

  const onCharacterChange = React.useCallback(
    async (next: Character) => {
      await onPersist(applyCharacterStateToNpc(instance, next));
    },
    [instance, onPersist],
  );

  const dialogs = useSheetDialogs();
  const derived = deriveCombatValues(character, catalog);
  const weaponLines = buildWeaponLines(character, catalog, derived.baseBN);
  const displayedStatus = effectiveStatus(character, derived);

  return (
    <SheetActionsProvider value={dialogs}>
      <div className="flex w-full flex-col gap-4">
        <ParchmentCard className="bg-[var(--color-gilt)]/5">
          <p className="text-xs italic text-[var(--color-ink-soft)]">
            Stats from template{' '}
            <span className="font-mono">{template.id}</span>. Edit on the{' '}
            <Link
              to="/templates/npcs/$tid"
              params={{ tid: template.id }}
              className="underline hover:text-[var(--color-rust)]"
            >
              template page
            </Link>
            . State edits below (HP, LUC, status, segment) live on this instance.
          </p>
        </ParchmentCard>

        <ParchmentCard className="flex flex-col gap-4">
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
                await onCharacterChange({
                  ...character,
                  state: { ...character.state, available_luc: next },
                });
              }}
            />
            <QuickAdjust
              label="Golda"
              value={character.golda}
              display={<UnitTooltip unit="golda" amount={character.golda} />}
              min={0}
              onChange={async () => {
                /* template-owned — no-op on instance */
              }}
            />
            <QuickAdjust
              label="Completion bonus"
              value={character.completion_bonus}
              min={0}
              onChange={async (next) => {
                await onCharacterChange({
                  ...character,
                  completion_bonus: next,
                });
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
          </section>
        </ParchmentCard>

        <ParchmentCard className="flex flex-col gap-4">
          <DurabilityTracks
            label="Physical"
            durability={derived.physicalDurability}
            current={character.state.physical_damage}
            resistanceLevel={derived.physicalResistanceLevel}
            onChange={async (next) => {
              await onCharacterChange({
                ...character,
                state: { ...character.state, physical_damage: next },
              });
            }}
          />
          <DurabilityTracks
            label="Mental"
            durability={derived.mentalDurability}
            current={character.state.mental_damage}
            resistanceLevel={derived.mentalResistanceLevel}
            onChange={async (next) => {
              await onCharacterChange({
                ...character,
                state: { ...character.state, mental_damage: next },
              });
            }}
          />
          <RecoveryPreview character={character} derived={derived} />
        </ParchmentCard>

        {catalog && (
          <>
            <EquippedGearPanel
              character={character}
              catalog={catalog}
              onUnequip={async (target) => {
                const result = unequipItem(character, target);
                await onCharacterChange({
                  ...character,
                  equipment: result.equipment,
                });
              }}
              onSetBastardGrip={async (grip: BastardSwordGrip) => {
                const result = setBastardGrip(character, grip, catalog);
                await onCharacterChange({
                  ...character,
                  equipment: result.equipment,
                });
              }}
            />
            <AbsorptionPanel
              character={character}
              catalog={catalog}
              derived={derived}
            />
            <WeaponsTable lines={weaponLines} />
          </>
        )}

        <ParchmentCard className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-[var(--color-ink)]">
            Skills
          </h2>
          <SkillsList character={character} catalog={catalog} />
        </ParchmentCard>

        <WordCasterPanel
          character={character}
          derived={derived}
          catalog={catalog}
        />
        <SpiritualistPanel
          character={character}
          derived={derived}
          catalog={catalog}
        />

        <ActiveEffectsPanel
          character={character}
          onChange={async (next) => {
            await onCharacterChange({
              ...character,
              state: { ...character.state, active_effects: next },
            });
          }}
        />
      </div>

      <SheetDialogsRoot
        key={character.id}
        dialogs={dialogs}
        character={character}
        derived={derived}
        catalog={catalog}
        campaignDir={campaign.dir_name}
        onChange={onCharacterChange}
      />
    </SheetActionsProvider>
  );
}

function KV({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </span>{' '}
      <span className="font-mono text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
