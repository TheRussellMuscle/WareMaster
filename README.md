# WareMaster

A free, open-source, cross-platform desktop companion for the Japanese TTRPG **Wares Blade**.

WareMaster tracks campaigns, characters, NPCs, monsters, Ryude, combat, and downtime healing so the Wares Maker can focus on the story instead of bookkeeping.

[![Support on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/brendanrussell)

## Status

**Phase 4 + 5 alpha — `v0.6.0-alpha.1`.** Early testers welcome.

What's working today:

- Parchment-themed shell with native Wares Blade unit tooltips (etch, liet, gro, golda, …).
- **Project-explorer sidebar** — campaigns expand inline to a per-campaign search box and the character list nested underneath; expansion + search persist across reloads.
- Full reference browser over the 21 bundled YAML data files: classes, skills, weapons, armor, beastiary, Ryude, techniques, tables.
- Vault on disk at `~/Documents/WareMaster/` — plaintext YAML / Markdown, git-friendly, hand-editable.
- Campaign creation, management, and character browsing with search / sort / filters / status badges.
- Character creation wizard following the 8 rule-aligned steps from the Playkit (class pick, ability rolls, skill packages, equipment packages, Word-Caster gate / Spiritualist order / Tradesfolk profession when applicable, biography).
- **Live character sheet with sheet-level rolling**:
  - "This Segment" panel under Derived stats with `Set IN/DN`, automatic Total Absorption ×2 / ÷2 on Perfect / Total Failure.
  - Per-weapon `Attack` buttons (BN, crit detection, damage minus current-session absorption, Total Failure flags next-Segment IN halving).
  - Per-technique `Cast` buttons for Word-Casting, Numetic Arts, and Invocations, with optional Mental damage cost.
  - Per-skill `Roll` buttons for every catalog skill — including untrained ones at Lv 0 with the half-PP rule applied automatically.
  - Per-ability roll buttons in the stat block (LUC opens a LUC Roll).
  - `Save` button on the damage track header when in Heavy.
  - LUC dice spend automatically (clamped to Available LUC) and restore on Perfect Success of non-combat skills.
  - Rule explainers in every dialog quoting the relevant Playkit chapter.
  - **First Impression roll** (CHA-governed) and **class benefit roll buttons** (Sermon, Public Performance, Component Analysis, Price Loot).
- **Campaign-wide action log** in a sticky right column — every roll across every character in the campaign, with character links per row. Also visible on NPC / Monster / Ryude detail pages.
- **Auto-updates** on launch — signed with an ed25519 key.
- **Templates + named instances + portraits** (Phase 4) — spawn named monsters, NPCs, and Ryude into a campaign from bundled or user-authored templates. Three-tier resolution chain (campaign overrides → vault → bundled), per-instance overrides + state, Ryude operator assignment, custom or bundled-default portraits. Real artwork for all 5 bundled monsters and all 3 bundled Ryude; clickable portraits open a full-size lightbox.
- **Active effects solver** — 15 canonical effect kinds, preset picker, live IN/BN/DN modifier annotations in the stat block.
- **Global custom items** — vault-wide custom weapons and armor with full stat fields; auto-migrates legacy per-character items on first load.

Phase-by-phase implementation roadmap lives in [PLAN.md](./PLAN.md). Next up: time + recovery (Phase 6), full multi-combatant tracker with undo/rewind (Phase 7).

## Download

Grab the latest release from the [GitHub Releases page](https://github.com/TheRussellMuscle/WareMaster/releases). Builds are produced for Windows, macOS, and Linux on every tagged release.

**Alpha builds are unsigned.** That's deliberate for the alpha tester program — OS code signing is a later cycle. To get past the OS warnings the first time:

- **Windows** — When SmartScreen warns, click "More info → Run anyway".
- **macOS** — Right-click the `.app` → Open. Or open System Settings → Privacy & Security → "Open Anyway" after the first attempt.
- **Linux** — Download the `.AppImage`, `chmod +x` it, run.

After the first install, you don't need to repeat any of this — the app updates itself.

## Auto-updates

On launch, WareMaster checks GitHub for a new release and shows a parchment-styled prompt before installing. Updates are integrity-signed with an ed25519 key — only releases built by the project's CI will be accepted.

If you'd rather not update right now, click **Later**; you'll be asked again on the next launch.

## Documentation

Start at [docs/README.md](./docs/README.md) for the full table of contents.

- [`docs/rules/`](./docs/rules/) — narrative game rules (Markdown, 15 chapters).
- [`docs/data/`](./docs/data/) — structured game data (YAML, 21 files). These are bundled into the app and used as the canonical reference for everything WareMaster does.

## Development

```bash
pnpm install
pnpm tauri:dev      # run the desktop app in dev mode
pnpm tauri:build    # produce a release installer
pnpm test           # run the engine unit tests
pnpm typecheck      # tsc --noEmit
```

Stack decisions are recorded in [STACK.md](./STACK.md): Tauri 2 · React 19 + TypeScript · Vite · shadcn/ui · Tailwind v4 · Zustand · TanStack Router · Zod · YAML/Markdown via Tauri fs plugin.

## Support development

WareMaster is a free side project, built in evenings and weekends because the bookkeeping for Wares Blade really does deserve a tool. If it's saved you time at the table and you'd like to help keep it going, the Ko-fi link is the most direct way:

[![Support on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/brendanrussell)

No pressure — issues, bug reports, and PRs are equally welcome.

## License

MIT — see [LICENSE](./LICENSE).

## Source acknowledgement

Game content is paraphrased from the **Wares Blade Playkit** sample (82 pages). This is a community tool; it is not affiliated with the official publisher or translation team. See [`docs/SOURCE.md`](./docs/SOURCE.md).
