import { createFileRoute } from '@tanstack/react-router';
import { ParchmentCard } from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import { ReferenceShell } from '@/components/reference/ReferenceShell';
import type { Armor, ArmorSlot } from '@/domain/item';

export const Route = createFileRoute('/reference/armor')({
  component: ArmorReference,
});

const SLOT_ORDER: ArmorSlot[] = ['body', 'head', 'shield'];
const SLOT_LABEL: Record<ArmorSlot, string> = {
  body: 'Body Armor',
  head: 'Head Armor',
  shield: 'Shields',
};

function ArmorReference(): React.JSX.Element {
  return (
    <ReferenceShell
      title="Armor"
      subtitle="One body / head / shield piece may be equipped. Higher absorption typically comes with negative armor modifiers."
    >
      {(catalog) => {
        const grouped = new Map<ArmorSlot, Armor[]>();
        for (const slot of SLOT_ORDER) grouped.set(slot, []);
        for (const a of catalog.armor) grouped.get(a.slot)?.push(a);

        return (
          <div className="flex flex-col gap-4">
            {SLOT_ORDER.map((slot) => {
              const items = grouped.get(slot) ?? [];
              if (items.length === 0) return null;
              return (
                <ParchmentCard key={slot}>
                  <h2 className="mb-2 font-display text-lg text-[var(--color-ink)]">
                    {SLOT_LABEL[slot]}
                  </h2>
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                        <th className="py-1">Name</th>
                        <th>Class</th>
                        <th>Absorption</th>
                        <th>Armor Mod</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--color-ink)]">
                      {items.map((a) => (
                        <tr
                          key={a.id}
                          className="border-t border-[var(--color-parchment-300)]/60"
                        >
                          <td className="py-1 font-display text-sm">{a.name}</td>
                          <td>{a.armor_class ?? '—'}</td>
                          <td>{a.absorption}</td>
                          <td>
                            {a.armor_modifier > 0
                              ? `+${a.armor_modifier}`
                              : a.armor_modifier}
                          </td>
                          <td>
                            <UnitTooltip unit="golda" amount={a.price_golda} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ParchmentCard>
              );
            })}
          </div>
        );
      }}
    </ReferenceShell>
  );
}
