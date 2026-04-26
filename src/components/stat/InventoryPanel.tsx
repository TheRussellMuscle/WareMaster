import { Shield, Sword, Package, ArrowUp, Trash2, Coins } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import type { Character } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import { itemRef } from '@/engine/equipment/apply';

interface InventoryPanelProps {
  character: Character;
  catalog: ReferenceCatalog | null;
  /** Move an item from inventory into the appropriate equipped slot. */
  onEquip?: (itemId: string) => void | Promise<void>;
  /** Drop an item entirely (no golda change). */
  onDrop?: (itemId: string, qty?: number) => void | Promise<void>;
  /** Sell an item back at 50% of catalog price. */
  onSell?: (itemId: string, qty?: number) => void | Promise<void>;
}

/**
 * Lists the character's non-equipped possessions with per-item actions
 * (Equip / Sell / Drop). Read-only display when the action callbacks are
 * omitted. Prices come from the catalog; items with non-numeric prices
 * (e.g. "Free", "varies") can be dropped but not sold.
 */
export function InventoryPanel({
  character,
  catalog,
  onEquip,
  onDrop,
  onSell,
}: InventoryPanelProps): React.JSX.Element {
  const items = character.equipment.other;

  return (
    <ParchmentCard className="flex flex-col gap-2">
      <IlluminatedHeading level={2}>Inventory</IlluminatedHeading>
      {items.length === 0 ? (
        <p className="text-sm italic text-[var(--color-ink-faint)]">
          No items in inventory.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((entry, i) => {
            const ref = catalog ? itemRef(catalog, entry.item_id) : null;
            const name = ref?.name ?? entry.item_id;
            const equippable =
              ref != null && ref.kind !== 'good' && onEquip != null;
            const sellable =
              ref != null && ref.pricePerUnit != null && onSell != null;
            const sellPrice =
              ref?.pricePerUnit != null ? Math.floor(ref.pricePerUnit / 2) : 0;
            return (
              <li
                key={`${entry.item_id}-${i}`}
                className="flex items-center justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)]/60 px-3 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <KindIcon kind={ref?.kind} />
                  <span className="font-medium">{name}</span>
                  {entry.quantity > 1 && (
                    <span className="text-xs text-[var(--color-ink-faint)]">
                      ×{entry.quantity}
                    </span>
                  )}
                  {ref?.pricePerUnit != null && (
                    <span className="text-[10px] text-[var(--color-ink-faint)]">
                      <UnitTooltip unit="golda" amount={ref.pricePerUnit} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {equippable && (
                    <button
                      type="button"
                      onClick={() => void onEquip!(entry.item_id)}
                      title="Equip"
                      className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0.5 text-[10px] hover:bg-[var(--color-parchment-200)]/60"
                    >
                      <ArrowUp className="h-3 w-3" aria-hidden /> Equip
                    </button>
                  )}
                  {sellable && (
                    <button
                      type="button"
                      onClick={() => void onSell!(entry.item_id)}
                      title={`Sell for ${sellPrice} G (50% of catalog price)`}
                      className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-1.5 py-0.5 text-[10px] hover:bg-[var(--color-verdigris)]/10 hover:text-[var(--color-verdigris)]"
                    >
                      <Coins className="h-3 w-3" aria-hidden /> Sell {sellPrice}
                    </button>
                  )}
                  {onDrop && (
                    <button
                      type="button"
                      onClick={() => void onDrop(entry.item_id)}
                      title="Drop"
                      className="rounded-sm p-0.5 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ParchmentCard>
  );
}

function KindIcon({ kind }: { kind?: string }): React.JSX.Element {
  if (kind === 'weapon')
    return <Sword className="h-3.5 w-3.5 text-[var(--color-rust)]" aria-hidden />;
  if (kind === 'armor-shield')
    return <Shield className="h-3.5 w-3.5 text-[var(--color-verdigris)]" aria-hidden />;
  if (kind === 'armor-body' || kind === 'armor-head')
    return <Shield className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />;
  return <Package className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" aria-hidden />;
}
