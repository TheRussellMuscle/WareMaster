# 14 — Ryude (Mecha)

> Source: Wares Blade Playkit, Chapter 6 (pp. 62–73)

Full Ryude catalog: [`data/ryude-units.yaml`](../data/ryude-units.yaml). Ryude weapons/armor: [`data/ryude-equipment.yaml`](../data/ryude-equipment.yaml).

## Ryude Ability Scores (1–10)

Unlike characters, Ryude have only four:

| Code | Name | Meaning |
|---|---|---|
| **SPE** | Speed | How quickly the Ryude can move and react. |
| **POW** | Power | The Ryude's physical strength. |
| **ARM** | Armor | How well-armored. |
| **BAL** | Balance | How easily it keeps its balance when moving. |

## Other Ryude attributes

- **Movement Speed** — walking pace = 3 lis (12 km) per hour.
- **Dashing Speed** — `SPE / 2` liets in one Segment, sustainable for 5 Segments.
- **Jumping Power** — `POW × 6` liets vertically. Dash-jump: `POW × 50` liets long, `POW × 6` liets high.
- **Fall Endurance** — damage absorbed when falling; determined by Rank.
- **Unit Durability** — total damage before the Ryude is inoperable.
- **Ryude Rank** / **Persona Rank** — overall power, J (weakest) → A (strongest).

## Operating a Ryude

Requires `<Drive>` Skill ≥ Level 1. Higher Drive Skill benefits Action Rolls and IN/BN rolls.

```
Drive Modifier = Character's Drive Skill Level − Required Drive
```

- Negative → Attunement Checks and Operator Rolls suffer the penalty.
- Positive → they gain that bonus.

## Attunement Checks

When an operator first enters a Ryude, the Persona attempts to resist control. The more powerful the Persona, the stronger the resistance.

### Procedure

1. Find the **Attunement Value** for the Ryude's Persona Rank.
2. Roll `1D10 − Drive Modifier`. Roll ≤ Attunement Value → success.
   - Roll **1** → Perfect Success (regardless of Drive Modifier).
   - Roll **10** → Total Failure (regardless of Drive Modifier; no LUC, no PP).
3. Free control thereafter, OR roll `1D10` on **Attunement Penalty Table A** and apply.

### Attunement Penalty Table A

| Roll | Result |
|---|---|
| 10–7 | Base Drive permanently reduced by 1 |
| 6–4 | Ryude SPE permanently reduced by 1 |
| 3–2 | Ryude SPE and POW permanently reduced by 1 |
| 1 | Roll again on Table B |

### Attunement Penalty Table B

| Roll | Result |
|---|---|
| 10–7 | **Discomfort** — WIL Roll: success → Base Drive −1 perm; fail → operator's CON also −1 for the day. |
| 6–4 | **Ryude Lurgy** — mild dizziness. CON Roll: success → Base Drive −1 perm + operator −1 CON; fail → also `1D5` Physical damage. |
| 3–2 | **Mental Pressure** — WIL Roll: success → operator −1 CON, roll again on Table 1; fail → `1D10` Mental damage. |
| 1 | **Immobilized** — Ryude refuses to move. Operator takes `2D10` Mental damage. |

## Operator Rolls

Like Action Rolls but for the Ryude.

```
Base Drive Value = <Drive> Skill Level − Required Drive + Operator's Base AGI
```

Difficulty depends on what's being attempted. Modifiers (sample):

### Basic Actions

| Action | Mod |
|---|---|
| Base Difficulty | 2 |
| Standing | +1 |
| Sitting | +2 |
| Laying down | +3 |
| Getting up | +4 |
| Jumping straight up | +4 |
| Crouching | +3 |

### Movement

| Action | Mod |
|---|---|
| Base Difficulty | 3 |
| Running | +2 |
| Dashing | +4 |
| Emergency stop | +3 |
| Sharp turn | +3 |
| Sharp U-turn | +4 |
| Jumping | +5 |

### Light Work

| Action | Mod |
|---|---|
| Base Difficulty | 4 |
| Picking up objects | +3 to +5 |
| Carrying objects | +4 to +6 |
| Throwing objects | +6 to +10 |
| Holding objects | +3 to +5 |
| Using tools | +5 to +7 |

### Terrain modifiers

| Terrain | Mod |
|---|---|
| Level ground | 0 |
| Slope | +2 to +10 |
| Mud, sand, snow | +3 to +7 |
| Forests, caves | +3 to +9 |

## Operator Errors

If the Operator Roll is a 1 or all dice = 1, roll 1D10 on **Operator Error Table A**.

### Operator Error Table A — Normal Actions

| Roll | Result |
|---|---|
| 10–7 | Slip-up. Repeat the Operator Roll. |
| 6–4 | Drop or near-fall — minimal impact. |
| 3–2 | Serious or irreparable error. |
| 1 | Roll on Table B. |

### Operator Error Table B — Normal Actions

| Roll | Result |
|---|---|
| 10–7 | BAL Roll: fail → Ryude falls and takes `1D5` damage. |
| 6–4 | BAL Roll: fail → Ryude falls; `1D5` damage; occupants take `1D10` Physical. |
| 3–2 | Ryude falls, takes `1D10` damage; occupants take `1D10` Physical. |
| 1 | Falls; takes `3D5` damage; all occupants take `3D5` Physical. |

LUC cannot be spent on Operator Error Tables.

## Combat with a Ryude

```
Ryude Base IN  = Operator Base SEN + Ryude SPE + Drive Modifier + Attunement Penalty (if any)
Ryude Base DN  = Operator Base AGI + Ryude SPE + Drive Modifier + Attunement Penalty (if any)
Ryude Base BN  = Operator Base AGI + Ryude SPE + Drive Modifier + Attunement Penalty (if any) + Weapon BN Modifier + <Weapon> Skill Level
```

Then apply the IN/DN Roll / BN Roll as for human-scale combat.

If Ryude SPE is reduced (damage), reduce Base IN/DN/BN equivalently.

## Damage processing

When attacking human targets, all damage inflicted is **multiplied by 10**.

```
Damage Dealt = Damage Value Roll + POW Value − Target's ARM Value
```

### Damage Thresholds

1. **When total Durability lost crosses a multiple of 10** → roll `1D10` on **Standard Damage Penalty Table**.
2. **When final damage dealt by a single attack ≥ Ryude's ARM** → roll `1D10` on **Critical Damage Table A**.

### Standard Damage Penalty Table

| Roll | Result |
|---|---|
| 10–7 | ARM −1 |
| 6–4 | POW −1 |
| 3–2 | SPE −1 |
| 1 | Roll on Critical Damage Table A |

### Critical Damage Table A

| Roll | Result |
|---|---|
| 10–7 | ARM −`1D5`; operator takes `1D10` Physical |
| 6–4 | POW −`1D5`; operator takes `1D10` Physical |
| 3–2 | SPE −`1D5`; operator takes `1D10` Physical |
| 1 | Roll on Critical Damage Table B |

### Critical Damage Table B

| Roll | Result |
|---|---|
| 10–7 | **Power Failure** — roll `1D10`: 10→Neck disabled; 9–6→Left Arm; 5–2→Right Arm; 1→Leg |
| 6–4 | **Vessel Rupture** — roll on Damage Location Table |
| 3–2 | **Coolant Leak** |
| 1 | **Persona Destroyed** |

### Damage Location Table

| Roll | Location |
|---|---|
| 10–9 | Left Arm (Non-Dominant) |
| 8–7 | Right Arm (Dominant) |
| 6–5 | Left Leg |
| 4–3 | Right Leg |
| 2 | Neck |
| 1 | Torso |

LUC cannot be spent on these tables unless stated.

### Critical Damage Effects

- **Neck Disabled** — Ryude SPE −`2D5` until repaired. Headless models: operator takes `3D10` Physical instead.
- **Arm Disabled** — Ryude BAL −`1D5` until repaired. Held weapon/shield unusable. One-handed weapon may be switched but operator's Base AGI is halved for DN/BN.
- **Leg Disabled** — Ryude BAL and SPE each −`1D5` until repaired. BAL Roll Difficulty = damage inflicted (pre-ARM); fail → Ryude falls.
- **Coolant Leak** — after `1D10` Segments, intense steam vents — Ryude immobilizes.
- **Vessel Rupture** — `1D5` Durability lost per Segment, +1 each subsequent Vessel Rupture. Operator can manually staunch by closing off blood-flow to the affected tube cluster (any non-torso part), stopping Durability loss but disabling that part.
- **Persona Destroyed** — most devastating; Ryude is lost.

## Immobilization

When Unit Durability or any of the four Ability Scores reaches 0 → Ryude is **Immobilized**. Not technically destroyed but cannot move until repaired. Operator may exit (1 Segment) and continue on foot.

## Special Ryude abilities

- **Numetic Modifier** — operator can add this to their Numetic Force Level.
- **Binding Modifier** — operator's `<Word-Casting>` Skill Level is increased by this when inside; can also add when defending against a Technique.
- **Ego** — Ryude may help/hinder the operator (covered in core book).
- **Ryude-Mind Durability** — Word-Caster Ryude have separate mental energy reserves. Mental damage from Techniques used inside is subtracted from the unit's Ryude-Mind Durability. If Ryude-Mind Durability ever reaches 0, the Persona is destroyed.

Coursers:
- Self-repair: 1 Durability per day (won't work at 0).
- Operators are immune to Word-Casting Techniques of Level 3 or lower while inside, unless the technique creates physical objects/projectiles.

## Repair

Self-repair handles small amounts; bigger breakdowns and Ability damage need Artificers' Guild trained craftsmen (rare in small settlements).

| Type | Time | Cost |
|---|---|---|
| Durability damage | 1 to 8 etches per point | 10 to 80 golda per point |
| Ability damage | 1 to 8 days per point | 100 to 800 golda per point |

Success isn't guaranteed — sometimes parts must be tracked down.
