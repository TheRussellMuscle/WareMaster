# 11 — Word-Casting

> Source: Wares Blade Playkit, Chapter 5 (pp. 37–48)

Full per-Gate technique catalog: [`data/techniques/word-casting-*.yaml`](../data/techniques/).

## Concept

Word-Casting is a discipline that, through the use of **Wares-Stones**, gives shape to supernatural power. The Word-Caster performs complicated gestures and chants certain words to manipulate these energies.

## Gates

Students of Word-Casting belong to a **Gate** (school) based on a single element. There are 8:

- **Luminous Gates** — Sun, Metal, Fire, Wood
- **Umbral Gates** — Moon, Wind, Water, Earth

Luminous and Umbral Gates oppose each other in pairs:

| Luminous | ↔ | Umbral |
|---|---|---|
| Sun | ↔ | Moon |
| Metal | ↔ | Wind |
| Fire | ↔ | Water |
| Wood | ↔ | Earth |

Some techniques aren't tied to a Gate — these are called **Gateless**. Every Word-Caster begins with at least one Gateless Technique mastered: **Farspeak (ROGG)**.

## Performing a Technique

To use a Word-Casting Technique, a Word-Caster must have at least one Wares-Stone in hand:

1. **Choose a technique.** Once past this step, the choice cannot be changed.
2. **Make a Binding Roll** against a Difficulty equal to the Technique's Level. Mental damage is suffered for `Segments Required`.
3. **If the Binding Roll succeeds, the technique is activated.** On an IN/DN Roll of 9+, the technique can be used that same Segment; otherwise next Segment on the user's turn.

```
Base Binding Value = Base AGI + Total Armor Modifier + <Word-Casting> Skill Level
```

If `Base Binding Value + 1D10 ≥ Technique Level`, the binding succeeds.

The Binding Roll must be performed for `Segments Required` consecutive Segments. **A Perfect Success** auto-succeeds the next Segment as well; if LUC was spent on the Perfect Success, this auto-success extends for a number of Segments equal to LUC spent. Number of Segments and Mental damage required do not change either way.

## Mental damage from Word-Casting

Per Segment, while binding:

| Gate type | Mental damage per Segment |
|---|---|
| Chosen Gate or Gateless | `<Word-Casting> Level` |
| Other (non-Opposite) Gate | `<Word-Casting> Level × 2` |
| Opposite Gate | `<Word-Casting> Level × 3` |

If using a Technique would push the caster into Heavy Damage, that Technique cannot be used.

## Technique Explosion

If a Binding Roll ends in a Total Failure (or fails just before completing), the built-up energies may **explode**. Effect varies — typically the target changes, or a different place is affected. The nature of the effect itself doesn't change. WM decides specifics.

## Avoiding Word-Casting Techniques

Some Techniques can be avoided with a specific Action Roll. Roll type and Difficulty are noted in the Technique's `Save` field.

Example: the distracting effect of **Lightwipe** is rendered ineffective by a successful Difficulty 9 LUC Roll.

## Technique data structure

Each Technique has:

| Field | Meaning |
|---|---|
| **Segments Required** | Consecutive Segments of binding needed. |
| **Requisites** | Catalysts, conditions, or required exposure. |
| **Effect** | One-line summary. |
| **Range / Target** | Distance and what it can affect. `0` means self / touch. |
| **Duration** | Effect length once activated. |
| **Save** | Type and Difficulty of Action Roll the target may use to negate (`-` = no save). |
| **Description** | Full text. |
