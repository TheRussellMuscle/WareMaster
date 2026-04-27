import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { CustomItem } from '@/domain/character';

interface ItemCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new item and whether to immediately add to inventory. */
  onCreate: (item: CustomItem, addToInventory: boolean) => void | Promise<void>;
}

export function ItemCreatorDialog({
  open,
  onOpenChange,
  onCreate,
}: ItemCreatorDialogProps): React.JSX.Element {
  const [name, setName] = React.useState('');
  const [kind, setKind] = React.useState<CustomItem['kind']>('good');
  const [price, setPrice] = React.useState('');
  const [inShop, setInShop] = React.useState(true);
  const [isUnique, setIsUnique] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [addNow, setAddNow] = React.useState(true);
  const [error, setError] = React.useState('');

  const reset = () => {
    setName('');
    setKind('good');
    setPrice('');
    setInShop(true);
    setIsUnique(false);
    setNotes('');
    setAddNow(true);
    setError('');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const priceNum = price.trim() === '' ? null : parseInt(price.trim(), 10);
    if (price.trim() !== '' && (isNaN(priceNum!) || priceNum! < 0)) {
      setError('Price must be a non-negative whole number or left blank.');
      return;
    }
    const item: CustomItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      kind,
      price_golda: priceNum ?? null,
      in_shop: inShop,
      is_unique: isUnique,
      notes: notes.trim(),
    };
    await onCreate(item, addNow);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[var(--color-ink)]/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(96vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] shadow-xl">
          <header className="flex items-center justify-between border-b border-[var(--color-parchment-300)] px-4 py-3">
            <Dialog.Title className="font-display text-base text-[var(--color-ink)]">
              Create Custom Item
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-sm p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </header>

          <div className="flex flex-col gap-3 px-4 py-4">
            {error && (
              <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-1.5 text-xs text-[var(--color-rust)]">
                {error}
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Name *
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enchanted Amulet"
                className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Kind
                </span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as CustomItem['kind'])}
                  className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm"
                >
                  <option value="good">Good</option>
                  <option value="weapon">Weapon</option>
                  <option value="armor">Armor</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Price (golda)
                </span>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="blank = no price"
                  className="h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 font-mono text-sm"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                Notes (optional)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1.5 text-sm"
              />
            </label>

            <div className="flex flex-col gap-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inShop}
                  onChange={(e) => setInShop(e.target.checked)}
                  className="accent-[var(--color-gilt)]"
                />
                Available in Gear Shop
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isUnique}
                  onChange={(e) => setIsUnique(e.target.checked)}
                  className="accent-[var(--color-gilt)]"
                />
                Unique item
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={addNow}
                  onChange={(e) => setAddNow(e.target.checked)}
                  className="accent-[var(--color-gilt)]"
                />
                Add to inventory now
              </label>
            </div>
          </div>

          <footer className="flex justify-end gap-2 border-t border-[var(--color-parchment-300)] px-4 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-sm border border-[var(--color-parchment-400)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="rounded-sm border border-[var(--color-gilt)] bg-[var(--color-gilt)]/10 px-3 py-1.5 text-sm hover:bg-[var(--color-gilt)]/20"
            >
              Create
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
