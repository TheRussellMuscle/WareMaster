# Changelog

All notable changes to WareMaster are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and this project adheres to [Semantic Versioning](https://semver.org/).

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

[0.3.0-alpha.1]: https://github.com/TheRussellMuscle/WareMaster/releases/tag/v0.3.0-alpha.1
