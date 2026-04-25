# WareMaster Documentation

This is the working reference for the **Wares Blade** TTRPG, organized so the future app and any future contributor can navigate without reopening the PDF.

Two parallel layers:

- **[`rules/`](./rules/)** — narrative game rules as Markdown. Read top-to-bottom for a full grasp of the system.
- **[`data/`](./data/)** — structured game data as YAML. The future app reads these files directly.

See [`SOURCE.md`](./SOURCE.md) for the source of all content.

---

## Rules (read in order)

| # | File | Covers |
|---|---|---|
| 01 | [introduction.md](./rules/01-introduction.md) | What Wares Blade is, how a session flows, core game terms |
| 02 | [world-of-ahan.md](./rules/02-world-of-ahan.md) | Setting, geography, inhabitants, religions, world glossary |
| 03 | [character-creation.md](./rules/03-character-creation.md) | The 8-step process, classes, skill packages, equipment packages |
| 04 | [attributes-and-derived.md](./rules/04-attributes-and-derived.md) | Six abilities, Base values, IN/BN/DN, Durabilities, LUC |
| 05 | [skills.md](./rules/05-skills.md) | Combat / Adventure / Specialized skill catalog |
| 06 | [equipment.md](./rules/06-equipment.md) | Weapons, armor, general goods, money |
| 07 | [action-rolls.md](./rules/07-action-rolls.md) | Roll mechanics, Difficulty, Perfect Success / Total Failure, LUC use |
| 08 | [combat.md](./rules/08-combat.md) | Segments, IN/DN/BN rolls, attacks, damage calc, special outcomes |
| 09 | [damage-and-healing.md](./rules/09-damage-and-healing.md) | Light/Heavy/Incapacitated stages, recovery rates, treatment — **the downtime model** |
| 10 | [advancement.md](./rules/10-advancement.md) | Proficiency Points, Completion Bonus, LUC reserves |
| 11 | [word-casting.md](./rules/11-word-casting.md) | Gates, Binding Rolls, Mental damage, technique structure |
| 12 | [numetic-arts.md](./rules/12-numetic-arts.md) | Numetic Force vs Arts, Accumulation, Monk techniques |
| 13 | [invocations.md](./rules/13-invocations.md) | Prayer Rolls, Invoker techniques |
| 14 | [ryude.md](./rules/14-ryude.md) | Mecha operation, Attunement, combat, damage tables, repair |
| 15 | [units-and-glossary.md](./rules/15-units-and-glossary.md) | Etch / Liet / Garom / Golda, Segment / Round / Turn, key terms |

---

## Data (consumed by the app)

### Top-level

| File | Contents |
|---|---|
| [classes.yaml](./data/classes.yaml) | The 4 classes, perks, skill packages, equipment packages |
| [skills.yaml](./data/skills.yaml) | Every named skill with its governing attribute and category |
| [weapons.yaml](./data/weapons.yaml) | Weapons table + ammunition |
| [armor.yaml](./data/armor.yaml) | Body / Head / Shield armor |
| [general-goods.yaml](./data/general-goods.yaml) | Adventuring equipment + prices |
| [ryude-units.yaml](./data/ryude-units.yaml) | Sample Ryude (Az-Cude, Maltu-Ragorsu, Gisah Sharukann) |
| [ryude-equipment.yaml](./data/ryude-equipment.yaml) | Ryude weapons + armor |
| [beastiary.yaml](./data/beastiary.yaml) | Starter beastiary (5 monsters) |
| [tables.yaml](./data/tables.yaml) | Difficulty examples, Proficiency Gains, Critical/Penalty tables |

### Techniques (one file per discipline / Gate)

| File | Discipline |
|---|---|
| [techniques/word-casting-gateless.yaml](./data/techniques/word-casting-gateless.yaml) | Gateless Word-Casting |
| [techniques/word-casting-sun.yaml](./data/techniques/word-casting-sun.yaml) | Gate of the Sun |
| [techniques/word-casting-metal.yaml](./data/techniques/word-casting-metal.yaml) | Gate of Metal |
| [techniques/word-casting-fire.yaml](./data/techniques/word-casting-fire.yaml) | Gate of Fire |
| [techniques/word-casting-wood.yaml](./data/techniques/word-casting-wood.yaml) | Gate of Wood |
| [techniques/word-casting-moon.yaml](./data/techniques/word-casting-moon.yaml) | Gate of the Moon |
| [techniques/word-casting-wind.yaml](./data/techniques/word-casting-wind.yaml) | Gate of Wind |
| [techniques/word-casting-water.yaml](./data/techniques/word-casting-water.yaml) | Gate of Water |
| [techniques/word-casting-earth.yaml](./data/techniques/word-casting-earth.yaml) | Gate of Earth |
| [techniques/numetic-arts.yaml](./data/techniques/numetic-arts.yaml) | Numetic Arts (Monk Deeds) |
| [techniques/invocations.yaml](./data/techniques/invocations.yaml) | Invocations (Invoker Fingers + Palms) |

---

## Conventions

- All numeric stats are stored as numbers (not strings) so the app can compute with them directly.
- Every record has a `source` field referencing the PDF page (e.g. `"Playkit p.18"`).
- Every record has a stable `id` in `kebab-case` for cross-referencing.
- Romanizations of technique names (e.g. `LAH-KU` for Lesser Sunorb) are preserved as `romanization` fields.
