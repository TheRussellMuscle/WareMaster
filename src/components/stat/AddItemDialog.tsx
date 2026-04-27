import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, X, Wand2 } from 'lucide-react';
import { UnitTooltip } from '@/components/parchment/UnitTooltip';
import type { Character, CustomItem } from '@/domain/character';
import type { ReferenceCatalog } from '@/persistence/reference-loader';
import type { Weapon, Armor, GeneralGood } from '@/domain/item';
import { ItemCreatorDialog } from './ItemCreatorDialog';

interface AddItemDialogProps {
  character: Character;
  catalog: ReferenceCatalog;
  /** Called to add an item to inventory (no gold deduction). */
  onAdd: (itemId: string, qty: number) => void | Promise<void>;
  /** Called to save a newly created custom item (and optionally add it). */
  onCreateItem: (item: CustomItem, addToInventory: boolean) => void | Promise<void>;
}

type Tab = 'weapons' | 'armor' | 'goods' | 'custom';

interface CatalogRow {
  id: string;
  name: string;
  meta: string;
  price: number | null;
}

function signed(n: number): string {
  if (n >= 0) return `+${n}`;
  return String(n);
}

function ItemGrid({
  items,
  onAdd,
}: {
  items: CatalogRow[];
  onAdd: (id: string) => void;
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-xs italic text-[var(--color-ink-faint)]">
        No items in this category.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center justify-between gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] px-2 py-1.5 text-xs"
        >
          <div className="min-w-0">
            <div className="font-medium">{it.name}</div>
            <div className="text-[10px] text-[var(--color-ink-faint)]">
              {it.meta}
              {it.price != null ? (
                <span className="ml-2 font-mono">
                  <UnitTooltip unit="golda" amount={it.price} />
                </span>
              ) : (
                <span className="ml-2 italic">no fixed price</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAdd(it.id)}
            title="Add to inventory"
            className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-0.5 text-[10px] hover:bg-[var(--color-gilt)]/15"
          >
            <Plus className="h-3 w-3" aria-hidden /> Add
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AddItemDialog({
  character,
  catalog,
  onAdd,
  onCreateItem,
}: AddItemDialogProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>('weapons');
  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const handleAdd = async (itemId: string) => {
    await onAdd(itemId, 1);
  };

  const filter = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase());

  const weaponItems: CatalogRow[] = catalog.weapons.weapons
    .filter((w: Weapon) => filter(w.name))
    .map((w: Weapon) => ({
      id: w.id,
      name: w.name,
      meta: `${w.category} · ${typeof w.hands === 'number' ? `${w.hands}H` : '1H/2H'}`,
      price: typeof w.price_golda === 'number' ? w.price_golda : null,
    }));

  const armorItems: CatalogRow[] = catalog.armor
    .filter((a: Armor) => filter(a.name))
    .map((a: Armor) => ({
      id: a.id,
      name: a.name,
      meta: `${a.slot} · abs ${a.absorption}, mod ${signed(a.armor_modifier)}`,
      price: a.price_golda,
    }));

  const goodItems: CatalogRow[] = catalog.generalGoods.goods
    .filter((g: GeneralGood) => filter(g.name))
    .map((g: GeneralGood) => ({
      id: g.id,
      name: g.name,
      meta: g.category,
      price: typeof g.price_golda === 'number' ? g.price_golda : null,
    }));

  const customItems: CatalogRow[] = character.custom_items
    .filter((ci: CustomItem) => filter(ci.name))
    .map((ci: CustomItem) => ({
      id: ci.id,
      name: ci.name,
      meta: `${ci.kind}${ci.is_unique ? ' · unique' : ''}`,
      price: ci.price_golda,
    }));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'weapons', label: 'Weapons', count: weaponItems.length },
    { key: 'armor', label: 'Armor', count: armorItems.length },
    { key: 'goods', label: 'Goods', count: goodItems.length },
    { key: 'custom', label: 'Custom', count: character.custom_items.length },
  ];

  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSearch('');
        }}
      >
        <Dialog.Trigger asChild>
          <button
            type="button"
            title="Add item to inventory"
            className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add item
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-ink)]/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[min(96vw,44rem)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-sm border-2 border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] shadow-xl">
            <header className="flex items-center justify-between border-b border-[var(--color-parchment-300)] px-4 py-3">
              <Dialog.Title className="font-display text-lg text-[var(--color-ink)]">
                Add Item
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  title="Close"
                  className="rounded-sm p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </Dialog.Close>
            </header>

            <div className="border-b border-[var(--color-parchment-300)] px-4 py-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="w-full rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-sm"
              />
            </div>

            <div className="flex gap-1 border-b border-[var(--color-parchment-300)] px-4 py-2 text-xs">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-sm border px-3 py-1 ${
                    tab === t.key
                      ? 'border-[var(--color-gilt)] bg-[var(--color-gilt)]/10'
                      : 'border-[var(--color-parchment-300)] bg-[var(--color-parchment-50)] hover:bg-[var(--color-parchment-200)]/40'
                  }`}
                >
                  {t.label}
                  {t.key === 'custom' && t.count > 0 && (
                    <span className="ml-1 text-[var(--color-ink-faint)]">({t.count})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="overflow-auto px-4 py-3">
              {tab === 'weapons' && (
                <ItemGrid items={weaponItems} onAdd={(id) => void handleAdd(id)} />
              )}
              {tab === 'armor' && (
                <ItemGrid items={armorItems} onAdd={(id) => void handleAdd(id)} />
              )}
              {tab === 'goods' && (
                <ItemGrid items={goodItems} onAdd={(id) => void handleAdd(id)} />
              )}
              {tab === 'custom' && (
                <ItemGrid items={customItems} onAdd={(id) => void handleAdd(id)} />
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-[var(--color-parchment-300)] px-4 py-2">
              <p className="text-[10px] italic text-[var(--color-ink-faint)]">
                Items are added directly — no gold deducted (loot/GM grant).
              </p>
              <button
                type="button"
                onClick={() => setCreatorOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-3 py-1.5 text-xs hover:bg-[var(--color-parchment-200)]/60"
              >
                <Wand2 className="h-3.5 w-3.5" aria-hidden /> Create custom item
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ItemCreatorDialog
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        onCreate={async (item, addToInventory) => {
          await onCreateItem(item, addToInventory);
        }}
      />
    </>
  );
}
