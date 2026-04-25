# 03 — Character Creation

> Source: Wares Blade Playkit, Chapter 3 (pp. 12–25)

A simplified, 8-step process. Class data is also stored in [`data/classes.yaml`](../data/classes.yaml).

## The 8 steps

1. **Generate Ability Scores** — Roll `[3D5]` six times in order: SEN, AGI, WIL, CON, CHA, LUC. Re-roll all six if **three or more scores are < 8** OR **any score is > 13**.
2. **Choose a Class** — Warrior, Word-Caster, Spiritualist, or Tradesfolk.
3. **Choose a Skill Package** — Each Class lists Skill Packages. Pick the one that fits your concept.
4. **Generate Starting Money** — `[3D5] × 10` golda, plus any bonus from your Skill Package.
5. **Choose an Equipment Package** — Every Class except Tradesfolk has recommended packages.
6. **Spend Additional Golda** — Leftover golda buys more items, or is saved.
7. **Acquire Techniques** — Word-Casters and Spiritualists begin with all the Techniques listed for their chosen Gate or discipline ([Chapter 11](./11-word-casting.md), [12](./12-numetic-arts.md), [13](./13-invocations.md)).
8. **Finalize Details** — Name, age, background, etc.

## Classes overview

Every character belongs to one of four classes.

### Warrior

Specializes in armed combat; most likely to be a Ryude-Master.

**Class Perk:** Damage ±1 — deal +1 damage and take −1 damage.

**Skill Packages** (page 21–22): All-Rounder, Battler.
**Equipment Packages**: A (longsword, dagger, lamellar armor, open helmet, heater shield — 125 g), B (greatsword, breastplate, full helmet — 180 g).

### Word-Caster

Wields the sacred energies of Wares-Stones across one of 8 Gates.

**Class Perks:**
- *Wares Knowledge* — can read, write, and speak the Holy Writ.
- *Wisdom* — +1 bonus on Knowledge Rolls.
- *Wares-Stone* — start with one.

**Skill Packages**: Adept, War-Caster, Shadow-Caster (each comes with a Gate-specific Word-Casting Skill at Level 2 plus a paired knowledge Skill — see p. 22).
**Equipment Packages**: A (short sword, hardened leathers, open helmet — 70 g), B (dagger, leather vest — 30 g).

### Spiritualist

Member of a religious order. Two flavors:

- **Monk** — trains mind and body; uses Numetic Force / Arts; can heal others by touch.
- **Invoker** — channels divine power found in nature.

**Class Perks:**
- *Allies in Faith* — +1 to First Impression Rolls vs same order, −1 vs all others.
- *Sermon* — make a LUC Roll Difficulty `[16 - CHA]` to impress a number of people equal to the amount rolled over the Difficulty +1.

**Skill Packages**: Monk-Votarist, Monk-Militant, Invoker-Evangelist, Invoker-Denouncer (p. 23).
**Equipment Packages**: A (longsword, lamellar armor, open helmet — 90 g), B (hardened leathers, open helmet — 55 g).

### Tradesfolk

A wide variety of professions. Class Perks are profession-specific. Sample professions in the Playkit:

- **Thief** — *Price Loot* (assess stolen-goods value via Knowledge Roll); thief's toolkit.
- **Bard** — *Public Performance* (earn money with a CHA Roll in a tavern/square).
- **Alchemist** — *Wares-Dabbler* (read/write Sacred Writ with a SEN Roll); *Component Analysis* (identify ingredients via SEN Roll + Word-Casting Skill); replicate a known sample in `[(Difficulty − Word-Casting Level) × 1D5]` days, plus an AGI Roll to compound.
- **Doctor** — *Consultation* (charge `Medicine × 10` golda); doctor's bag with bandages, invigorators, healing salve, neutralizers.

Skill Packages: Thief, Bard, Alchemist (p. 24–25). No standard equipment package — buy as appropriate.

## Word-Caster Gates

Before choosing a Skill Package, a Word-Caster picks a **Gate** (school). All Word-Caster Skill Packages then add Word-Casting (your Gate) at Level 2 plus a paired knowledge Skill at Level 2:

| Gate | Paired Knowledge Skill |
|---|---|
| Sun | Astronomy |
| Metal | Geology |
| Fire | Pharmacology |
| Wood | Mineralogy |
| Moon | Language |
| Wind | Meteorology |
| Water | Botany |
| Earth | Zoology |

The Luminous Gates (Sun, Metal, Fire, Wood) oppose the Umbral Gates (Moon, Winds, Water, Earth) in pairs: Sun↔Moon, Metal↔Wind, Fire↔Water, Wood↔Earth.
