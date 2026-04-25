# 05 — Skills

> Source: Wares Blade Playkit, Chapter 3 (p. 16)

Skills are practiced abilities, distinct from innate Ability Scores. Each Skill has a **Level** from 1 (beginner) to 12 (master) and beyond, and is governed by a specific Ability. Full structured catalog: [`data/skills.yaml`](../data/skills.yaml).

## Skill categories

### Combat Skills

| Skill | Attribute | Notes |
|---|---|---|
| **`<Weapon>`*** | AGI | One Skill per weapon category (longsword, mace, etc.). |
| **`<Defense>`** | AGI | Block or evade incoming attacks. Adds to Base DN. |

### Adventure Skills — Physical

| Skill | Attribute | Notes |
|---|---|---|
| **Athletics** | AGI | Challenging physical movement. |
| **Escape** | AGI | Get away from pursuers. |
| **Riding** | AGI | Horses and other beasts of burden. |
| **Finesse** | AGI | Manual dexterity / use of hands. |
| **Physical Resistance** | CON | +1 Light Physical damage tolerance per Level. |

### Adventure Skills — Mental

| Skill | Attribute | Notes |
|---|---|---|
| **Mental Resistance** | WIL | +1 Light Mental damage tolerance per Level. |
| **Search** | SEN | Find hidden things. |
| **Negotiation** | CHA | Mutually beneficial deals. |
| **Medicine** | SEN | Diagnose and treat injury / sickness. |
| **Astronomy** | SEN | Specialized knowledge. |
| **Botany** | SEN | Specialized knowledge. |
| **Zoology** | SEN | Specialized knowledge. |
| **Geology** | SEN | Specialized knowledge. |
| **Language** | SEN | Specialized knowledge. |
| **Meteorology** | SEN | Specialized knowledge. |
| **Mineralogy** | SEN | Specialized knowledge. |
| **Pharmacology** | SEN | Specialized knowledge. |

### Specialized Skills (no governing Ability)

| Skill | Notes |
|---|---|
| **`<Drive>`** | Operate a Ryude to your will (see [Chapter 14](./14-ryude.md)). |
| **`<Word-Casting>`** | A Word-Caster's mastery of their Gate. |
| **`<Numenism>`** | Ability to draw out divine power. |
| **`<Invocation>`** | Ability to draw on surrounding spirits. |
| **`<Music>` / `<Oratory>`** | Public performance Skills used by Tradesfolk (Music = AGI, Oratory = SEN). |

## Skill growth

Unlike Ability Scores, Skills grow with use. Characters gain **Proficiency Points** (PP) over time and can spend them between sessions to raise Skill Levels — see [Chapter 10](./10-advancement.md).

## Resistance Skills detail

- **Physical Resistance** — every Level adds 1 to the amount of **Light Physical** damage you can absorb.
- **Mental Resistance** — every Level adds 1 to the amount of **Light Mental** damage you can absorb.

(Chapter 9 explains how Light vs Heavy damage thresholds work.)
