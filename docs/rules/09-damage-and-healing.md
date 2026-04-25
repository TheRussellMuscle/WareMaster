# 09 — Damage and Healing

> Source: Wares Blade Playkit, Chapter 4 (pp. 32–34)

This chapter is the heart of the **downtime model** — the natural healing rates the future app must drive. Highly relevant.

## Two damage tracks

Damage is split into two parallel tracks:

| Track | Subtracted from | Sources |
|---|---|---|
| **Physical** | Physical Durability (= CON) | Weapon hits, falling, environment, etc. |
| **Mental** | Mental Durability (= WIL) | Sudden shock, life-drain, using Word-Casting / Numetic Arts, mishandling Ryude, etc. |

## Three damage stages

As accumulated damage in either track grows, the character moves through three stages **per track**:

1. **Light Damage** — accumulated damage ≤ Durability. **No immediate penalty.**
2. **Heavy Damage** — accumulated damage > Durability (even by 1).
3. **Incapacitated** — accumulated damage > 2× Durability.

Beyond `3× Durability` of accumulated damage, the character **dies (Physical) or goes insane (Mental)** and is removed from play.

### Heavy Damage rules

When a character first crosses from Light → Heavy, they immediately make a **WIL Roll** with Difficulty = the amount of damage taken; failing → Incapacitated.

If the damage was Physical, the WM **also** makes a CON Roll using Base CON with the same Difficulty. Failing → Incapacitated even if WIL Roll passed.

While in Heavy Damage, taking any Action Roll requires a **WIL Roll first**, Difficulty = `accumulated damage − Durability`. Failure = lost action.

### Incapacitated

Character is unresponsive and cannot act. If triggered by Physical damage, the character automatically suffers **1 Physical damage at the start of each subsequent Turn until treated**.

## Recovery (the downtime model)

### Light Damage

- **1 Physical damage per day**
- **1 Mental damage per hour**

### Heavy Damage

- **Physical: 1 point every `[16 − CON Score]` days**
- **Mental: 1 point every `[16 − CON Score]` hours**

> Once **all Heavy Damage** of a track is recovered, **remaining Light Damage** in that track heals at the normal Light rate.

### Incapacitation

- **Mental Incapacitation** heals naturally at the same pace as Heavy Mental damage.
- **Physical Incapacitation does NOT recover naturally** — the character must be treated by another individual.

## Treatment by another character (Medicine Skill)

A character with the `<Medicine>` Skill may attempt to help.

### For Light Damage

Make an AGI Roll, Difficulty = accumulated damage, adding `<Medicine>` Skill Level. Recover points equal to the amount the Difficulty was *exceeded* by — **max 5** (or **10** on Perfect Success). **Total Failure** inflicts `1D5` damage instead.

### For Heavy Damage

If proper tools and space are available, the number of days needed to recover 1 Heavy Physical point is **reduced by `<Medicine>` Skill Level**.

### Reviving an Incapacitated character

A character with `<Medicine>` makes an AGI Roll with Difficulty = accumulated damage. Requires an appropriate location and proper equipment.

## Quick reference (CON-driven recovery rates)

For CON 10 (typical):
- Light Physical: 1/day, Light Mental: 1/hour
- Heavy Physical: 1 per 6 days; Heavy Mental: 1 per 6 hours

For CON 13 (very tough):
- Heavy Physical: 1 per 3 days; Heavy Mental: 1 per 3 hours

For CON 8 (frail):
- Heavy Physical: 1 per 8 days; Heavy Mental: 1 per 8 hours
