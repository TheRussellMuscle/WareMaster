import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ShoppingCart, X, Plus } from 'lucide-react';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import type { Character } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { Weapon, Armor, GeneralGood } from '@/domain/item';
import { purchaseItem } from '@/engine/equipment/apply';

interface GearShopProps {
  character: Character;
  catalog: ReferenceCatalog;
  /** Called after a successful purchase so the parent can persist + reload. */
  onPurchase: (
    next: { equipment: Character['equipment']; golda: number },
  ) => void | Promise<void>;
}

type Tab = 'weapons' | 'armor' | 'goods';

/**
 * Modal "gear shop" — opens from a button on the character sheet, lets the
 * WM/player buy any catalog item using the character's current golda. Each
 * Buy click drops the price from `golda` and adds the item to inventory.
 *
 * Decoupled from in-fiction merchant logic — Phase 3 trusts the player to
 * be near a vendor. Phase 4+ may add merchant NPCs gating availability.
 */
export function GearShop({
  character,
  catalog,
  onPurchase,
}: GearShopProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>('weapons');
  const [error, setError] = React.useState<string | null>(null);

  const buy = async (itemId: string) => {
    setError(null);
    const result = purchaseItem(character, itemId, 1, catalog);
    if (result.error) {
      setError(result.error);
      return;
    }
    await onPurchase({ equipment: result.equipment, golda: result.golda });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden /> Gear shop
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-ink)]/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(96vw,42rem)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-sm border-2 border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] shadow-xl"
          onEscapeKeyDown={() => setOpen(false)}
        >
          <header className="flex items-baseline justify-between border-b border-[var(--color-parchment-300)] px-4 py-3">
            <Dialog.Title className="font-display text-lg text-[var(--color-ink)]">
              Gear shop
            </Dialog.Title>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-[var(--color-ink-soft)]">
                Purse: <UnitTooltip unit="golda" amount={character.golda} />
              </span>
              <Dialog.Close asChild>
                <button
                  type="button"
                  title="Close"
                  className="rounded-sm p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </Dialog.Close>
            </div>
          </header>

          <div className="flex gap-1 border-b border-[var(--color-parchment-300)] px-4 py-2 text-xs">
            {(['weapons', 'armor', 'goods'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-sm border px-3 py-1 capitalize ${
                  tab === t
                    ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                    : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] hover:bg-[var(--color-parchment-200)]/40'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {error && (
            <div className="mx-4 mt-2 rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-1.5 text-xs text-[var(--color-rust)]">
              {error}
            </div>
          )}

          <div className="overflow-auto px-4 py-3">
            {tab === 'weapons' && (
              <ItemGrid
                items={catalog.weapons.weapons.map((w: Weapon) => ({
                  id: w.id,
                  name: w.name,
                  meta: `${w.category} · ${typeof w.hands === 'number' ? `${w.hands}H` : '1H/2H'}`,
                  price: typeof w.price_golda === 'number' ? w.price_golda : null,
                }))}
                budget={character.golda}
                onBuy={buy}
              />
            )}
            {tab === 'armor' && (
              <ItemGrid
                items={catalog.armor.map((a: Armor) => ({
                  id: a.id,
                  name: a.name,
                  meta: `${a.slot} · abs ${a.absorption}, mod ${signed(a.armor_modifier)}`,
                  price: a.price_golda,
                }))}
                budget={character.golda}
                onBuy={buy}
              />
            )}
            {tab === 'goods' && (
              <ItemGrid
                items={catalog.generalGoods.goods.map((g: GeneralGood) => ({
                  id: g.id,
                  name: g.name,
                  meta: g.category,
                  price: typeof g.price_golda === 'number' ? g.price_golda : null,
                }))}
                budget={character.golda}
                onBuy={buy}
              />
            )}
          </div>

          <footer className="border-t border-[var(--color-parchment-300)] px-4 py-2 text-[10px] italic text-[var(--color-ink-faint)]">
            Sells refund 50% of catalog price (Rule §10). Items with no fixed
            price can't be bought here.
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface CatalogRow {
  id: string;
  name: string;
  meta: string;
  price: number | null;
}

function ItemGrid({
  items,
  budget,
  onBuy,
}: {
  items: CatalogRow[];
  budget: number;
  onBuy: (id: string) => void | Promise<void>;
}): React.JSX.Element {
  return (
    <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
      {items.map((it) => {
        const buyable = it.price != null && it.price <= budget;
        const tooExpensive = it.price != null && it.price > budget;
        return (
          <li
            key={it.id}
            className="flex items-center justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] px-2 py-1.5 text-xs"
          >
            <div className="min-w-0">
              <div className="font-medium">{it.name}</div>
              <div className="text-[10px] text-[var(--color-ink-faint)]">
                {it.meta}
                {it.price != null && (
                  <span className="ml-2 font-mono">
                    <UnitTooltip unit="golda" amount={it.price} />
                  </span>
                )}
                {it.price == null && (
                  <span className="ml-2 italic">price varies</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onBuy(it.id)}
              disabled={!buyable}
              title={
                tooExpensive
                  ? `Need ${(it.price ?? 0) - budget} more golda`
                  : it.price == null
                    ? 'No fixed price'
                    : 'Buy 1'
              }
              className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-0.5 text-[10px] hover:bg-[var(--color-gilt)]/15 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="h-3 w-3" aria-hidden /> Buy
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function signed(n: number): string {
  if (n >= 0) return `+${n}`;
  return String(n);
}
