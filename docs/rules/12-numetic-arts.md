# 12 — Numetic Force and Arts

> Source: Wares Blade Playkit, Chapter 5 (pp. 49–53)

Full Numetic Arts catalog: [`data/techniques/numetic-arts.yaml`](../data/techniques/numetic-arts.yaml).

Two Spiritualist (Monk) techniques. Both use a Numenism-based Accumulation mechanic.

## Numetic Force

Channels the user's life energy into fist or weapon, increasing damage. Power scales with `<Numenism>` Skill Level.

### Procedure

1. **Declare the Numetic Force Level** (≤ `<Numenism>` Skill Level). Cannot be changed after.
2. **Accumulation Roll** at Difficulty = Numetic Force Level. Mental damage is taken for the Segment regardless of outcome. Repeat for `Numetic Force Level` Segments. Each success → +1 Accumulation Level. A failure ends the attempt and resets Accumulation to 0.
3. **Activate.** On IN/DN Roll ≥ 9 the Technique can be used that Segment; otherwise next Segment on the user's turn. Accumulated energy may be held for max 1 Turn.

### Numetic Force benefits

- Weapon damage **+ Numetic Force Level**.
- Weapon Critical Value **− Numetic Force Level**.
- Can damage creatures/objects normally unharmable by mundane weapons.

### Unarmed Numetic Force (additional)

- Unarmed (fist) damage = Numetic Force Level **+3**.
- Next Segment, Accumulation time is **halved** (rounding up, min 1 Segment).
- Unarmed attack with Numetic Force deals `[1D10 − 7]` damage with Critical Value 10.

### Numetic Guard

If hit while Numetic Energy is accumulated, the energy is released regardless. Effects:

- Damage taken is reduced by `Accumulation Level`.
- If the opponent's attack is a Perfect Success, the **damage multiplier is reduced by 1** (e.g. a 3× becomes 2×). Damage cannot drop below 1× normal.

If the **defender's Accumulation Level is ≥ 4 higher than the attacker's**, the attacker is thrown back:

```
Distance (in liets, rounded down) = (Defender Accumulation − Attacker Accumulation) / 4
```

If hard ground or obstacle is hit:

```
Damage = [Distance thrown − Distance traveled] D10  (not reducible by armor)
```

## Numetic Arts

The Numetic Arts channel the user's life energies into another target. Each Technique has a Level — a Monk can use any technique at or below their `<Numenism>` Level. Most can be used at higher Levels for magnified effect.

### Procedure

1. **Choose technique and level** (≥ default). Cannot be changed after.
2. **Accumulation Roll** as Numetic Force above. Time required is in the technique's description. Hold for max 1 Turn.
3. **Activate** as above.

```
Accumulation Value = Base WIL + <Mental Resistance> Skill Level
```

`Accumulation Value + 1D10 ≥ Technique Level` succeeds.

A Perfect Success auto-succeeds the next Segment; LUC spent extends auto-success by the same number of Segments. If the Roll ends in Total Failure, the attempt simply ends with no risk of explosion.

### Higher-Level Techniques

Using a technique above its default Level uses **the higher-Level's Difficulty and Mental damage**. Segments required don't change.

### Mental damage from Accumulation

```
Mental Damage per Segment = (Technique Level × 2) − <Numenism> Skill Level
```

Cap of 3 Mental damage per Segment. Any technique that would inflict 4+ Mental damage per Segment is **unavailable** to the Monk. Also unavailable if it would push the user into Heavy Damage.

### Damage from Accumulation/Prayer

If the user takes damage during Accumulation/Prayer, they must make a WIL Roll with Difficulty = damage taken (Difficulty 1 if all absorbed). Failure → attempt fails immediately.
