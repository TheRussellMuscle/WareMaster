import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Trash2, Package } from 'lucide-react';
import {
  IlluminatedHeading,
} from '@/components/parchment/ParchmentCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ItemCreatorDialog } from '@/components/stat/ItemCreatorDialog';
import { useCustomItemStore } from '@/stores/custom-item-store';
import type { CustomItem } from '@/domain/custom-item';

export const Route = createFileRoute('/items/')({
  component: ItemsIndex,
});

function kindBadge(kind: CustomItem['kind']): React.JSX.Element {
  const styles: Record<CustomItem['kind'], string> = {
    weapon:        'border-[var(--color-rust)]/40 bg-[var(--color-rust)]/10 text-[var(--color-rust)]',
    armor:         'border-[var(--color-verdigris)]/40 bg-[var(--color-verdigris)]/10 text-[var(--color-verdigris)]',
    good:          'border-[var(--color-parchment-400)] bg-[var(--color-parchment-200)] text-[var(--color-ink-soft)]',
    'ryude-weapon': 'border-[var(--color-rust)]/40 bg-[var(--color-rust)]/10 text-[var(--color-rust)]',
    'ryude-armor':  'border-[var(--color-verdigris)]/40 bg-[var(--color-verdigris)]/10 text-[var(--color-verdigris)]',
  };
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${styles[kind]}`}>
      {kind}
    </span>
  );
}

function ItemsIndex(): React.JSX.Element {
  const items = useCustomItemStore((s) => s.items);
  const load = useCustomItemStore((s) => s.load);
  const createItem = useCustomItemStore((s) => s.create);
  const removeItem = useCustomItemStore((s) => s.remove);

  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void load();
  }, [load]);

  const deletingItem = deletingId ? (items ?? []).find((i) => i.id === deletingId) : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <IlluminatedHeading level={1}>Custom Items</IlluminatedHeading>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Vault-wide custom items — weapons, armor, and general goods available
            to all characters. Saved under{' '}
            <code className="font-mono">~/Documents/WareMaster/items/</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreatorOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-gilt)] bg-[var(--color-gilt)]/10 px-3 py-1.5 text-sm hover:bg-[var(--color-gilt)]/20"
        >
          <Plus className="h-4 w-4" aria-hidden /> New Item
        </button>
      </header>

      {items === undefined ? (
        <p className="text-sm text-[var(--color-ink-faint)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-[var(--color-parchment-400)] py-12 text-center">
          <Package className="h-8 w-8 text-[var(--color-ink-faint)]" aria-hidden />
          <p className="text-sm text-[var(--color-ink-soft)]">No custom items yet.</p>
          <button
            type="button"
            onClick={() => setCreatorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] px-3 py-1.5 text-sm hover:bg-[var(--color-parchment-200)]/60"
          >
            <Plus className="h-4 w-4" aria-hidden /> Create your first item
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-[var(--color-parchment-400)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/60 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                <th className="px-3 py-2 text-left font-normal">Name</th>
                <th className="px-3 py-2 text-left font-normal">Kind</th>
                <th className="px-3 py-2 text-right font-normal">Price</th>
                <th className="px-3 py-2 text-center font-normal">Shop</th>
                <th className="px-3 py-2 text-center font-normal">Unique</th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`border-b border-[var(--color-parchment-300)] last:border-0 hover:bg-[var(--color-parchment-100)]/40 ${
                    idx % 2 === 1 ? 'bg-[var(--color-parchment-100)]/20' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <Link
                      to="/items/$iid"
                      params={{ iid: item.id }}
                      className="font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)] hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.notes && (
                      <div className="mt-0.5 truncate text-[10px] text-[var(--color-ink-faint)]">
                        {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{kindBadge(item.kind)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-[var(--color-ink-soft)]">
                    {item.price_golda != null ? `${item.price_golda} g` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-[var(--color-ink-soft)]">
                    {item.in_shop ? '✓' : '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-[var(--color-ink-soft)]">
                    {item.is_unique ? '✓' : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      title={`Delete ${item.name}`}
                      onClick={() => setDeletingId(item.id)}
                      className="rounded-sm p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ItemCreatorDialog
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        hideAddNow
        onCreate={async (item) => {
          await createItem(item);
        }}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => { if (!o) setDeletingId(null); }}
        title="Delete custom item"
        description={
          deletingItem
            ? `Delete "${deletingItem.name}"? This cannot be undone. Any characters that have this item in their inventory will keep the item ID but it will no longer resolve to a name.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deletingId) await removeItem(deletingId);
          setDeletingId(null);
        }}
      />
    </div>
  );
}
