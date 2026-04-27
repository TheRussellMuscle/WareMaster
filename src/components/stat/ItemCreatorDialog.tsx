import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { CustomItem, CustomWeapon, CustomArmor } from '@/domain/custom-item';
import { newCustomItemId } from '@/persistence/custom-item-repo';
import type { WeaponCategory } from '@/domain/item';
import type { ArmorSlot } from '@/domain/item';

interface ItemCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new item and whether to immediately add to inventory. */
  onCreate: (item: CustomItem, addToInventory: boolean) => void | Promise<void>;
  /** When true, hides the "Add to inventory now" checkbox (used on the global items page). */
  hideAddNow?: boolean;
}

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

export function ItemCreatorDialog({
  open,
  onOpenChange,
  onCreate,
  hideAddNow = false,
}: ItemCreatorDialogProps): React.JSX.Element {
  const [name, setName] = React.useState('');
  const [kind, setKind] = React.useState<CustomItem['kind']>('good');
  const [price, setPrice] = React.useState('');
  const [inShop, setInShop] = React.useState(true);
  const [isUnique, setIsUnique] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [addNow, setAddNow] = React.useState(true);
  const [error, setError] = React.useState('');

  // Weapon stats
  const [wCategory, setWCategory] = React.useState<WeaponCategory>('swords');
  const [wHands, setWHands] = React.useState('1');
  const [wCritical, setWCritical] = React.useState('');
  const [wBnMelee, setWBnMelee] = React.useState('');
  const [wBnCharge, setWBnCharge] = React.useState('');
  const [wBnRange, setWBnRange] = React.useState('');
  const [wDmgMelee, setWDmgMelee] = React.useState('');
  const [wDmgRanged, setWDmgRanged] = React.useState('');
  const [wRangeLiets, setWRangeLiets] = React.useState('');
  const [wReload, setWReload] = React.useState('');

  // Armor stats
  const [aSlot, setASlot] = React.useState<ArmorSlot>('body');
  const [aClass, setAClass] = React.useState('');
  const [aAbsorption, setAAbsorption] = React.useState('');
  const [aModifier, setAModifier] = React.useState('');

  const reset = () => {
    setName(''); setKind('good'); setPrice(''); setInShop(true); setIsUnique(false);
    setNotes(''); setAddNow(true); setError('');
    setWCategory('swords'); setWHands('1'); setWCritical(''); setWBnMelee('');
    setWBnCharge(''); setWBnRange(''); setWDmgMelee(''); setWDmgRanged('');
    setWRangeLiets(''); setWReload('');
    setASlot('body'); setAClass(''); setAAbsorption(''); setAModifier('');
  };

  const parseBn = (v: string): number | undefined =>
    v.trim() === '' ? undefined : parseInt(v.trim(), 10);
  const parseNum = (v: string): number | undefined =>
    v.trim() === '' ? undefined : parseFloat(v.trim());

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    const priceNum = price.trim() === '' ? null : parseInt(price.trim(), 10);
    if (price.trim() !== '' && (isNaN(priceNum!) || priceNum! < 0)) {
      setError('Price must be a non-negative whole number or left blank.');
      return;
    }

    const base = {
      id: newCustomItemId(),
      name: name.trim(),
      price_golda: priceNum ?? null,
      in_shop: inShop,
      is_unique: isUnique,
      notes: notes.trim(),
    };

    let item: CustomItem;
    if (kind === 'weapon') {
      const hands = wHands === '1 or 2' ? '1 or 2' : parseInt(wHands, 10) || 1;
      item = {
        ...base,
        kind: 'weapon' as const,
        category: wCategory,
        hands,
        critical_value: parseNum(wCritical) !== undefined ? Math.round(parseNum(wCritical)!) : undefined,
        bn_modifier: {
          melee: parseBn(wBnMelee),
          charge: parseBn(wBnCharge),
          range: parseBn(wBnRange),
        },
        damage_value: {
          melee: wDmgMelee.trim() || undefined,
          ranged: wDmgRanged.trim() || undefined,
        },
        range_liets: parseNum(wRangeLiets),
        reload_segments: parseNum(wReload) !== undefined ? Math.round(parseNum(wReload)!) : undefined,
      } satisfies CustomWeapon;
    } else if (kind === 'armor') {
      item = {
        ...base,
        kind: 'armor' as const,
        slot: aSlot,
        armor_class: aClass === 'partial' || aClass === 'full' ? aClass : undefined,
        absorption: aAbsorption.trim() !== '' ? parseInt(aAbsorption.trim(), 10) : undefined,
        armor_modifier: aModifier.trim() !== '' ? parseInt(aModifier.trim(), 10) : undefined,
      } satisfies CustomArmor;
    } else {
      item = { ...base, kind: 'good' as const };
    }

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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(96vw,32rem)] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] shadow-xl">
          <header className="flex items-center justify-between border-b border-[var(--color-parchment-300)] px-4 py-3 sticky top-0 bg-[var(--color-parchment-50)] z-10">
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

            <LabeledField label="Name *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enchanted Amulet"
                className={inputCls}
              />
            </LabeledField>

            <div className="grid grid-cols-2 gap-2">
              <LabeledField label="Kind">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as CustomItem['kind'])}
                  className={inputCls}
                >
                  <option value="good">Good</option>
                  <option value="weapon">Weapon</option>
                  <option value="armor">Armor</option>
                </select>
              </LabeledField>

              <LabeledField label="Price (golda)">
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="blank = no price"
                  className={numCls}
                />
              </LabeledField>
            </div>

            {/* Weapon stat fields */}
            {kind === 'weapon' && (
              <div className="flex flex-col gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Weapon Stats
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <LabeledField label="Category">
                    <select
                      value={wCategory}
                      onChange={(e) => setWCategory(e.target.value as WeaponCategory)}
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
                      value={wHands}
                      onChange={(e) => setWHands(e.target.value)}
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
                    <input type="number" value={wBnMelee} onChange={(e) => setWBnMelee(e.target.value)} placeholder="blank=N/A" className={numCls} />
                  </LabeledField>
                  <LabeledField label="BN Charge">
                    <input type="number" value={wBnCharge} onChange={(e) => setWBnCharge(e.target.value)} placeholder="blank=N/A" className={numCls} />
                  </LabeledField>
                  <LabeledField label="BN Range">
                    <input type="number" value={wBnRange} onChange={(e) => setWBnRange(e.target.value)} placeholder="blank=N/A" className={numCls} />
                  </LabeledField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LabeledField label="Dmg Melee">
                    <input type="text" value={wDmgMelee} onChange={(e) => setWDmgMelee(e.target.value)} placeholder="e.g. 1D8+2" className={inputCls} />
                  </LabeledField>
                  <LabeledField label="Dmg Ranged">
                    <input type="text" value={wDmgRanged} onChange={(e) => setWDmgRanged(e.target.value)} placeholder="e.g. 1D6" className={inputCls} />
                  </LabeledField>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <LabeledField label="Critical Value">
                    <input type="number" min={1} value={wCritical} onChange={(e) => setWCritical(e.target.value)} placeholder="e.g. 9" className={numCls} />
                  </LabeledField>
                  <LabeledField label="Range (liets)">
                    <input type="number" min={0} value={wRangeLiets} onChange={(e) => setWRangeLiets(e.target.value)} placeholder="blank=N/A" className={numCls} />
                  </LabeledField>
                  <LabeledField label="Reload (segs)">
                    <input type="number" min={0} value={wReload} onChange={(e) => setWReload(e.target.value)} placeholder="blank=N/A" className={numCls} />
                  </LabeledField>
                </div>
              </div>
            )}

            {/* Armor stat fields */}
            {kind === 'armor' && (
              <div className="flex flex-col gap-2 rounded-sm border border-[var(--color-parchment-300)] bg-[var(--color-parchment-100)]/40 px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Armor Stats
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <LabeledField label="Slot">
                    <select
                      value={aSlot}
                      onChange={(e) => setASlot(e.target.value as ArmorSlot)}
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
                      value={aClass}
                      onChange={(e) => setAClass(e.target.value)}
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
                    <input type="number" value={aAbsorption} onChange={(e) => setAAbsorption(e.target.value)} placeholder="e.g. 3" className={numCls} />
                  </LabeledField>
                  <LabeledField label="Armor Modifier">
                    <input type="number" value={aModifier} onChange={(e) => setAModifier(e.target.value)} placeholder="e.g. -1" className={numCls} />
                  </LabeledField>
                </div>
              </div>
            )}

            <LabeledField label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1.5 text-sm"
              />
            </LabeledField>

            <div className="flex flex-col gap-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={inShop} onChange={(e) => setInShop(e.target.checked)} className="accent-[var(--color-gilt)]" />
                Available in Gear Shop
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isUnique} onChange={(e) => setIsUnique(e.target.checked)} className="accent-[var(--color-gilt)]" />
                Unique item
              </label>
              {!hideAddNow && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={addNow} onChange={(e) => setAddNow(e.target.checked)} className="accent-[var(--color-gilt)]" />
                  Add to inventory now
                </label>
              )}
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
