# WareMaster — Design & Implementation Plan

## Context

WareMaster is a free, open-source, cross-platform desktop companion for the Japanese TTRPG **Wares Blade**. The repo at [G:/source/WareMaster](.) currently has zero application code — only foundation files: [STACK.md](STACK.md) (locked stack decisions), [docs/rules/](docs/rules) (15 markdown rule chapters), and [docs/data/](docs/data) (21 YAML files of structured game data).

**Why this app:** Wares Blade has rich combat (Segment-based IN/DN/BN rolls), heavy bookkeeping (six abilities × six skills × multiple damage tracks × downtime healing rates × Ryude mecha state), and time-sensitive recovery (light damage heals 1/day, heavy damage heals at `1 per (16 − CON) days`). The WM ends up tracking all of this on paper. WareMaster automates the bookkeeping so the WM can focus on the story.

**Outcome:** A Tauri 2 desktop app (Win/Mac/Linux v1) that lets a Wares Maker manage campaigns, create and edit characters/NPCs/monsters/Ryude, spawn named instances from templates, advance an in-fiction clock with automatic recovery, run combats with auto-resolution and optional manual dice input, and rewind any of it via an event log. Plaintext YAML/Markdown vault — user-editable, git-friendly. Aesthetic: parchment, sepia ink, illuminated headings.

**User decisions locked (this turn):**
- **WM-only v1.** Players use physical dice; the WM types values into the manual-dice input when needed. No network sync.
- **Templates global by default**, with campaign-scoped allowed. Campaign-scoped wins on id collision.
- **Default vault: `~/Documents/WareMaster/`** via Tauri's `appDocumentDir()`. Movable in Settings.
- **Native Wares Blade vocabulary in UI** — etch, liet, gro, golda, segment, round, turn, etc. Real-world equivalents shown in tooltips, never as the primary label. (See §J / `<UnitTooltip>`.)

---

## Locked stack (from [STACK.md](STACK.md))

Tauri 2 · React 19 + TS · Vite · shadcn/ui · Tailwind v4 · Zustand · TanStack Router · YAML/Markdown via Tauri fs plugin · `tauri-plugin-updater` · MIT.

No SQLite. No backend. v1 = desktop only.

---

## Architecture overview

Three-layer separation enforced by directory:

```
src/domain/        Pure types + Zod schemas. No IO. No React.
src/engine/        Pure game logic (dice, combat, time, recovery). No IO. No React. Vitest-tested.
src/persistence/   Only layer that touches disk (Tauri fs).
src/components/    React UI. Reads stores; calls engine; never reads disk directly.
src/stores/        Zustand. Mediates between persistence and components.
```

Pure engine + pure domain = unit-testable rules; the rules are the heart of this app, so this matters.

---

## A. Directory layout (after scaffolding)

```
G:/source/WareMaster/
├── docs/                              EXISTING — source of truth for rules + reference data
│   ├── rules/                         15 .md chapters (unchanged)
│   ├── data/                          21 .yaml files (unchanged)
│   ├── README.md, SOURCE.md
├── .scripts/validate_yaml.py          EXISTING — strict YAML linter
│
├── src/                               React 19 frontend
│   ├── main.tsx
│   ├── styles/{globals,theme,print}.css
│   ├── routes/                        TanStack file-based routes
│   │   ├── __root.tsx, index.tsx, settings.tsx
│   │   ├── campaigns/{index,new,$cid/...}.tsx
│   │   ├── templates/{monsters,npcs,ryude}/...
│   │   └── reference/{classes,skills,weapons,armor,beastiary,ryude,techniques,tables}.tsx
│   ├── components/
│   │   ├── ui/                        shadcn primitives
│   │   ├── shell/{AppShell,Sidebar,CommandPalette}
│   │   ├── parchment/{ParchmentCard,IlluminatedHeading,SealedDivider,UnitTooltip,AcronymTooltip}
│   │   ├── stat/{StatBlock,MonsterStatBlock,RyudeStatBlock,SkillList,TechniqueList}
│   │   ├── dice/{DiceRoller,DiceInput,RollResultBadge}
│   │   ├── combat/{SegmentTimeline,CombatantRow,AttackPanel,DamageDialog}
│   │   ├── time/{ClockReadout,AdvanceTimeDialog,RecoveryToast}
│   │   ├── portraits/{Portrait,PortraitPicker}
│   │   ├── instance/InstanceSpawnDialog
│   │   └── editor/MarkdownEditor
│   ├── domain/                        types + Zod schemas
│   │   ├── ids.ts, attributes.ts
│   │   ├── character.ts, npc.ts, monster.ts, monster-instance.ts
│   │   ├── ryude.ts, ryude-instance.ts
│   │   ├── item.ts, technique.ts, skill.ts, class.ts
│   │   ├── campaign.ts, combat.ts, damage.ts, time.ts, events.ts
│   ├── engine/                        pure logic
│   │   ├── dice/{rng,roll,action-roll}.ts
│   │   ├── skill-check.ts
│   │   ├── combat/{machine,in-dn,attack,damage-application,ryude-tables}.ts
│   │   ├── time/{clock,recovery,ryude-self-repair}.ts
│   │   ├── derive/{base-values,absorption,armor-modifier}.ts
│   │   └── events/{apply,invert,log}.ts
│   ├── persistence/                   Tauri fs adapter
│   │   ├── paths.ts, yaml.ts, markdown.ts
│   │   ├── reference-loader.ts
│   │   ├── {campaign,character,npc,instance,template,portrait,history}-repo.ts
│   │   └── vault.ts
│   ├── stores/                        Zustand
│   │   └── {vault,campaign,reference,settings,combat,history}-store.ts
│   ├── hooks/{useReferenceData,useCampaign,useDiceRoll,useTimeAdvance,useUndoRedo,usePortrait}.ts
│   └── lib/{cn,dice-notation,format,invariant,wares-units}.ts
│
├── src-tauri/                         Rust shell
│   ├── Cargo.toml, tauri.conf.json, build.rs
│   ├── capabilities/{default,fs-vault}.json
│   ├── resources/                     bundled with binary
│   │   ├── data/                      copied from docs/data/ at build time
│   │   ├── rules/                     copied from docs/rules/ at build time
│   │   └── portraits/
│   │       ├── classes/{warrior,word-caster,spiritualist,tradesfolk}.png
│   │       ├── monsters/<monster-id>.png
│   │       ├── ryude/{footman,courser,maledictor}.png
│   │       └── npc/{merchant,soldier,noble,peasant,default}.png
│   └── src/{main,lib}.rs, commands/{vault,reference,portraits}.rs
│
├── package.json, pnpm-lock.yaml
├── tsconfig.json, vite.config.ts
├── tailwind.config.ts, postcss.config.js, components.json
└── (existing) README.md, STACK.md, LICENSE, .gitignore, .gitattributes
```

`routeTree.gen.ts` is auto-generated — add to `.gitignore`.

---

## B. Vault layout (runtime, on user's disk)

Default: `~/Documents/WareMaster/` (movable in Settings).

```
WareMaster/
├── waremaster.json                    vault metadata + schema version
├── templates/                         GLOBAL user-authored templates
│   ├── monsters/<id>.yaml
│   ├── npcs/<id>.yaml
│   └── ryude/<id>.yaml
├── portraits/                         USER custom portraits
│   ├── characters/<character-id>.png
│   ├── npcs/<instance-id>.png
│   ├── monsters/<instance-id>.png
│   ├── ryude/<instance-id>.png
│   └── templates/<template-id>.png
└── campaigns/<cmp_ULID-slug>/
    ├── campaign.yaml                  metadata + clock
    ├── characters/<id>.yaml + <id>.md (biography)
    ├── npcs/instances/<id>.yaml + notes/<id>.md
    ├── monsters/instances/<id>.yaml
    ├── ryude/instances/<id>.yaml
    ├── templates/                     CAMPAIGN-SCOPED templates (override globals on id collision)
    ├── sessions/YYYY-MM-DD-<slug>.md
    ├── combat/<session-id>.yaml       archived combat logs
    └── .history/                      event log + snapshots
        ├── events.ndjson
        ├── snapshots/<n>.yaml
        └── head.json
```

**IDs:** ULID with type prefix — `cmp_`, `cha_`, `npc_`, `mon_`, `ryu_`, `tpl_*_`, `evt_`, `combat_`. Time-sortable; collision-safe across cloud sync.

**Template resolution chain** for an instance with `template_id: foo`:
1. Bundled reference (e.g. `tusktooth`, `az-cude`) in `src-tauri/resources/data/`.
2. Campaign-scoped: `campaigns/<id>/templates/...`. Wins on collision.
3. Global vault: `vault/templates/...`.
4. None → instance shows a "missing template" repair UI; not crashed.

**Portrait resolution chain:**
1. Instance custom (`portrait_path` field).
2. Template custom (`vault/portraits/templates/<template-id>.png`).
3. Bundled default by `class_id` / `monster_id` / `ryude.type` / `npc.role`.

**No base64 in YAML.** Portraits are files; instances reference vault-relative paths. Tauri's `convertFileSrc` renders them; bundled portraits served via a custom `bundle://` protocol registered in [src-tauri/src/lib.rs](src-tauri/src/lib.rs).

---

## C. Domain model (TypeScript + Zod)

Every disk read goes through `Schema.parse(...)`. YAML is hand-editable, so validation errors must surface a "this file failed validation" diff view rather than crashing.

Each schema includes `schema_version: number` for future migrations.

Key entities:

- **Character** — 6 abilities (SEN/AGI/WIL/CON/CHA/LUC), `class_id`, `profession_id?`, `word_caster_gate?`, `spiritualist_order?`, `skills[]` (each with level + pp), `techniques[]` (ids), `equipment` (weapon ids + body/head/shield slots + inventory), `golda`, `completion_bonus`, `luc_reserves`, `initial_luc`, `state` (physical_damage, mental_damage, available_luc, status enum, active_effects[], last_recovery_tick), `portrait_path`, `notes_path`, biographical fields.
- **MonsterTemplate** — mirrors [docs/data/beastiary.yaml](docs/data/beastiary.yaml) including `*_vs_ryude` bracketed variants.
- **MonsterInstance** — `template_id`, `name` override, `overrides: {...}`, `state` (current damage, status_effects, location, last_recovery_tick), `portrait_path`.
- **NpcTemplate** — `discriminatedUnion('archetype', [BeastNpc, SimpleNpc, FullCharacterNpc])` covering the three archetypes (combat-focused → beast schema; merchant/courtier → simple stats; major NPC → full character schema).
- **NpcInstance** — instance/override pattern.
- **RyudeTemplate** — `discriminatedUnion('type', [Footman, Courser, Maledictor])`. Courser unlocks self-repair flag; Maledictor requires `ryude_mind_durability`, `binding_modifier`.
- **RyudeInstance** — `template_id`, `current_unit_durability`, `attribute_damage` (SPE/POW/ARM/BAL deltas), `equipped_operator`, `attunement_state`, `repair_queue: RepairTicket[]`, location.
- **Campaign** — id, name, wm, regional flavor, `clock: { current: InGameTime; granularity: 'minute' }`, dramatis-personae index.
- **Item / Weapon / Armor / Technique / Skill / Class** — load-time only from bundled reference data. Characters reference by id.
- **Event** (see §E) — discriminated union of all state-mutating operations.

Branded id types (`type CharacterId = string & { readonly __brand: 'CharacterId' }`) prevent cross-passing.

---

## D. Time / clock engine

**Campaign Clock** stored in [campaign.yaml](#) using native Wares Blade time vocabulary (rule [15](docs/rules/15-units-and-glossary.md)).

Internally the clock is a single integer of **segments since campaign start** (`segment_index: number`). Display layer formats to native units; tooltips reveal real-world equivalents:

| Native unit | Stored as | Display | Tooltip |
|---|---|---|---|
| Segment (S) | base | "Segment 142" | "~2 sec — used during combat" |
| Round (R) | 15 S | "Round 9" | "~30 sec (15 Segments)" |
| Turn (T) | 150 S | "Turn 12" | "~5 min (10 Rounds)" |
| Hour (H) | 1800 S | "Hour 4" | "1 half-etch (~1 hour)" |
| Etch | 3600 S | "3rd Etch" | "~2 hours (12 Etches = 1 day)" |
| Day | 43200 S | "Day 22" | "12 Etches" |

**Time helpers** in [src/engine/time/clock.ts](src/engine/time/clock.ts):
- `SEGMENT = 1`, `ROUND = 15`, `TURN = 150`, `HOUR = 1800`, `ETCH = 3600`, `DAY = 43200` (all in segments).
- `advance(clock, segments)`, `segmentsBetween(a, b)`, `formatInGame(clock)` returns native-unit display string ("3rd Etch, Day 22 — Hour 4").

**Recovery: lazy + closed-form** (recommended).

Each character/instance carries `state.last_recovery_tick` as a segment index. When the clock advances or a sheet is opened:

```
elapsed = clock.current − state.last_recovery_tick   (segments)
heal Light Physical = floor(elapsed / DAY)
heal Light Mental   = floor(elapsed / HOUR)
heal Heavy Physical = floor(elapsed / (DAY·(16−CON)))
heal Heavy Mental   = floor(elapsed / (HOUR·(16−CON)))
```

Apply Heavy first; once Heavy is zero, leftover capacity heals remaining Light at Light rate (rule [09:50](docs/rules/09-damage-and-healing.md)).

**Special cases (unit-tested):**
- **Physical Incapacitation does NOT heal naturally** — skip recovery; instead `damage += floor(elapsed / TURN)` (rule [09:36](docs/rules/09-damage-and-healing.md)).
- **Active effects** with `expires_at` get swept on each advance; expired ones emit `effect-expired` events.
- **Ryude Coursers** self-repair `1 Durability/day` (rule [14:232](docs/rules/14-ryude.md)). Computed in [src/engine/time/ryude-self-repair.ts](src/engine/time/ryude-self-repair.ts).
- **Ryude repair queue** — each queued ticket has an estimated completion time; sweep on advance to mark complete.

**Advance Time UX:** [AdvanceTimeDialog.tsx](src/components/time/AdvanceTimeDialog.tsx) with presets in native units (`+1 Etch`, `+1 Day`, `+1 Week`, `+1 Turn`, `+1 Round`, `next dawn`, `next dusk`, `to next session`) plus a custom amount picker (Segments / Turns / Etches / Days). Preview pane shows the per-character heal summary, expiring effects, and Ryude repairs that will land. All time labels in the preview use native units with `<UnitTooltip>`. Confirm → emits a single `TimeAdvancedEvent` with the recovery summary folded in for atomic undo.

**Combat time** is tracked separately in Segments; the combat session bumps the campaign clock once it ends.

---

## E. Undo / rewind — event log + periodic snapshots

Per-campaign `.history/`:
- **`events.ndjson`** — append-only newline-delimited JSON. One `Event` per line.
- **`snapshots/<n>.yaml`** — full state every 50 events (configurable in Settings).
- **`head.json`** — `{ headIndex, lastSnapshotIndex }`. Undo decrements head; redo advances.

**Event shape** ([src/domain/events.ts](src/domain/events.ts)):

```ts
type Event =
  | DamageAppliedEvent | DamageHealedEvent
  | EquipmentSwappedEvent
  | TimeAdvancedEvent           // includes recovery summary
  | InstanceSpawnedEvent | InstanceDeletedEvent
  | CharacterCreatedEvent | CharacterFieldEditedEvent
  | CombatStartedEvent | CombatSegmentResolvedEvent | CombatEndedEvent
  | DiceRolledEvent             // audit-only
  | TechniqueCastEvent
  | RecoveryAppliedEvent;

interface BaseEvent {
  id: string;            // ULID
  timestamp_real: string;
  timestamp_ingame: string;
  campaign_id: string;
  inverse: Patch;        // RFC-6902 JSON patch describing how to undo
}
```

**Apply / invert** ([src/engine/events/apply.ts](src/engine/events/apply.ts), [invert.ts](src/engine/events/invert.ts)) — switch over `event.type`. For composite events (`TimeAdvancedEvent`), the inverse data is captured **at apply time** (e.g. a list of every character whose damage was decremented). Undo is then deterministic regardless of state at undo time, and redo is cheap.

**Why event log over snapshot-only:** "rewind to the moment before Old Fang ambushed the party" is a first-class feature, not just emergency undo. Snapshots are the speed layer for opening a campaign quickly; events are the semantic layer for the timeline UI ("Old Fang took 7 Physical from Greatsword Crit").

**Timeline UI** ([src/routes/campaigns/$cid/timeline.tsx](src/routes/campaigns/$cid/timeline.tsx)) shows the event log grouped by Segment / Turn / session, with "rewind to here" actions per node.

---

## F. Combat tracker

**CombatSession** entity ([src/domain/combat.ts](src/domain/combat.ts)):

```ts
interface CombatSession {
  id: CombatSessionId;
  campaign_id: CampaignId;
  state: 'idle' | 'rolling-init' | 'declaring' | 'acting' | 'ended';
  segment_index: number;
  combatants: Combatant[];
  declared_actions: DeclaredAction[];
  segment_log: SegmentLogEntry[];
  started_at_ingame: InGameTime;
  ended_at_ingame: InGameTime | null;
  rng_seed: number;        // for deterministic replay/redo
}

type Combatant = {
  combatant_id: string;
  ref:
    | { kind: 'character'; id: CharacterId }
    | { kind: 'npc-instance'; id: NpcInstanceId }
    | { kind: 'monster-instance'; id: MonsterInstanceId }
    | { kind: 'ryude-instance'; id: RyudeInstanceId; operator_id: CharacterId | NpcInstanceId };
  segment_in: number;
  segment_dn: number;
  current_absorption: number;
  absorption_modifier: 1 | 2 | 0.5;     // doubled (perfect IN/DN) / halved (total fail)
  status: 'active' | 'incapacitated' | 'fled' | 'down';
  next_segment_in_modifier: 1 | 0.5;    // total-fail-on-BN halves IN next segment
};
```

**State machine** ([src/engine/combat/machine.ts](src/engine/combat/machine.ts)) as a discriminated-union reducer (no XState dep needed):

```
idle ──start()──▶ rolling-init ──rollAll()──▶ declaring
declaring ──declareAction(c, a)──▶ declaring (until all locked)
declaring ──allDeclared()──▶ acting
acting ──resolveNext()──▶ acting (descending IN order)
acting ──segmentComplete()──▶ rolling-init  (next segment)
acting ──end()──▶ ended
```

Each transition emits an `Event` to the campaign log → entire fight is rewindable.

**Surfaces:**
- **`engine/combat/in-dn.ts::rollInDn`** — `1D10 + Base IN`, same D10 + Base DN. Detects Perfect (doubles absorption this segment) / Total Failure (halves it).
- **`engine/combat/attack.ts::resolveAttack`** — BN Roll = `1D10 + Base BN + weapon.bn_modifier + skill_level`. Detects Critical (`dice ≥ weapon.critical_value` AND `total ≥ DN`) and Perfect Success (all 10s + total ≥ DN). Damage = `damageValueRoll(weapon.damage_value)` × `(BN_dice_count + 1)` on crit/perfect, minus current absorption. Returns a `ResolvedAttack` event the UI shows before the WM clicks Apply or Discard.
- **`engine/combat/damage-application.ts::applyDamage`** — applies, then detects stage transitions:
  - **Light → Heavy** (crossing `Durability`): triggers WIL Roll on target with Difficulty = damage taken; for Physical, also a CON Roll. Failing → Incapacitated. (Rule [09:28-30](docs/rules/09-damage-and-healing.md).)
  - **Heavy → Incap** (`> 2× Durability`): set `incap-physical` / `incap-mental` flag.
  - **`> 3× Durability`**: dead / insane.
  - Emits `DamageAppliedEvent` + follow-up `StageTransitionEvent`s. UI fires a parchment-styled toast.
- **`engine/combat/ryude-tables.ts`** — Operator Error Tables A/B (rule [14:124-145](docs/rules/14-ryude.md)) and Standard / Critical Damage Tables A & B + Damage Location Table (rule [14:170-208](docs/rules/14-ryude.md)). Vs human targets, damage × 10 (rule [14:160](docs/rules/14-ryude.md)).

**Manual dice input.** Every roll API (`rollInDn`, `resolveAttack`, `applyDamage`'s WIL/CON rolls) accepts `manualDice?: number[]`. The [`DiceInput`](src/components/dice/DiceInput.tsx) modal asks for the count and faces the engine expected ("1D10 for Initiative", "2D5 for damage") and lets the WM type values or click die-face buttons. Same crit-detection code path → identical results to auto.

**Timeline visualization** ([SegmentTimeline.tsx](src/components/combat/SegmentTimeline.tsx)) — horizontal segment strip with IN order, declared actions, resolved attacks per node. Click a segment to jump; "rewind to here" emits an undo to that point.

---

## G. Dice engine

[src/engine/dice/roll.ts](src/engine/dice/roll.ts):

```ts
interface RollSpec {
  dice: number;          // 1, or ≥2 when LUC dice added
  faces: 10 | 5;
  baseAttribute: number; // floor(score/3); 0 if N/A
  skillLevel?: number;
  modifier?: number;     // weapon bn_mod, armor mod, misc
  difficulty?: number;
  criticalValue?: number;     // weapon's
  manual?: number[];     // substitutes RNG; length must equal `dice`
  rng?: Rng;
}

interface RollResult {
  diceRolled: number[];
  baseAttribute: number;
  skillLevel: number;
  modifier: number;
  total: number;
  difficulty?: number;
  outcome: 'success' | 'failure' | 'perfect-success' | 'total-failure';
  isCritical?: boolean;
  rerollUsed: boolean;
  lucDiceUsed: number;
  ppEligible: boolean;
}
```

Behaviour codified in [`action-roll.ts`](src/engine/dice/action-roll.ts):
- All dice = 1 → `total-failure` (overrides success).
- All dice = 10 AND `total ≥ difficulty` → `perfect-success`.
- If `skillLevel ≥ difficulty`, offer **one re-roll** of the D10 (rule [07](docs/rules/07-action-rolls.md)).
- LUC dice are pre-allocated by spec; engine rolls `dice + lucDice` D10s and sums. PP gain multiplier on perfect/total-fail = `(1 + lucDiceUsed)`.

**Dice-notation parser** [src/lib/dice-notation.ts](src/lib/dice-notation.ts) handles `"2D5+5"`, `"1D10-7"`, `"5D5+80"`, and the bastard-sword 1H/2H duality `"1D10+3(5)"`. Returns `{ dice, faces, modifier, total, perOne, perTen }`.

**RNG** is a seedable `mulberry32` PRNG. Combat sessions persist their seed → rewind+redo replays identically.

---

## H. Skill check engine

[src/engine/skill-check.ts](src/engine/skill-check.ts) wraps the dice engine with:

1. Loads the skill from the bundled catalog ([docs/data/skills.yaml](docs/data/skills.yaml)).
2. Computes `Base Attribute = floor(score / 3)` from the character (LUC excluded — per rule [04](docs/rules/04-attributes-and-derived.md)).
3. Calls [`action-roll.ts`](src/engine/dice/action-roll.ts).
4. Applies the skill-≥-difficulty re-roll rule.
5. Computes PP per [docs/data/tables.yaml](docs/data/tables.yaml) `proficiency_gains`.
6. Computes LUC recovery: only on perfect-success AND non-combat skill (rule [07](docs/rules/07-action-rolls.md)).
7. Emits a `SkillCheckResolvedEvent` to history.

Combat rolls (BN, IN/DN) bypass this wrapper and use [src/engine/combat/](src/engine/combat) directly because the rules diverge (Total Failure on BN halves next-segment IN; LUC on IN/DN does not restore LUC).

---

## I. Bundled reference data

**Approach: build-time copy via Tauri resource bundle.**

A [src-tauri/build.rs](src-tauri/build.rs) step copies `../docs/data/**` and `../docs/rules/**` into `src-tauri/resources/` before bundling. [tauri.conf.json](src-tauri/tauri.conf.json) ships those resources inside the binary. Rust command [`get_reference_data(kind, id)`](src-tauri/src/commands/reference.rs) returns the YAML text; the frontend parses with the corresponding Zod schema in [src/persistence/reference-loader.ts](src/persistence/reference-loader.ts) and caches in the `reference-store`.

Why not compile-time JSON imports:
- **Hot iteration in dev** — during `pnpm tauri dev`, the loader reads `docs/data/` directly via a dev-mode path. Edit YAML, refresh, no rebuild.
- **YAML preserves comments and `source: "Playkit p. XX"` attributions** that JSON imports would strip.
- **Single source of truth.** `docs/` is canonical for both the app and human readers.
- **Cost is trivial** — ~80 KB parsed once at startup.

---

## J. UI shell & parchment theming

**Parchment palette** in [src/styles/theme.css](src/styles/theme.css):

```css
@import "tailwindcss";

@theme {
  --color-parchment-50:  #faf3e3;
  --color-parchment-100: #f1e6c8;
  --color-parchment-200: #e6d5a8;
  --color-parchment-300: #d4be88;
  --color-parchment-400: #b29562;
  --color-ink:           #2c1f0f;
  --color-ink-soft:      #4a3520;
  --color-rust:          #8b3a2a;     /* danger / Ryude crit */
  --color-verdigris:     #2e5e4a;     /* success / healing */
  --color-gilt:          #b88836;     /* perfect success / gold */

  --font-display: "Cinzel", "EB Garamond", Georgia, serif;
  --font-body:    "EB Garamond", "Iowan Old Style", Georgia, serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  --border-illuminated: 2px double var(--color-parchment-400);
}
```

[globals.css](src/styles/globals.css) applies a paper-fiber SVG noise filter to `body`. Cards use `--color-parchment-50` with subtle vignette inner shadow.

**shadcn/ui** components installed: `button`, `card`, `dialog`, `input`, `select`, `tabs`, `tooltip`, `toast`, `command`, `popover`, `scroll-area`, `separator`, `dropdown-menu`. Override their CSS variables in `theme.css` so they pick up parchment colors automatically. `UnitTooltip` / `AcronymTooltip` wrap the shadcn `tooltip` with the parchment styling and the native-unit lookup.

**AppShell** layout ([src/components/shell/AppShell.tsx](src/components/shell/AppShell.tsx)):
- Left **Sidebar**: vault path, current campaign, nav (Characters, NPCs, Monsters, Ryude, Combat, Timeline, Reference).
- Top bar: campaign clock readout, undo/redo (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`), command palette (`Ctrl/Cmd+K`).
- Main: route outlet wrapped in `ParchmentCard`.
- Bottom-right: compact dice tray (always-on `DiceRoller` without leaving the page).

### Native Wares Blade vocabulary

The UI uses **Wares Blade's own units** as the primary label everywhere (per rule [15](docs/rules/15-units-and-glossary.md)). Real-world equivalents appear only inside tooltips. This keeps the immersive feel and matches how the rules and players speak.

**`<UnitTooltip>` component** ([src/components/parchment/UnitTooltip.tsx](src/components/parchment/UnitTooltip.tsx)) wraps any unit reference and surfaces a real-world hint on hover/focus. Single source of truth keyed off the units table.

```tsx
<UnitTooltip unit="etch" />            // renders "Etch"   → tooltip: "~2 hours (12 Etches = 1 day)"
<UnitTooltip unit="liet" amount={3} /> // renders "3 liets" → tooltip: "~12 m (1 liet ≈ 4 m)"
<UnitTooltip unit="golda" amount={125} /> // renders "125 G" → tooltip: "Currency: 1 silver = 1 golda"
```

Backed by a constants table [src/lib/wares-units.ts](src/lib/wares-units.ts):

```ts
export const WARES_UNITS = {
  // time (combat / fiction)
  segment:  { label: 'Segment',  abbr: 'S', realWorld: '~2 sec' },
  round:    { label: 'Round',    abbr: 'R', realWorld: '~30 sec (15 Segments)' },
  turn:     { label: 'Turn',     abbr: 'T', realWorld: '~5 min (10 Rounds)' },
  hour:     { label: 'Hour',     abbr: 'H', realWorld: '1 half-etch (~1 hour)' },
  etch:     { label: 'Etch',                 realWorld: '~2 hours (12 Etches = 1 day)' },
  day:      { label: 'Day',                  realWorld: '12 Etches (~24 hours)' },
  // distance
  litte:    { label: 'litte',                realWorld: '~4 cm' },
  liet:     { label: 'liet',                 realWorld: '~4 m' },
  li:       { label: 'li',                   realWorld: '~4 km' },
  // mass
  gran:     { label: 'gran',                 realWorld: '~1.2 g' },
  gren:     { label: 'gren',                 realWorld: '~1.2 kg' },
  gro:      { label: 'gro',                  realWorld: '~1.2 tons' },
  // volume
  garom:    { label: 'garom',                realWorld: '~0.9 liters' },
  // currency
  golda:    { label: 'golda',   abbr: 'G',   realWorld: 'Currency: 1 silver = 1 golda; 1 gold = 100 silver = 100,000 copper' },
} as const;
```

Surfaces that consume `<UnitTooltip>`:

- `ClockReadout` (e.g. "3rd Etch, Day 22").
- `MonsterStatBlock` movement: `"1 liet/Segment"`, weight `"1.5 liet"`.
- `Weapon` price `"125 G"`, `Armor` weight `"3 gren"`.
- Recovery toasts: `"+1 Light Physical (1/Day)"`, `"+1 Heavy Mental (1 per Hour at CON 10)"`.
- Repair queue ETA: `"3 Etches remaining (240 G)"`.
- Combat segment timeline: `"Segment 14 → Round 1"`.

**Acronym handling.** The glossary defines IN/DN/BN/PP/PC/NPC/WM/D5/D10/G; `<AcronymTooltip>` (a sibling component using the same primitive) provides hover hints for those throughout the UI.

---

## K. Implementation phases

Each phase ships a runnable app. Phases are sequential; each phase's deliverables are committable as a milestone.

### Phase 1 — Scaffolding + theme (1–2 days)
**Goal:** `pnpm tauri dev` opens a window with the parchment theme.
1. Init Vite + React 19 + TS — [package.json](package.json), [vite.config.ts](vite.config.ts), [tsconfig.json](tsconfig.json), [src/main.tsx](src/main.tsx).
2. Init Tauri 2 — [src-tauri/Cargo.toml](src-tauri/Cargo.toml), [tauri.conf.json](src-tauri/tauri.conf.json), [src-tauri/src/main.rs](src-tauri/src/main.rs), [src-tauri/src/lib.rs](src-tauri/src/lib.rs), [capabilities/default.json](src-tauri/capabilities/default.json).
3. Tailwind v4 + shadcn/ui — [tailwind.config.ts](tailwind.config.ts), [postcss.config.js](postcss.config.js), [components.json](components.json), [styles/globals.css](src/styles/globals.css), [styles/theme.css](src/styles/theme.css).
4. TanStack Router file-based routes — [src/routes/__root.tsx](src/routes/__root.tsx), [routes/index.tsx](src/routes/index.tsx).
5. AppShell stubs — [components/shell/{AppShell,Sidebar,CommandPalette}.tsx](src/components/shell).
6. ParchmentCard PoC — [components/parchment/ParchmentCard.tsx](src/components/parchment/ParchmentCard.tsx).
7. Native-units constants + tooltip primitives — [src/lib/wares-units.ts](src/lib/wares-units.ts), [components/parchment/{UnitTooltip,AcronymTooltip}.tsx](src/components/parchment).
8. Extend [.gitignore](.gitignore) for `routeTree.gen.ts`, `src-tauri/target/`, `dist/`.

### Phase 2 — Reference data loader + reference browser (2–3 days)
**Goal:** Browse all classes, skills, weapons, armor, monsters, Ryude, techniques, tables.
1. Build-time bundling — [src-tauri/build.rs](src-tauri/build.rs), update [tauri.conf.json](src-tauri/tauri.conf.json) `resources`.
2. Rust serve command — [src-tauri/src/commands/reference.rs](src-tauri/src/commands/reference.rs).
3. Zod schemas — [src/domain/{class,skill,item,technique,monster,ryude}.ts](src/domain).
4. Loader + store — [src/persistence/reference-loader.ts](src/persistence/reference-loader.ts), [src/stores/reference-store.ts](src/stores/reference-store.ts).
5. Browser routes — [src/routes/reference/*.tsx](src/routes/reference).
6. Stat block components — `StatBlock`, `MonsterStatBlock`, `RyudeStatBlock`, `SkillList`, `TechniqueList`.

### Phase 3 — Vault, campaigns, characters (3–5 days)
**Goal:** Create a campaign, create a PC, save to disk, reopen.
1. Vault bootstrap + path picker — [src-tauri/src/commands/vault.rs](src-tauri/src/commands/vault.rs), [src/persistence/{vault,paths}.ts](src/persistence).
2. Scoped capabilities — [src-tauri/capabilities/fs-vault.json](src-tauri/capabilities/fs-vault.json).
3. YAML/Markdown adapters — [src/persistence/{yaml,markdown}.ts](src/persistence).
4. Campaign + Character schemas — [src/domain/{campaign,character,attributes,ids}.ts](src/domain).
5. Repos — [src/persistence/{campaign,character}-repo.ts](src/persistence).
6. Routes — [src/routes/campaigns/{index,new,$cid/...}.tsx](src/routes/campaigns).
7. **Character Creation Wizard** following the 8 steps in [docs/rules/03-character-creation.md](docs/rules/03-character-creation.md) — class pick, ability rolls (3D5), skill-package selection, equipment-package selection, Word-Caster gate (if applicable), Spiritualist order (if applicable), Tradesfolk profession (if applicable), portrait + biography. Reuses the parsed [classes.yaml](docs/data/classes.yaml) reference data.
8. `StatBlock`, `Portrait` (default-class fallback), character sheet view.

### Phase 4 — Templates + named instances + portraits (3–4 days)
**Goal:** Spawn three named Coursers into a campaign, give one a custom portrait.
1. Template repo + global template browser — [src/persistence/template-repo.ts](src/persistence/template-repo.ts), [src/routes/templates/*](src/routes/templates).
2. Instance schemas + repo — [src/domain/{monster-instance,ryude-instance,npc-instance}.ts](src/domain), [src/persistence/instance-repo.ts](src/persistence/instance-repo.ts).
3. NPC schemas (3 archetypes via discriminated union) — [src/domain/npc.ts](src/domain/npc.ts).
4. Spawn dialog — [src/components/instance/InstanceSpawnDialog.tsx](src/components/instance/InstanceSpawnDialog.tsx).
5. Routes — [src/routes/campaigns/$cid/{npcs,monsters,ryude}/...](src/routes/campaigns).
6. Portrait pipeline — [src-tauri/src/commands/portraits.rs](src-tauri/src/commands/portraits.rs) (registers `bundle://` protocol), [src/persistence/portrait-repo.ts](src/persistence/portrait-repo.ts), [src/components/portraits/{Portrait,PortraitPicker}.tsx](src/components/portraits), [src/hooks/usePortrait.ts](src/hooks/usePortrait.ts).
7. Bundled default portrait set committed under [src-tauri/resources/portraits/](src-tauri/resources/portraits) (placeholders OK initially; replace with art).

### Phase 5 — Dice + skill check engines (2–3 days)
**Goal:** Roll a skill check (auto or manual) from any character sheet.
1. RNG + dice primitives — [src/engine/dice/{rng,roll,action-roll}.ts](src/engine/dice).
2. Notation parser — [src/lib/dice-notation.ts](src/lib/dice-notation.ts).
3. Skill check engine — [src/engine/skill-check.ts](src/engine/skill-check.ts).
4. Derive helpers — [src/engine/derive/{base-values,absorption,armor-modifier}.ts](src/engine/derive).
5. UI — [src/components/dice/{DiceRoller,DiceInput,RollResultBadge}.tsx](src/components/dice).
6. Wire skill rows on character sheets to `DiceRoller`. Add a topbar "Quick Roll" + bottom-right tray.
7. Vitest tests — perfect-success, total-failure, re-roll-on-skill≥diff, LUC dice, manual mode parity, bastard-sword notation.

### Phase 6 — Time / clock / recovery (3 days)
**Goal:** Advance the clock; characters auto-heal; effects expire; Ryude self-repair.
1. Time primitives — [src/engine/time/{clock,recovery,ryude-self-repair}.ts](src/engine/time).
2. Event foundation — [src/domain/events.ts](src/domain/events.ts), [src/engine/events/{apply,invert,log}.ts](src/engine/events), [src/persistence/history-repo.ts](src/persistence/history-repo.ts).
3. Campaign clock wiring — [src/stores/campaign-store.ts](src/stores/campaign-store.ts).
4. Advance Time UI — [src/components/time/{ClockReadout,AdvanceTimeDialog,RecoveryToast}.tsx](src/components/time).
5. Effect expiry sweep + Physical-Incap auto-damage as `time-advanced` side effects.
6. Tests: closed-form recovery for varied CON, mixed Heavy/Light, Courser self-repair, repair-queue completion.

### Phase 7 — Combat tracker + undo/rewind (5–7 days)
**Goal:** Run a complete combat from initiative through resolution; rewind any Segment.
1. Combat domain — [src/domain/combat.ts](src/domain/combat.ts).
2. Combat engine — [src/engine/combat/{machine,in-dn,attack,damage-application,ryude-tables}.ts](src/engine/combat).
3. Combat store + repo — [src/stores/combat-store.ts](src/stores/combat-store.ts), [src/persistence/combat-repo.ts](src/persistence/combat-repo.ts).
4. UI — [src/routes/campaigns/$cid/combat/...](src/routes/campaigns), [src/components/combat/{SegmentTimeline,CombatantRow,AttackPanel,DamageDialog}.tsx](src/components/combat).
5. Stage-transition prompts (WIL/CON Roll on Heavy crossing).
6. Ryude attacks: damage ×10 vs human targets; Standard/Critical Damage Tables drive [ryude-tables.ts](src/engine/combat/ryude-tables.ts).
7. Undo/redo wired — [src/stores/history-store.ts](src/stores/history-store.ts), [src/hooks/useUndoRedo.ts](src/hooks/useUndoRedo.ts), [src/routes/campaigns/$cid/timeline.tsx](src/routes/campaigns).
8. Snapshot compaction setting in [src/routes/settings.tsx](src/routes/settings.tsx).
9. Tests: full segment round-trip, manual-dice parity, total-fail-IN-halving, crit multiplier with N BN dice.

### Phase 7.5 — Artwork pass (timeline TBD)
**Goal:** Replace placeholders with real illustrations across the entire app, including reference pages.

1. Class portraits — `src-tauri/resources/portraits/classes/{warrior,word-caster,spiritualist,tradesfolk}.png` plus optional sub-variants for Spiritualist orders, Tradesfolk professions, and Word-Caster gates.
2. Ryude portraits — by type (`footman`, `courser`, `maledictor`) and per sample unit (`az-cude`, `maltu-ragorsu`, `gisah-sharukann`).
3. Bestiary illustrations — one per bundled monster id under `src-tauri/resources/portraits/monsters/<id>.png`.
4. NPC role placeholders — `merchant`, `soldier`, `noble`, `peasant`, `default`.
5. **Reference page imagery** — decorative art on Classes / Skills / Weapons / Armor / Techniques / Tables. Not just stat blocks: each Word-Casting Gate gets its own symbol/icon; Numetic Arts and Invocations get distinguishing imagery; weapon/armor categories get header art.
6. Page chrome — illuminated headings can pick up small drop-cap or marginalia art; `SealedDivider` can take an optional sigil prop.
7. Asset pipeline — confirm bundle size budget and image format (PNG with alpha, ~512×512 for portraits, larger for category headers). Compression: lossless or near-lossless (oxipng or similar).

Does **not** introduce new domain or engine code; only assets and a small amount of UI wiring (prop additions where art is consumed).

### Phase 8 (V1 polish) — distribution, updater, journal (2–3 days)

**Status update (v0.3.0-alpha.1):** items 1 and 2 (CI release workflow + `tauri-plugin-updater` config + ed25519 signing key) shipped early to support an alpha tester program after Phase 3. Tester builds now arrive automatically on every tag push. Remaining Phase 8 scope = items 3–6 below.

1. ~~CI: [.github/workflows/release.yml](.github/workflows/release.yml) builds Win/Mac/Linux artifacts.~~ **Shipped in v0.3.0-alpha.1.**
2. ~~`tauri-plugin-updater` config + signing key.~~ **Shipped in v0.3.0-alpha.1.**
3. Markdown editor (Tiptap or Milkdown) for biographies + session journals — [src/components/editor/MarkdownEditor.tsx](src/components/editor/MarkdownEditor.tsx).
4. Print-friendly character sheet — [src/styles/print.css](src/styles/print.css).
5. Vault export/import (zip).
6. Onboarding flow (first-launch wizard).
7. OS code signing (Authenticode for Windows, Apple Developer ID + notarization for macOS) — deferred from the alpha cycle to remove the SmartScreen / Gatekeeper warnings testers see today.

---

## L. Critical files (where the architecture concentrates)

- [src/engine/dice/action-roll.ts](src/engine/dice/action-roll.ts) — core roll resolver
- [src/engine/combat/machine.ts](src/engine/combat/machine.ts) — combat FSM
- [src/engine/time/recovery.ts](src/engine/time/recovery.ts) — closed-form healing
- [src/persistence/reference-loader.ts](src/persistence/reference-loader.ts) — bundled-data → typed catalog
- [src/domain/events.ts](src/domain/events.ts) — every state-mutating operation
- [src/persistence/instance-repo.ts](src/persistence/instance-repo.ts) — template ↔ instance reconciliation
- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) — resource bundling + capabilities
- [src/styles/theme.css](src/styles/theme.css) — parchment look

## Existing utilities to reuse

- **All 21 YAMLs in [docs/data/](docs/data)** — bundled as canonical reference.
- **[.scripts/validate_yaml.py](.scripts/validate_yaml.py)** — runs in CI and pre-commit to keep the source-of-truth YAML lint-clean.
- **[docs/rules/](docs/rules) chapter cross-refs** — every domain/engine file should cite the rule chapter it implements (e.g. `// Rule §08 line 38`) so the connection survives.
- **`.gitattributes` LF normalization + binary handling for portraits** — already in place.

---

## M. Resolved decisions (this turn)

- **Perspective:** WM-only v1. Manual dice input is for "the player at the table rolled a 7; the WM types 7 into the modal." Player-shared multi-device is out of scope for v1, but the event-log + plaintext-vault foundation keeps that door open.
- **Templates:** global vault default; campaign-scoped allowed; campaign-scoped wins on id collision.
- **Vault:** `~/Documents/WareMaster/` default; movable in Settings.

## N. Deferred decisions (Phase 4–5 boundary)

- **Specialized-skill governing attribute** — `Word-Casting`, `Numenism`, `Invocation`, `Drive` have `attribute: null` in [docs/data/skills.yaml](docs/data/skills.yaml). Rules [11](docs/rules/11-word-casting.md)–[13](docs/rules/13-invocations.md) need a closer pass to encode which attribute governs each Action Roll involving them. Plan: parse those rules and extend `skills.yaml` with a `for_action_roll_attribute` field before Phase 5. Until then, the engine prompts the user.
- **Bastard-sword 1H/2H duality** — notation parser must handle `"1D10+3(5)"`. Normalize at load to `{ oneHanded, twoHanded }`; runtime stance toggle on the equipment slot.

---

## Verification

Each phase is verified end-to-end before the next begins.

**Phase 1 verification:** `pnpm install && pnpm tauri dev` opens a window with parchment-themed AppShell, sidebar, and ParchmentCard demo. Demo page contains every native unit wrapped in `<UnitTooltip>`; hover reveals the real-world equivalent. No console errors.

**Phase 2 verification:** `pnpm tauri dev`; navigate to `/reference/beastiary` → see all 5 monsters from [docs/data/beastiary.yaml](docs/data/beastiary.yaml) rendered. Edit `tusktooth.base_con` in the YAML; refresh → updated value visible (dev hot-reload).

**Phase 3 verification:** Create campaign "Blackmarsh"; create a Warrior with Battler skill package and Equipment Package A. Close app. Reopen → campaign and character intact. Inspect `~/Documents/WareMaster/campaigns/cmp_*/characters/cha_*.yaml` → human-readable, lint-clean per `validate_yaml.py`.

**Phase 4 verification:** Spawn three Maltu-Ragorsu instances under three different names, assign one operator to each, give one a custom portrait. Close app. Reopen → all three instances appear in the campaign Ryude list with correct names, operators, portraits.

**Phase 5 verification:** Vitest passes for [src/engine/dice/*.test.ts](src/engine/dice). Manual UI test: roll Negotiation skill on a character → sees structured outcome with re-roll prompt when applicable; switch to manual mode, type dice values, verify identical outcome path.

**Phase 6 verification:** Damage a character to 5 Light Physical. Advance time +5 days → character heals to 0. Damage to 12 (Heavy) on a CON 10 character; advance +6 days → 1 Heavy point recovered. Cast a 1-Turn technique; advance +6 minutes → effect expired in event log. Damage a Courser Ryude to 50 Durability; advance +1 day → Durability is 51.

**Phase 7 verification:** Run a full 3-combatant fight (1 PC vs 2 Tusktooths) end-to-end. Verify: IN order respected, attack with Critical Hit multiplied damage correctly, Heavy-damage WIL Roll triggered, undo rewinds the latest segment without corrupting state, redo replays identically. Manual dice input substituted on one PC attack — outcome unchanged from auto.

**Phase 8 verification:** GitHub release builds artifacts for all three OSes; updater fetches a test release; print preview of character sheet renders without UI chrome.

**Cross-cutting:** [.scripts/validate_yaml.py](.scripts/validate_yaml.py) added to CI; runs against `docs/data/` AND user vault data on a sample-vault test.
