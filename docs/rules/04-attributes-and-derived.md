# 04 — Attributes and Derived Values

> Source: Wares Blade Playkit, Chapter 3 (pp. 14–15)

## The six Ability Scores

| Code | Name | Represents |
|---|---|---|
| **SEN** | Sense | Intuition and the five major senses. |
| **AGI** | Agility | Fine motor skills, manual dexterity. |
| **WIL** | Will | Mental / spiritual strength. Higher = harder to shock. |
| **CON** | Constitution | Innate body strength. Speeds healing and resists poison/disease. |
| **CHA** | Charm | Charisma; ability to attract attention. Higher persuades, but high values can also amplify dislike from those predisposed against you. |
| **LUC** | Luck | Good fortune. Higher = more luck, but doesn't necessarily come into play immediately. |

Each is rolled `[3D5]` (Chapter 3).

## Base Values

Every Ability except LUC has a **Base Value**:

```
Base Value = floor(Ability Score / 3)
```

Base Values are added to D10 rolls during Action Rolls.

## Derived combat values

```
Base IN  = Base SEN + Total Armor Modifier
Base BN  = Base AGI + Total Armor Modifier
Base DN  = Base AGI + <Defense> Skill Level + Total Armor Modifier
```

- **IN (Initiative Number)** — when a character acts in a Segment. Higher = sooner.
- **BN (Battle Number)** — how likely an attack is to hit.
- **DN (Defense Number)** — how hard the character is to hit.

Note: BN is further modified by chosen weapon and `<Weapon>` Skill (Chapter 8).

## Durabilities

```
Physical Durability = CON Ability Score
Mental Durability   = WIL Ability Score
```

These determine how much damage a character can absorb in each track before suffering penalties (see [Chapter 9](./09-damage-and-healing.md)).

## Available LUC

A character's **Available LUC** can be spent to improve dice rolls. Maximum Available LUC = LUC Ability Score. (Exceeded only via LUC Reserves — see [Chapter 10](./10-advancement.md).)
