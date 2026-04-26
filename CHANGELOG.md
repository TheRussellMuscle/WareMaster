# Changelog

All notable changes to WareMaster are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and this project adheres to [Semantic Versioning](https://semver.org/).

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
