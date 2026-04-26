import * as React from 'react';
import { useReferenceStore } from '@/stores/reference-store';

/**
 * Triggers the bundled-reference loader on first mount, then exposes the
 * loaded catalog (or null while loading / on failure) plus structured
 * load failures for diagnostics.
 */
export function useReferenceData() {
  const status = useReferenceStore((s) => s.status);
  const catalog = useReferenceStore((s) => s.catalog);
  const failures = useReferenceStore((s) => s.failures);
  const load = useReferenceStore((s) => s.load);

  React.useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  return { status, catalog, failures };
}
