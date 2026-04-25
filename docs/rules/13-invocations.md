# 13 — Invocations

> Source: Wares Blade Playkit, Chapter 5 (pp. 54–60)

Full Invocation catalog: [`data/techniques/invocations.yaml`](../data/techniques/invocations.yaml).

The Invoker's discipline. Nearly identical to Numenism, but with a critical limitation: techniques **can only be used at their default Level**.

## Procedure

1. **Select a technique.** Cannot be changed after.
2. **Prayer Roll** at Difficulty = Technique Level. Required Mental damage is taken regardless of outcome.
3. **Activate** on IN/DN ≥ 9 same Segment; otherwise next.

```
Prayer Value = Base WIL + <Mental Resistance> Skill Level
```

`Prayer Value + 1D10 ≥ Technique Level` succeeds.

The Prayer Roll must be performed for `Segments Required` Segments. A Perfect Success auto-succeeds the next Segment; LUC spent extends auto-success.

## Mental damage from Prayer

```
Mental Damage per Segment = (Technique Level × 2) − <Invocation> Skill Level
```

The Invoker cannot suffer **more than 3** Mental damage per Segment — any technique inflicting 4+ is unavailable. Also unavailable if it would push the user into Heavy Damage.

## Total Failure on a Prayer Roll

Unlike Word-Casting, no risk of explosion — but the Invoker risks losing Skill temporarily.

On a Total Failure, roll 1D10:
- **1–3:** `<Invocation>` Skill Level drops `1D5` Levels for 1 day. If this drops the Level to 0 or lower, **they cannot use Invoking until restored**.

## Damage during Prayer

If hit during Prayer, the Invoker must make a WIL Roll with Difficulty = damage taken (Difficulty 1 if absorbed). Failure → attempt fails immediately.

## Avoiding Invocations

Like Word-Casting, some techniques have a `Save` field. Example: **Binding Palm** paralyzes for a few Segments, but a successful Difficulty 9 WIL Roll completely ignores the effect.

## Reroll on near-mastery

If `<Invocation>` Skill Level is **at least 2× the Technique Level**, the Invoker may reroll a Total Failure. The reroll succeeds on any result except 1.
