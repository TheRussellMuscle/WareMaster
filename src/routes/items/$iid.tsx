import * as React from 'react';
import { createFileRoute, useParams, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import {
  IlluminatedHeading,
  ParchmentCard,
} from '@/components/parchment/ParchmentCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useCustomItemStore } from '@/stores/custom-item-store';
import type { CustomItem, CustomWeapon, CustomArmor } from '@/domain/custom-item';
import type { WeaponCategory, ArmorSlot } from '@/domain/item';

export const Route = createFileRoute('/items/$iid')({
  component: ItemDetailRoute,
});

const WEAPON_CATEGORIES: WeaponCategory[] = [
  'daggers', 'swords', 'bludgeons', 'spears', 'slings', 'bows', 'crossbows',
];
const ARMOR_SLOTS: ArmorSlot[] = ['body', 'head', 'shield'];

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'h-8 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 text-sm';
const numCls = inputCls + ' font-mono';

function itemToFormState(item: CustomItem) {
  const w = item.kind === 'weapon' ? (item as CustomWeapon) : null;
  const a = item.kind === 'armor' ? (item as CustomArmor) : null;
  return {
    name: item.name,
    price: item.price_golda != null ? String(item.price_golda) : '',
    inShop: item.in_shop,
    isUnique: item.is_unique,
    notes: item.notes,
    // weapon
    wCategory: (w?.category ?? 'swords') as WeaponCategory,
    wHands: w?.hands != null ? String(w.hands) : '1',
    wCritical: w?.critical_value != null ? String(w.critical_value) : '',
    wBnMelee: w?.bn_modifier?.melee != null ? String(w.bn_modifier.melee) : '',
    wBnCharge: w?.bn_modifier?.charge != null ? String(w.bn_modifier.charge) : '',
    wBnRange: w?.bn_modifier?.range != null ? String(w.bn_modifier.range) : '',
    wDmgMelee: w?.damage_value?.melee ?? '',
    wDmgRanged: w?.damage_value?.ranged ?? '',
    wRangeLiets: w?.range_liets != null ? String(w.range_liets) : '',
    wReload: w?.reload_segments != null ? String(w.reload_segments) : '',
    // armor
    aSlot: (a?.slot ?? 'body') as ArmorSlot,
    aClass: a?.armor_class ?? '',
    aAbsorption: a?.absorption != null ? String(a.absorption) : '',
    aModifier: a?.armor_modifier != null ? String(a.armor_modifier) : '',
  };
}

function ItemDetailRoute(): React.JSX.Element {
  const { iid } = useParams({ from: '/items/$iid' });
  const items = useCustomItemStore((s) => s.items);
  const load = useCustomItemStore((s) => s.load);
  const updateItem = useCustomItemStore((s) => s.update);
  const removeItem = useCustomItemStore((s) => s.remove);
  const navigate = useNavigate();

  React.useEffect(() => {
    void load();
  }, [load]);

  const item = (items ?? []).find((i) => i.id === iid);

  const [form, setForm] = React.useState(() =>
    item ? itemToFormState(item) : null,
  );
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Sync form state when item loads from store
  React.useEffect(() => {
    if (item && !form) setForm(itemToFormState(item));
  }, [item]);

  if (items === undefined) {
    return <p className="text-sm text-[var(--color-ink-faint)]">Loading…</p>;
  }
  if (!item || !form) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-ink-soft)]">Item not found.</p>
        <Link to="/items" className="text-sm text-[var(--color-rust)] hover:underline">
          ← Back to Custom Items
        </Link>
      </div>
    );
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => f ? { ...f, [key]: value } : f);

  const parseBn = (v: string): number | undefined =>
    v.trim() === '' ? undefined : parseInt(v.trim(), 10);
  const parseNum = (v: string): number | undefined =>
    v.trim() === '' ? undefined : parseFloat(v.trim());

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    const priceNum = form.price.trim() === '' ? null : parseInt(form.price.trim(), 10);
    if (form.price.trim() !== '' && (isNaN(priceNum!) || priceNum! < 0)) {
      setError('Price must be a non-negative whole number or left blank.');
      return;
    }

    const base = {
      id: item.id,
      name: form.name.trim(),
      price_golda: priceNum ?? null,
      in_shop: form.inShop,
      is_unique: form.isUnique,
      notes: form.notes.trim(),
    };

    let next: CustomItem;
    if (item.kind === 'weapon') {
      const hands = form.wHands === '1 or 2' ? '1 or 2' : parseInt(form.wHands, 10) || 1;
      next = {
        ...base,
        kind: 'weapon' as const,
        category: form.wCategory,
        hands,
        critical_value: parseNum(form.wCritical) !== undefined ? Math.round(parseNum(form.wCritical)!) : undefined,
        bn_modifier: {
          melee: parseBn(form.wBnMelee),
          charge: parseBn(form.wBnCharge),
          range: parseBn(form.wBnRange),
        },
        damage_value: {
          melee: form.wDmgMelee.trim() || undefined,
          ranged: form.wDmgRanged.trim() || undefined,
        },
        range_liets: parseNum(form.wRangeLiets),
        reload_segments: parseNum(form.wReload) !== undefined ? Math.round(parseNum(form.wReload)!) : undefined,
      } satisfies CustomWeapon;
    } else if (item.kind === 'armor') {
      next = {
        ...base,
        kind: 'armor' as const,
        slot: form.aSlot,
        armor_class: form.aClass === 'partial' || form.aClass === 'full' ? form.aClass : undefined,
        absorption: form.aAbsorption.trim() !== '' ? parseInt(form.aAbsorption.trim(), 10) : undefined,
        armor_modifier: form.aModifier.trim() !== '' ? parseInt(form.aModifier.trim(), 10) : undefined,
      } satisfies CustomArmor;
    } else {
      next = { ...base, kind: 'good' as const };
    }

    setError('');
    await updateItem(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    await removeItem(item.id);
    void navigate({ to: '/items' });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link
          to="/items"
          className="rounded-sm p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-parchment-200)]/60 hover:text-[var(--color-ink)]"
          title="Back to Custom Items"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <IlluminatedHeading level={2}>{item.name}</IlluminatedHeading>
        <span className="ml-1 text-sm text-[var(--color-ink-faint)]">
          <code className="font-mono text-[10px]">{item.id}</code>
        </span>
      </header>

      <ParchmentCard className="flex flex-col gap-3 p-5">
        {error && (
          <div className="rounded-sm border border-[var(--color-rust)]/40 bg-[var(--color-rust)]/5 px-3 py-1.5 text-xs text-[var(--color-rust)]">
            {error}
          </div>
        )}

        <LabeledField label="Name *">
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls}
          />
        </LabeledField>

        <div className="grid grid-cols-2 gap-3">
          <LabeledField label="Kind">
            <input
              type="text"
              value={item.kind}
              readOnly
              className={`${inputCls} cursor-default bg-[var(--color-parchment-100)] text-[var(--color-ink-soft)]`}
              title="Kind cannot be changed after creation"
            />
          </LabeledField>
          <LabeledField label="Price (golda)">
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="blank = no price"
              className={numCls}
            />
          </LabeledField>
        </div>

        {/* Weapon stat fields */}
        {item.kind === 'weapon' && (
          <div className="flex flex-col gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-3 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Weapon Stats
            </span>
            <div className="grid grid-cols-2 gap-2">
              <LabeledField label="Category">
                <select
                  value={form.wCategory}
                  onChange={(e) => set('wCategory', e.target.value as WeaponCategory)}
                  className={inputCls}
                >
                  {WEAPON_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </LabeledField>
              <LabeledField label="Hands">
                <select
                  value={form.wHands}
                  onChange={(e) => set('wHands', e.target.value)}
                  className={inputCls}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="1 or 2">1 or 2 (bastard)</option>
                </select>
              </LabeledField>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LabeledField label="BN Melee">
                <input type="number" value={form.wBnMelee} onChange={(e) => set('wBnMelee', e.target.value)} placeholder="blank=N/A" className={numCls} />
              </LabeledField>
              <LabeledField label="BN Charge">
                <input type="number" value={form.wBnCharge} onChange={(e) => set('wBnCharge', e.target.value)} placeholder="blank=N/A" className={numCls} />
              </LabeledField>
              <LabeledField label="BN Range">
                <input type="number" value={form.wBnRange} onChange={(e) => set('wBnRange', e.target.value)} placeholder="blank=N/A" className={numCls} />
              </LabeledField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LabeledField label="Dmg Melee">
                <input type="text" value={form.wDmgMelee} onChange={(e) => set('wDmgMelee', e.target.value)} placeholder="e.g. 1D8+2" className={inputCls} />
              </LabeledField>
              <LabeledField label="Dmg Ranged">
                <input type="text" value={form.wDmgRanged} onChange={(e) => set('wDmgRanged', e.target.value)} placeholder="e.g. 1D6" className={inputCls} />
              </LabeledField>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LabeledField label="Critical Value">
                <input type="number" min={1} value={form.wCritical} onChange={(e) => set('wCritical', e.target.value)} placeholder="e.g. 9" className={numCls} />
              </LabeledField>
              <LabeledField label="Range (liets)">
                <input type="number" min={0} value={form.wRangeLiets} onChange={(e) => set('wRangeLiets', e.target.value)} placeholder="blank=N/A" className={numCls} />
              </LabeledField>
              <LabeledField label="Reload (segs)">
                <input type="number" min={0} value={form.wReload} onChange={(e) => set('wReload', e.target.value)} placeholder="blank=N/A" className={numCls} />
              </LabeledField>
            </div>
          </div>
        )}

        {/* Armor stat fields */}
        {item.kind === 'armor' && (
          <div className="flex flex-col gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-3 py-2.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Armor Stats
            </span>
            <div className="grid grid-cols-2 gap-2">
              <LabeledField label="Slot">
                <select
                  value={form.aSlot}
                  onChange={(e) => set('aSlot', e.target.value as ArmorSlot)}
                  className={inputCls}
                >
                  {ARMOR_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </LabeledField>
              <LabeledField label="Armor Class">
                <select
                  value={form.aClass}
                  onChange={(e) => set('aClass', e.target.value)}
                  className={inputCls}
                >
                  <option value="">— none —</option>
                  <option value="partial">Partial</option>
                  <option value="full">Full</option>
                </select>
              </LabeledField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LabeledField label="Absorption">
                <input type="number" value={form.aAbsorption} onChange={(e) => set('aAbsorption', e.target.value)} placeholder="e.g. 3" className={numCls} />
              </LabeledField>
              <LabeledField label="Armor Modifier">
                <input type="number" value={form.aModifier} onChange={(e) => set('aModifier', e.target.value)} placeholder="e.g. -1" className={numCls} />
              </LabeledField>
            </div>
          </div>
        )}

        <LabeledField label="Notes (optional)">
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1.5 text-sm"
          />
        </LabeledField>

        <div className="flex flex-col gap-1.5 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.inShop}
              onChange={(e) => set('inShop', e.target.checked)}
              className="accent-[var(--color-gilt)]"
            />
            Available in Gear Shop
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isUnique}
              onChange={(e) => set('isUnique', e.target.checked)}
              className="accent-[var(--color-gilt)]"
            />
            Unique item
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-parchment-300)] pt-3">
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-rust)]/40 px-3 py-1.5 text-sm text-[var(--color-rust)] hover:bg-[var(--color-rust)]/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Delete
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-gilt)] bg-[var(--color-gilt)]/10 px-3 py-1.5 text-sm hover:bg-[var(--color-gilt)]/20"
          >
            <Save className="h-4 w-4" aria-hidden />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </ParchmentCard>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete custom item"
        description={`Delete "${item.name}"? This cannot be undone. Any characters that have this item in their inventory will keep the item ID but it will no longer resolve to a name.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
