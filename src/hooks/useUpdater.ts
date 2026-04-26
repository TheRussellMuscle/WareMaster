import { useCallback, useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'error';

export interface UpdaterState {
  status: UpdaterStatus;
  update: Update | null;
  progress: { downloaded: number; total: number | null };
  error: string | null;
  install: () => Promise<void>;
  dismiss: () => void;
}

export function useUpdater(): UpdaterState {
  const [status, setStatus] = useState<UpdaterStatus>('idle');
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<{ downloaded: number; total: number | null }>({
    downloaded: 0,
    total: null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    let cancelled = false;
    setStatus('checking');

    check()
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setUpdate(result);
          setStatus('available');
        } else {
          setStatus('up-to-date');
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const install = useCallback(async () => {
    if (!update) return;
    setStatus('downloading');
    setError(null);
    try {
      let total: number | null = null;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? null;
          setProgress({ downloaded: 0, total });
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          setProgress({ downloaded, total });
        } else if (event.event === 'Finished') {
          setStatus('installing');
        }
      });
      await relaunch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [update]);

  const dismiss = useCallback(() => {
    setStatus('idle');
    setUpdate(null);
  }, []);

  return { status, update, progress, error, install, dismiss };
}
