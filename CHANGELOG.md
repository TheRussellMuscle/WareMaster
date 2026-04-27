# Changelog

All notable changes to WareMaster are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.0-alpha.2] — 2026-04-26

Phase 4 polish: instance detail pages get expandable stat blocks, in-place dice rolls, and rule-based bookkeeping that mirrors what characters already get.

### What's new

- **Expandable instance stat blocks** — Monster / Ryude / Beast NPC / Simple NPC detail pages now render collapsible sections (Combat, Details, Equipment, Perks, Active Effects). Stats, state mutators (HP / damage / status / location), and roll buttons live inline next to the relevant numbers — no more split-pane preview + state grid.
- **Per-instance dice rolls (Rule §07 / §08 / §14 / §15)** — every kind gets the right minimum-viable roll surface, all writing to the campaign action log (attributed to the instance):
  - **Monster / Beast NPC**: Set IN/DN, Attack (with vs-character / vs-Ryude variant toggle, ×N crit multiplier), Ability Roll (any base ability).
  - **Simple NPC**: Set IN/DN, Skill Roll (per notable skill — auto-fills CHA-governed skills from `cha_modifier`, prompts for base on others), Reaction.
  - **Ryude**: Set IN/DN, Operator Roll (1D10 + Operator AGI Base + Ryude SPE + Drive Modifier), Attunement Check (1D10 − Drive Mod ≤ Attunement Value, Rule §14:38-66), Weapon Attack (×10 damage vs human targets per Rule §14:160). Roll buttons disabled when unmanned.
  - **Full-Character NPC**: renders the same character sheet a PC gets — abilities, derived combat values, weapons table, skills list, action panel, all dialogs (skill / ability / attack / save / IN-DN / technique). Stat block is read-only (edit on the template); state edits round-trip to the NPC instance.
- **Rule-based bookkeeping** brought forward from Phase 6 / 7 where it doesn't depend on the campaign clock or combat tracker:
  - **Status auto-derivation** from damage thresholds (Rule §09:28-30 — wounded > durability, incapacitated > 2×, dead > 3×). Manual override pin available; "Use derived" / "Auto-update to ..." links surface the derived value when they diverge.
  - **Per-instance segment state** (`current IN · DN · Absorption modifier`) on Monster / Ryude / NPC instances, mirroring `CurrentSegment` on character state. End Segment ticks active effects (`expires_at_segment ≤ current` removed) and clears the IN/DN snapshot.
  - **Ryude operational status** chip (intact / damaged-light / damaged-heavy / disabled / destroyed) derived from durability ratio, with parchment-aware colors.
  - **Ryude attribute damage** (SPE / POW / ARM / BAL deltas) surfaced in the Combat section; auto-applied to Operator Roll + Weapon Attack derivations.
  - **Ryude attunement progression** suggested by the Attunement Check dialog per Rule §14:38-66 (unattuned + success → attuning, attuning + perfect → attuned, any total-failure → rejected). One-click Apply.

### Engine changes

- `MonsterInstanceState`, `RyudeInstanceState`, `NpcInstanceState` gain `segment: CurrentSegment | null` and `current_segment_index: number`.
- `NpcInstanceState` additionally gains optional `available_luc` and `completion_bonus_pp` (used by the Full-Character NPC sheet adapter).
- New `src/engine/derive/instance-bookkeeping.ts` — pure helpers: `monsterDerivedStatus`, `effectiveMonsterStatus`, `ryudeOperationalStatus`, `tickActiveEffects`, `endSegment`, `nextAttunementState`. 23 vitest cases.
- New `src/engine/derive/instance-rolls.ts` — derivation helpers for instance roll inputs: `monsterAbilityRoll`, `monsterDamageFormula`, `ryudeOperatorRoll`, `ryudeAttunementContext`, `ryudeAttackContext`, `simpleNpcSkillContext`, plus `abilityBaseValue` / `effectiveRyudeAttribute` helpers. 24 vitest cases.
- New `src/engine/adapters/npc-as-character.ts` — synthesizes a `Character` view from a Full-Character NPC instance + template (read on render) and folds state edits back via `applyCharacterStateToNpc`. Status enum collapses (`heavy-physical` / `heavy-mental` → `wounded`; `dead` / `insane` → `dead`). 14 vitest cases.

### Refactors

- `SkillsList` lifted from inline-in-route to `src/components/stat/SkillsList.tsx` so the Full-Character NPC sheet can reuse the same component.

### Notes

- Full-Character NPC sheet writes action-log entries with `character_id = instance.id` / `character_name = instance.name`. The `character_id` field is semantically misnamed for non-character actors; a follow-up schema-v2 will rename it to `actor_id` (deferred — current schema works fine).
- Cross-instance damage application (auto-apply Attack damage to the target) and clock-driven recovery remain Phase 6 / 7.
- 61 new vitest cases (23 bookkeeping + 24 rolls + 14 adapter); total 580 across 17 files.

## [0.5.0-alpha.1] — 2026-04-26

Third alpha. **Phase 4 (templates + named instances + portraits)** lands, plus two fixes from the v0.4.0-alpha.1 release.

### What's new

- **Templates + instances + portraits** — the campaign Monsters / Ryude / NPCs sections are now real. Spawn a Maltu-Ragorsu (or any bundled monster / Ryude) into a campaign, give it a unique name, assign an operator, upload a custom portrait. Everything round-trips to YAML in the vault and re-loads on app restart.
  - **Template resolution chain** — campaign-scoped → vault-scoped → bundled. Vault templates override bundled ones with the same id; campaign templates override both. Missing templates render a yellow repair banner instead of crashing.
  - **Spawn dialog** with a template browser (search + Bundled/Vault/Campaign filters), name override, operator picker (Ryude only, plus an "unmanned" toggle), portrait upload, and a quantity stepper for bulk monster spawns ("Goblin 1, 2, 3").
  - **Per-instance state** — current damage, status, attunement (Ryude), location. Stored on each instance YAML; survives reload.
  - **Three NPC archetypes** via discriminated union — beast (full monster stat block), simple (CHA-modifier + role), full-character (complete sheet).
  - **Sidebar branches** — Characters / NPCs / Monsters / Ryude all expand inline under each campaign, lazy-loaded with the same search filter as Characters.
  - **Templates routes** — `/templates/monsters`, `/templates/ryude`, `/templates/npcs` show bundled + vault templates with create/edit/duplicate/delete via a YAML-backed editor.
  - **Bundled portraits** — 27 placeholder PNGs (parchment monogram silhouettes baked at 512×512) under `src-tauri/resources/portraits/`. Re-bake any time with `pnpm portraits:bake`.
- **Portrait pipeline** — generalized from character-only to all entity kinds. Three-tier resolution: instance custom → template default → bundled fallback → CSS placeholder. Served via Tauri's existing `assetProtocol` extended to `$RESOURCE/portraits/**` (chose this over the originally-planned `bundle://` custom scheme — simpler and more reliable on Windows).

### Fixes

- **Critical hits now apply *and* double the Warrior +1 damage bonus** (Rule §06 §1, §08 §2). Previously the bonus was missing from the damage path entirely, so it was neither added on a normal hit nor doubled on a crit. The dice cap (Rule §08 LUC max) still applies to dice only — flat bonuses (Warrior +1, future technique bonuses) are exempt per Rule §06 §1, then the crit multiplier scales both. The Attack dialog and action log now show the breakdown, e.g. `(rolled 7 ⇒ 10 + 1 Warrior × 2 crit = 22)`.
- **Update changelog renders Markdown** — the auto-updater dialog used to display headings/bullets/code-spans/links as raw `**text**` characters. Now uses `react-markdown` with parchment-themed component overrides; links open in the OS browser via the Tauri shell plugin and `rehype-sanitize` strips any unsafe content.

### Engine changes

- `DerivedCombatValues` gains `warriorDamageBonus: number` (1 for Warrior, 0 otherwise).
- `AttackInput` gains optional `flatDamageBonus`. `AttackResult` gains `damageBreakdown: { diceTotal, flatBonus, critMultiplier }` for breakdown displays.
- New `src/engine/templates/resolve.ts` — pure resolver for the three-tier template chain.

### Notes

- 24 new vitest cases (8 attack + 4 combat-values + 12 template-resolver). Total: 169 tests across 13 files (real source, not counting agent-worktree duplicates).
- Template authoring v1 ships a YAML editor (parchment-themed, validates on save). Field-by-field forms per archetype are deferred to a future release; the YAML path covers all three NPC archetypes including Full-Character via "Duplicate from bundled" affordance.

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

- **Phase 4** — monster, NPC, and Ryude templates plus named instances inside campaigns; portrait pipeline.
- **Phase 6** — campaign clock with closed-form healing, effect expiry, and Ryude self-repair.
- **Phase 7** — full multi-combatant tracker with declared actions, IN ordering, and event-log undo/rewind. (The sheet's per-character "This Segment" panel and campaign action log are stepping stones, not replacements.)

See [PLAN.md](PLAN.md) for the full design and remaining phase work.

### Notes for testers

- **Builds remain unsigned.** Same first-run dance as 0.3.0-alpha.1: SmartScreen → "More info → Run anyway" on Windows; right-click → Open or Privacy & Security → "Open Anyway" on macOS; `chmod +x` and run on Linux.
- **Auto-update from 0.3.0-alpha.1** should arrive on next launch — the updater is signed with the same ed25519 key.
- **Vault format**: existing `state.action_log` arrays on character YAMLs are silently dropped (Zod strips unknown keys); the new campaign-wide log lives at `campaigns/<dir>/action-log.yaml`.
- **If you've been hitting the weapon-accumulation bug**, the remount fix prevents *new* corruption but doesn't reverse existing data. Open `~/Documents/WareMaster/campaigns/<your-campaign>/characters/<character>.yaml` in a text editor and trim each character's `equipment.weapons:` array back to what it should be. The `.scripts/validate_yaml.py` script will sanity-check the structure afterwards.
- **Found a bug?** Please [open an issue](https://github.com/TheRussellMuscle/WareMaster/issues).

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

[0.4.0-alpha.1]: https://github.com/TheRussellMuscle/WareMaster/releases/tag/v0.4.0-alpha.1
[0.3.0-alpha.1]: https://github.com/TheRussellMuscle/WareMaster/releases/tag/v0.3.0-alpha.1
