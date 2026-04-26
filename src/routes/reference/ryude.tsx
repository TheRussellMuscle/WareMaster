import { createFileRoute } from '@tanstack/react-router';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import { RyudeStatBlock } from '@/components/stat/RyudeStatBlock';

export const Route = createFileRoute('/reference/ryude')({
  component: RyudeReference,
});

function RyudeReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Ryude"
      subtitle="Sample mecha units (Footman, Courser, Maledictor) and their dedicated weapons and armor."
    >
      {(catalog) => (
        <div className="flex flex-col gap-4">
          {catalog.ryudeUnits.ryude_units.map((r) => (
            <RyudeStatBlock key={r.id} ryude={r} />
          ))}

          <ParchmentCard>
            <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
              Ryude Weapons
            </h2>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  <th className="py-1">Name</th>
                  <th>Category</th>
                  <th>Hands</th>
                  <th>Crit</th>
                  <th>BN m/c/r</th>
                  <th>Damage</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody className="text-[var(--color-ink)]">
                {catalog.ryudeEquipment.ryude_weapons.map((w) => (
                  <tr
                    key={w.id}
                    className="border-t border-[var(--color-parchment-300)]/60"
                  >
                    <td className="py-1 font-display text-sm">{w.name}</td>
                    <td>{w.category}</td>
                    <td>{w.hands}</td>
                    <td>{w.critical_value}</td>
                    <td>
                      {fmt(w.bn_modifier.melee)} /
                      {fmt(w.bn_modifier.charge)} /
                      {fmt(w.bn_modifier.range)}
                    </td>
                    <td>{w.damage_value.melee ?? '—'}</td>
                    <td>
                      <UnitTooltip unit="golda" amount={w.price_golda} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ParchmentCard>

          <ParchmentCard>
            <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
              Ryude Armor
            </h2>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  <th className="py-1">Name</th>
                  <th>Class</th>
                  <th>Arm Mod</th>
                  <th>SPE Mod</th>
                  <th>Price</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody className="text-[var(--color-ink)]">
                {catalog.ryudeEquipment.ryude_armor.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-[var(--color-parchment-300)]/60"
                  >
                    <td className="py-1 font-display text-sm">{a.name}</td>
                    <td>{a.armor_class}</td>
                    <td>{fmt(a.arm_modifier)}</td>
                    <td>{fmt(a.spe_modifier)}</td>
                    <td>
                      <UnitTooltip unit="golda" amount={a.price_golda} />
                    </td>
                    <td className="font-body italic text-[var(--color-ink-faint)]">
                      {a.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ParchmentCard>
        </div>
      )}
    </ReferenceShell>
  );
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n > 0) return `+${n}`;
  return String(n);
}
