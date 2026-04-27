import * as React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { Portrait } from './Portrait';
import {
  importPortrait,
  removePortrait,
  type PortraitTarget,
} from '@/persistence/portrait-repo';
import { pickImageFile } from '@/persistence/vault';
import type { ClassId } from '@/domain/class';
import type { PortraitFallback } from '@/hooks/usePortrait';

export type PortraitPickerMode =
  /**
   * "deferred" — the entity doesn't exist yet (wizard / spawn dialog). The
   * picker holds the chosen source path; the parent imports it after the
   * create call returns the new id.
   */
  | { kind: 'deferred'; pendingSource: string | null; onPendingChange: (s: string | null) => void }
  /**
   * "live" — the entity exists. The picker imports immediately and fires
   * `onChange` with the new vault-relative path (or null on remove).
   */
  | {
      kind: 'live';
      target: PortraitTarget;
      vaultPath: string | null;
      onChange: (path: string | null) => void;
    };

interface PortraitPickerProps {
  /** Discriminator for fallback rendering. Pass either `fallback` or `classId`. */
  fallback?: PortraitFallback;
  /** Legacy character-only shorthand. Equivalent to `{ kind: 'class', classId }`. */
  classId?: ClassId | null;
  name: string;
  mode: PortraitPickerMode;
}

export function PortraitPicker({
  fallback,
  classId,
  name,
  mode,
}: PortraitPickerProps): React.JSX.Element {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const previewVaultPath = mode.kind === 'live' ? mode.vaultPath : null;
  const resolvedFallback: PortraitFallback =
    fallback ??
    (classId
      ? { kind: 'class', classId }
      : { kind: 'class', classId: 'tradesfolk' });

  const onChoose = async () => {
    setError(null);
    let chosen: string | null = null;
    try {
      chosen = await pickImageFile();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    if (!chosen) return;

    if (mode.kind === 'deferred') {
      mode.onPendingChange(chosen);
      return;
    }

    setBusy(true);
    try {
      if (mode.vaultPath) {
        try {
          await removePortrait(mode.vaultPath);
        } catch {
          /* ignore */
        }
      }
      const next = await importPortrait(mode.target, chosen);
      mode.onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setError(null);
    if (mode.kind === 'deferred') {
      mode.onPendingChange(null);
      return;
    }
    if (!mode.vaultPath) return;
    setBusy(true);
    try {
      await removePortrait(mode.vaultPath);
      mode.onChange(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const showRemove =
    mode.kind === 'deferred'
      ? mode.pendingSource != null
      : mode.vaultPath != null;

  const filenameLabel =
    mode.kind === 'deferred' && mode.pendingSource
      ? mode.pendingSource.split(/[\\/]/).pop() ?? mode.pendingSource
      : null;

  return (
    <div className="flex items-center gap-3">
      <Portrait
        vaultPath={previewVaultPath}
        fallback={resolvedFallback}
        name={name}
        size="md"
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void onChoose()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2.5 py-1 text-xs hover:bg-[var(--color-parchment-200)]/60 disabled:opacity-50"
          >
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
            {showRemove ? 'Replace portrait…' : 'Choose portrait…'}
          </button>
          {showRemove && (
            <button
              type="button"
              onClick={() => void onRemove()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-sm border border-[var(--color-parchment-400)] bg-[var(--color-parchment-50)] px-2 py-1 text-xs hover:bg-[var(--color-rust)]/10 hover:text-[var(--color-rust)] disabled:opacity-50"
            >
              <X className="h-3 w-3" aria-hidden />
              Remove
            </button>
          )}
        </div>
        {filenameLabel && (
          <div className="text-[10px] italic text-[var(--color-ink-faint)]">
            Will copy: {filenameLabel}
          </div>
        )}
        {error && (
          <div className="text-[10px] text-[var(--color-rust)]">{error}</div>
        )}
        {!error && !filenameLabel && (
          <div className="text-[10px] text-[var(--color-ink-faint)]">
            PNG, JPG, or WEBP up to 5 MB. Falls back to a placeholder.
          </div>
        )}
      </div>
    </div>
  );
}
