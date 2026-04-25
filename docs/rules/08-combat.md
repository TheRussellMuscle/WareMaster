# 08 — Combat

> Source: Wares Blade Playkit, Chapter 4 (pp. 30–33)

## Time units

Combat is divided into **Segments (S)**, each ~2 seconds. (See [Chapter 15](./15-units-and-glossary.md) for Round/Turn definitions.)

## Segment loop

Each Segment runs:

### 1) Roll for Initiative and Defense (the **IN/DN Roll**)

Each character rolls 1D10 + Base IN to set their **IN value** for the Segment, and the same roll's D10 + Base DN sets their **DN value** — same Roll, two derived values. LUC may be spent for additional dice.

WM does the same for NPCs.

#### Perfect Success / Total Failure on an IN/DN Roll

- **Perfect Success (all 10s):** `<Defense>` PP gained; **Total Absorption is doubled** for this Segment.
- **Total Failure (all 1s):** `<Defense>` PP gained (half of a Perfect Success, rounding up); **Total Absorption is halved** (rounding down).

> Note: neither Perfect Success nor Total Failure on an IN/DN Roll restores LUC.

### 2) Declare Actions

In ascending IN order (lowest declares first), each player tells the WM what their character will do. Players may discuss before declaring (WM permitting), but **once declared, an action cannot be changed.** WM picks NPC actions silently.

### 3) Take Actions

In descending IN order (highest acts first), each character resolves their declared action. After all characters (PCs and NPCs) have acted, the Segment ends and a new one begins.

Combat ends when all enemies or all PCs are slain, surrender, or flee.

## Making Attacks

Make a **BN Roll** = 1D10 + Base BN + weapon BN Modifier (+ `<Weapon>` Skill Level). LUC may add dice.

Compare BN total to target's DN:

- BN < DN → **miss**.
- BN ≥ DN → **hit**. Calculate damage.
- All dice = 1 → **Total Failure** (even if BN ≥ DN).
- Dice match or exceed weapon's **Critical Value** AND total ≥ DN → **Critical Hit**.
- All dice = 10 AND total ≥ DN → **Perfect Success**.

## Calculating damage

Roll the weapon's **Damage Value** dice.

```
Damage Dealt = Damage Value Roll − Target's Total Absorption (current Segment)
```

LUC may add D10s to the Damage Value Roll, up to the weapon's maximum possible Damage Value.

### On Critical Hit

```
Damage Dealt = (Damage Value Roll × (Number of BN Dice + 1)) − Target's Total Absorption
```

## Special attack outcomes

### Critical Hit

Damage multiplied by `(Number of BN Dice rolled + 1)`.

### Perfect Success on a BN Roll

Same effect as a Critical Hit, **plus** PP for the relevant `<Weapon>` Skill. Character does **not** regain LUC from this.

### Total Failure on a BN Roll

- Half the PP a Perfect Success would award.
- **Risk of weapon breaking** — normally limited to easily-broken weapons (rapiers, bows), but the WM can extend this to other types, especially if LUC was spent.
- The character's IN is **halved** in the next Segment.

## Unarmed attacks

- BN Modifier is **0** unless trying to merely touch the opponent (then +3).
- Damage Value is `[1D10 − 7]`. Reduced by Absorption unless the attack is aimed at the face or another unarmored location.
- On Total Failure, the **attacker** takes `[1D10 − 7]` damage instead — not reducible by Absorption. (Hand injury may also penalize future Action Rolls; WM may waive if too fiddly.)
