import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { AcronymTooltip } from '@/components/parchment/AcronymTooltip';
import type { WeaponLine } from '@/engine/derive/weapon-lines';

interface WeaponsTableProps {
  lines: WeaponLine[];
}

/**
 * Available Weapons table, mirroring Playkit p. 79. Each row shows a
 * weapon's melee / charge / ranged BN totals, damage values, and crit value.
 */
export function WeaponsTable({ lines }: WeaponsTableProps): React.JSX.Element {
  if (lines.length === 0) {
    return (
      <ParchmentCard>
        <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
          Available Weapons
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)]">No weapons equipped.</p>
      </ParchmentCard>
    );
  }
  return (
    <ParchmentCard>
      <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
        Available Weapons
      </h2>
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            <th className="py-1">Weapon / Skill</th>
            <th>
              Melee <AcronymTooltip code="BN" />
            </th>
            <th>Charge</th>
            <th>Ranged</th>
            <th>Damage</th>
            <th>Crit</th>
          </tr>
        </thead>
        <tbody className="text-[var(--color-ink)]">
          {lines.map((l) => (
            <tr
              key={l.weapon_id}
              className="border-t border-[var(--color-parchment-300)]/60"
            >
              <td className="py-1">
                <div className="font-display text-sm">{l.name}</div>
                <div className="text-[10px] text-[var(--color-ink-faint)]">
                  Skill Lv {l.weaponSkillLevel}
                </div>
              </td>
              <td>{fmt(l.meleeBN)}</td>
              <td>{fmt(l.chargeBN)}</td>
              <td>{fmt(l.rangedBN)}</td>
              <td>{l.damageMelee ?? l.damageRanged ?? '—'}</td>
              <td>{l.criticalValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ParchmentCard>
  );
}

function fmt(n: number | null): string {
  if (n == null) return '—';
  if (n > 0) return `+${n}`;
  return String(n);
}
