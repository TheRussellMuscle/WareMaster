# Changelog

All notable changes to WareMaster are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.6.0-alpha.1] — 2026-04-27

Phase 4 (templates + instances + portraits), Phase 4 bookkeeping polish, active effects, global custom items, roll expansions, and real bundled portrait artwork — everything since v0.4.0-alpha.1.

### What's new

#### Templates + instances + portraits (Phase 4)

- **Templates + instances + portraits** — campaign Monsters / Ryude / NPCs are real. Spawn named monsters, NPCs, and Ryude from bundled or user-authored templates; give each a unique name, assign an operator (Ryude), upload a custom portrait.
  - **Three-tier template resolution** — campaign-scoped → vault-scoped → bundled. Missing templates render a yellow repair banner instead of crashing.
  - **Spawn dialog** with template browser (search + Bundled/Vault/Campaign filters), name override, operator picker, portrait upload, and a quantity stepper for bulk spawns.
  - **Per-instance state** — current damage, status, attunement (Ryude), location; survives reload.
  - **Three NPC archetypes** — beast (full monster stat block), simple (CHA-modifier + role), full-character (complete sheet).
  - **Sidebar branches** — Characters / NPCs / Monsters / Ryude expand inline under each campaign with the same search filter as Characters.
  - **Templates routes** — `/templates/monsters`, `/templates/ryude`, `/templates/npcs` with create/edit/duplicate/delete via YAML-backed editor.
- **Portrait pipeline** — three-tier resolution: instance custom → entity-specific bundled → rank/type bundled → CSS placeholder. Served as base64 data URLs from the Rust backend (bypasses asset-protocol scope restrictions in dev + production without a custom scheme).
- **Real bundled portraits** — full-colour artwork for all 5 bundled monsters (Tusktooth, Magu-Draph, Metal-Chimaera, Giant Mantis Shrimp, Skeleton) and all 3 bundled Ryude (Az-Cude, Maltu-Ragorsu, Gisah-Sharukann). Entity-specific images take priority over generic rank/type fallbacks.
- **Clickable portrait lightbox** — any portrait with `clickable` prop opens a full-size overlay via a Radix Dialog. Available in template lists, template detail, instance detail, instance expanded stat block, and the spawn dialog.

#### Instance stat block polish

- **Expandable instance stat blocks** — Monster / Ryude / Beast NPC / Simple NPC detail pages render collapsible sections (Combat, Details, Equipment, Perks, Active Effects). Stats, state mutators, and roll buttons live inline.
- **Per-instance dice rolls (Rule §07 / §08 / §14 / §15)**:
  - **Monster / Beast NPC**: Set IN/DN, Attack (vs-character / vs-Ryude toggle, ×N crit multiplier), Ability Roll.
  - **Simple NPC**: Set IN/DN, Skill Roll, Reaction.
  - **Ryude**: Set IN/DN, Operator Roll, Attunement Check (Rule §14:38-66), Weapon Attack. Roll buttons disabled when unmanned.
  - **Full-Character NPC**: renders the same character sheet a PC gets — full stat block, skills, weapons, dialogs.
- **Rule-based bookkeeping** (Rule §09):
  - **Status auto-derivation** from damage thresholds (wounded > durability, incapacitated > 2×, dead > 3×) with manual override pin.
  - **Per-instance segment state** (`current IN · DN · Absorption modifier`). End Segment ticks active effects and clears the snapshot.
  - **Ryude operational status** chip (intact / damaged-light / damaged-heavy / disabled / destroyed).
  - **Ryude attribute damage** (SPE / POW / ARM / BAL deltas) surfaced in Combat; auto-applied to rolls.
  - **Ryude attunement progression** with one-click Apply.
- **Campaign log in all sheet views** — the action log sticky column now appears on NPC / Monster / Ryude detail pages as well as the character sheet.

#### Active effects solver

- **15 canonical effect kinds** via `KNOWN_EFFECT_KINDS`. Blinded, Airshield, and Mistcalled resolve to live IN / BN / DN modifiers via `resolveEffectMods()`; `DerivedCombatValues` exposes raw values + `activeEffectMods` for formula annotation in the stat block.
- **Preset picker** in `ActiveEffectsPanel` pre-fills label + kind from the reference effect list.

#### Global custom items

- Custom items are now vault-wide (`items/*.yaml`). New **Custom Items** sidebar section and `/items` / `/items/$iid` routes.
- **Full weapon / armor stat fields**: category, hands, BN modifiers, damage, absorption, slot, unique flag, shop availability.
- Engine functions (`equipItem`, `buildWeaponLines`, `resolveEquippedSlots`, `AbsorptionPanel`) fall back to custom items via adapters — full weapons-table and attack-roll support.
- Characters with legacy `custom_items` arrays **auto-migrate** to the global store on first load.

#### Roll expansions

- **First Impression roll dialog** — CHA-governed, editable difficulty. Spiritualist characters get an "Allies in Faith" context selector (neutral / same order / different order) applying ±1.
- **Class benefit roll buttons** — `ClassBenefitsSection` computes formula placeholders inline and surfaces roll buttons for Sermon (LUC), Public Performance (CHA), Component Analysis (SEN), Price Loot (SEN). Tradesfolk class benefits now correctly display profession perks.
- **Add Item dialog** — browse the full gear catalog by tab and add to inventory without a gold deduction (loot drops and GM grants).

### Fixes

- **Critical hits apply and double the Warrior +1 damage bonus** (Rule §06 §1, §08 §2) — previously the bonus was missing from the damage path entirely.
- **Update changelog renders Markdown** — the auto-updater dialog now uses `react-markdown` with parchment-themed overrides; links open in the OS browser via the Tauri shell plugin.
- **general-goods.yaml** — seven variable-priced entries (candle, torch, lamp-oil, hemp-rope, climbing gear, fair-clothing, instruments) now carry correct base prices.

### Engine changes

- New `src/engine/derive/active-effect-modifiers.ts` — `resolveEffectMods()`, `KNOWN_EFFECT_KINDS`.
- New `src/engine/derive/instance-bookkeeping.ts` — 23 vitest cases.
- New `src/engine/derive/instance-rolls.ts` — 24 vitest cases.
- New `src/engine/adapters/npc-as-character.ts` — 14 vitest cases.
- New `src/engine/templates/resolve.ts` — three-tier template chain resolver.
- New `src/domain/custom-item.ts`, `src/persistence/custom-item-repo.ts`, `src/stores/custom-item-store.ts`.
- `DerivedCombatValues` gains `warriorDamageBonus`, `rawIN/BN/DN`, `activeEffectMods`.

### Notes

- Cross-instance damage application and clock-driven recovery remain Phase 6.
- Total new vitest cases since v0.4.0-alpha.1: ~155+; running total ~580.

## [0.4.0-alpha.1] — 2026-04-26

Second alpha. **Phase 5 (dice + skill-check engines)** ships, and the sheet becomes a real play surface — every relevant stat, weapon, technique, and skill grows its own roll button, results stream into a campaign-wide log, and the navigation collapses into a single project-explorer-style sidebar tree.

### What's new

- **Dice + skill-check engines** (Rule §07 + §08). Pure, seeded `mulberry32` RNG with full manual-input parity. Action rolls (`actionRoll`), skill checks (`skillCheck`), IN/DN segment rolls (`rollInDn`), attacks with crit + perfect-success + total-failure detection (`resolveAttack`), and forced saves (`saveRoll`). 96 new vitest cases covering every Total-Failure / Perfect-Success / re-roll / LUC-multiplier path.
- **Sheet-level rolling** — every roll dialog the engine supports is reachable from the character sheet:
  - `Set IN/DN` from the new "This Segment" panel under Derived stats — stores current IN / DN / Absorption modifier and survives reloads.
  - Per-weapon **Attack** buttons in the Weapons table and Equipped-gear list. Critical Hits multiply damage by `(BN dice + 1)`; Total Failure flags the next Segment's IN as halved.
  - Per-technique **Cast** buttons on Word-Casting / Numetic Arts / Invocations. Optional Mental damage cost flows back to the caster's track.
  - **Roll** button on every skill row and ability cell. LUC ability cell rolls a LUC Roll (Rule §07).
  - **Save** button appears on the damage track header when you cross into Heavy.
- **All catalog skills shown** on the sheet, grouped by category. Untrained rows render at Lv 0 with a muted background; the Roll dialog supports them too — at Lv 0 with **half PP** on Perfect Success / Total Failure and auto-adds the skill to the character on first hit (Rule §07).
- **LUC auto-spend + clamping**. LUC dice inputs in every dialog cap at the character's Available LUC and decrement on Add-to-log. Skill Check Perfect Success on a non-combat skill restores LUC after spending — caps math stays consistent.
- **Campaign-wide action log** in a sticky right column. Every roll across every character in the campaign appends to `campaigns/<dir>/action-log.yaml` with a per-entry character link. The log header pins to the top while you scroll, and the column hides on viewports below `xl` so narrow windows aren't crowded.
- **Hierarchical sidebar** (project-explorer style). Campaigns expand inline to reveal a per-campaign search box and a Characters branch with the character list nested underneath; NPCs / Monsters / Ryudes appear as Phase 4 placeholders. Expansion + per-campaign search persist to localStorage.
- **Parchment app icon + window background**. The default Tauri purple is gone — the app icon is now a Lucide-style crossed-swords mark on a parchment plate, and the window paints `#f1e6c8` (parchment-100) before the React bundle loads, so there's no purple flash on launch.

### What's improved

- **Warrior class perk text** corrected from "take −1 damage" to "gain +1 Absorb" (matches the Total Absorption mechanic).
- **Doctor profession hidden** from the new-character wizard until the official rules ship; existing characters with `tradesfolk_profession: doctor` still load.
- **Ko-Fi link** in the sidebar now opens the user's default browser via `tauri-plugin-shell` instead of the no-op `<a target="_blank">`.
- **Character browsing** on the campaign overview gained search, sort (name / class / recently edited / recently created), class + status filter chips, and per-card status badges (Heavy / Incap / Dead).
- **Rules verification pass** against the Wares Blade Playkit pp. 30–34 confirmed every IN/DN, BN, damage, save, recovery, and Heavy-state rule already documented in `docs/rules/` is faithful to the source. No changes needed.

### Bug fixes

- **Infinite render loop** when opening a character sheet for a campaign whose action log hadn't been read off disk yet — the Zustand selector returned a fresh empty array on every render, so React kept re-rendering. Selector now falls back to a stable module-level constant outside the hook.
- **Weapon mixing across characters** — selecting a different character in the sidebar tree could leave the previous character's weapons in the new sheet's "Available Weapons" table, with the effect compounding across navigations. The route component was being reused on `$pcid` change (TanStack Router behavior), so React state, refs, and in-flight `reload()` promises survived; a stale fetch could stomp `setCharacter(prevCharacter)` over the new one and the auto-status-sync effect would write the mongrel state back to disk. Forcing a fresh mount of the inner sheet on every `pcid` change makes each navigation a clean slate.
- **Lv 0 skill rolls picked the wrong skill** — clicking the Roll button next to an untrained skill on the sheet would open the dialog with the first *trained* skill selected instead, because the dropdown only listed trained skills and `<select>` couldn't match the requested id. The dropdown now sources from the full catalog grouped by category, with `(untrained)` markers, so any skill is selectable and the engine's untrained-half-PP rule applies cleanly.
- **Dialog state surviving navigation** — `weaponId`, `manualValues`, `result` previews on the per-character roll dialogs no longer leak across character switches.

### What's coming next

- **Phase 6** — campaign clock with closed-form healing, effect expiry, and Ryude self-repair.
- **Phase 7** — full multi-combatant tracker with declared actions, IN ordering, and event-log undo/rewind.

See [PLAN.md](PLAN.md) for the full design and remaining phase work.

### Notes for testers

- **Builds remain unsigned.** Same first-run dance as 0.3.0-alpha.1: SmartScreen → "More info → Run anyway" on Windows; right-click → Open or Privacy & Security → "Open Anyway" on macOS; `chmod +x` and run on Linux.
- **Auto-update from 0.3.0-alpha.1** should arrive on next launch — the updater is signed with the same ed25519 key.
- **Vault format**: existing `state.action_log` arrays on character YAMLs are silently dropped (Zod strips unknown keys); the new campaign-wide log lives at `campaigns/<dir>/action-log.yaml`.

### Support

WareMaster is a free side-project. If it's saving you time at the table, [Ko-fi](https://ko-fi.com/brendanrussell) is the most direct way to help keep it going.

## [0.3.0-alpha.1] — 2026-04-26

First public alpha. Phases 1–3 of the [implementation roadmap](PLAN.md) are in.

### What's working

- **Parchment-themed shell** with native Wares Blade unit tooltips (etch, liet, gro, golda, gren, garom, …) and an illuminated heading aesthetic.
- **Reference browser** over all 21 bundled YAML data files: classes, skills, weapons, armor, beastiary, Ryude, techniques, tables.
- **Vault on disk** at `~/Documents/WareMaster/` — plaintext YAML and Markdown, hand-editable, git-friendly. Default location is movable in Settings.
- **Campaign creation** and management — name, regional flavor, opening clock, dramatis-personae index.
- **Character creation wizard** following the eight rule-aligned steps from the Playkit: class pick, ability rolls (3D5), skill packages, equipment packages, Word-Caster gate / Spiritualist order / Tradesfolk profession (where applicable), portrait, biography.
- **Character sheet** with full stat block, skills, equipment.
- **Auto-updates** on launch — once you install this build, future alphas arrive automatically. Updates are integrity-signed with an ed25519 key.

### What's coming next

- **Phase 4** — monster, NPC, and Ryude templates plus named instances inside campaigns; portrait pipeline.
- **Phase 5** — dice and skill-check engines, both auto-roll and manual-input modes.
- **Phase 6** — campaign clock with closed-form healing, effect expiry, and Ryude self-repair.
- **Phase 7** — full combat tracker with undo/rewind via event log.

See [PLAN.md](PLAN.md) for the full design and remaining phase work.

### Notes for testers

- **Builds are unsigned.** That's a deliberate alpha tradeoff; OS code signing is on the Phase 8 list.
  - **Windows** — SmartScreen warns on first run. Click "More info → Run anyway".
  - **macOS** — Right-click the `.app` → Open the first time, or use System Settings → Privacy & Security → "Open Anyway".
  - **Linux** — Download the `.AppImage`, `chmod +x` it, run.
- **Vault path** defaults to `~/Documents/WareMaster/` (movable in Settings → Vault).
- **Found a bug?** Please [open an issue](https://github.com/TheRussellMuscle/WareMaster/issues) — early-alpha feedback is exactly what this build exists for.

### Support

WareMaster is a free side-project. If it's saving you time at the table, [Ko-fi](https://ko-fi.com/brendanrussell) is the most direct way to help keep it going.

[0.6.0-alpha.1]: https://github.com/TheRussellMuscle/WareMaster/compare/v0.4.0-alpha.1...v0.6.0-alpha.1
[0.4.0-alpha.1]: https://github.com/TheRussellMuscle/WareMaster/releases/tag/v0.4.0-alpha.1
[0.3.0-alpha.1]: https://github.com/TheRussellMuscle/WareMaster/releases/tag/v0.3.0-alpha.1
