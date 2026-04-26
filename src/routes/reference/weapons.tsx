import { createFileRoute } from '@tanstack/react-router';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import type { Weapon, WeaponCategory } from '@/domain/item';

export const Route = createFileRoute('/reference/weapons')({
  component: WeaponsReference,
});

const CATEGORY_ORDER: WeaponCategory[] = [
  'daggers',
  'swords',
  'bludgeons',
  'spears',
  'slings',
  'bows',
  'crossbows',
];

const CATEGORY_LABEL: Record<WeaponCategory, string> = {
  daggers: 'Daggers',
  swords: 'Swords',
  bludgeons: 'Bludgeons',
  spears: 'Spears',
  slings: 'Slings',
  bows: 'Bows',
  crossbows: 'Crossbows',
};

function WeaponsReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Weapons"
      subtitle="BN modifier varies by stance: melee / charge / range. Damage values are dice formulas (e.g. 1D10+3)."
    >
      {(catalog) => {
        const grouped = new Map<WeaponCategory, Weapon[]>();
        for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
        for (const w of catalog.weapons.weapons) grouped.get(w.category)?.push(w);

        return (
          <div className="flex flex-col gap-4">
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped.get(cat) ?? [];
              if (items.length === 0) return null;
              return (
                <ParchmentCard key={cat}>
                  <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
                    {CATEGORY_LABEL[cat]}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                          <th className="py-1">Name</th>
                          <th>Hands</th>
                          <th>Crit</th>
                          <th>BN m/c/r</th>
                          <th>Damage m/r</th>
                          <th>Range</th>
                          <th>Reload</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody className="text-[var(--color-ink)]">
                        {items.map((w) => (
                          <tr
                            key={w.id}
                            className="border-t border-[var(--color-parchment-300)]/60"
                          >
                            <td className="py-1 font-display text-sm">{w.name}</td>
                            <td>{w.hands}</td>
                            <td>{w.critical_value}</td>
                            <td>
                              {fmt(w.bn_modifier.melee)} /
                              {fmt(w.bn_modifier.charge)} /
                              {fmt(w.bn_modifier.range)}
                            </td>
                            <td>
                              {w.damage_value.melee ?? '—'} /{' '}
                              {w.damage_value.ranged ?? '—'}
                            </td>
                            <td>
                              {w.range_liets != null ? (
                                <UnitTooltip unit="liet" amount={w.range_liets} />
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {w.reload_segments != null ? (
                                <UnitTooltip
                                  unit="segment"
                                  amount={w.reload_segments}
                                />
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              {typeof w.price_golda === 'number' ? (
                                <UnitTooltip unit="golda" amount={w.price_golda} />
                              ) : (
                                w.price_golda
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ParchmentCard>
              );
            })}

            {catalog.weapons.ammunition &&
              catalog.weapons.ammunition.length > 0 && (
                <ParchmentCard>
                  <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
                    Ammunition
                  </h2>
                  <ul className="space-y-1 text-sm">
                    {catalog.weapons.ammunition.map((a) => (
                      <li key={a.id} className="flex items-baseline gap-3">
                        <span className="font-display">{a.name}</span>
                        <span className="font-mono text-xs text-[var(--color-ink-soft)]">
                          {a.bundle}
                        </span>
                        {a.note && (
                          <span className="text-xs italic text-[var(--color-ink-faint)]">
                            {a.note}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </ParchmentCard>
              )}
          </div>
        );
      }}
    </ReferenceShell>
  );
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n > 0) return `+${n}`;
  return String(n);
}
