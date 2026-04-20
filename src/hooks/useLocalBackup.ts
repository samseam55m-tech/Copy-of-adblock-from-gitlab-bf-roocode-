import { useCallback, useState } from 'react';
import localforage from 'localforage';
import { useStore } from '../store';

/**
 * Local (file-based) backup hook. Exports the current vault state as a
 * downloadable JSON file and imports a previously exported file back into
 * the app, overwriting local data.
 *
 * This is used as a safe, offline transfer channel between isolated cloud
 * accounts (no cross-contamination through Google Drive).
 */

export type LocalBackupStatus = 'idle' | 'exporting' | 'importing' | 'success' | 'error';

const EXPORT_FILENAME = 'roleplay_vault_backup.json';

export function useLocalBackup() {
  const store = useStore();
  const [status, setStatus] = useState<LocalBackupStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Export: build a JSON blob from the current React context state,
  // create a hidden <a> with a download attribute, click it, then cleanup.
  // -----------------------------------------------------------------------
  const exportVaultToLocal = useCallback(() => {
    setStatus('exporting');
    setLastError(null);
    try {
      const snapshot = {
        cards: store.cards,
        projects: store.projects,
        promptProjects: store.promptProjects,
        tags: store.tags,
        deletedHeaderBlocks: store.deletedHeaderBlocks,
        theme: store.theme,
        exportedAt: Date.now(),
        version: 1,
      };

      const json = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = EXPORT_FILENAME;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();

      // Cleanup on the next tick so the download has time to start
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }, 100);

      setStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[LocalBackup] export failed:', msg);
      setLastError(msg);
      setStatus('error');
    }
  }, [store.cards, store.projects, store.promptProjects, store.tags, store.deletedHeaderBlocks, store.theme]);

  // -----------------------------------------------------------------------
  // Import: read a user-selected File, JSON.parse it, STRICTLY OVERWRITE
  // both localforage and the React context (same behaviour as cloud
  // restoreVaultData).
  // -----------------------------------------------------------------------
  const importVaultFromLocal = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset the input so selecting the same file twice still triggers onChange
      event.target.value = '';

      if (!file) return;

      setStatus('importing');
      setLastError(null);

      try {
        const text = await readFileAsText(file);
        const parsed = JSON.parse(text);

        // Basic shape validation – must be an object with at least a cards array
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.cards)) {
          throw new Error('Invalid backup file: missing cards array.');
        }

        const newState = {
          cards: parsed.cards || [],
          projects: parsed.projects || [],
          promptProjects: parsed.promptProjects || [],
          tags: parsed.tags || [],
          deletedHeaderBlocks: parsed.deletedHeaderBlocks || [],
          theme: parsed.theme || 'dark',
        };

        // Strict overwrite – same pattern as cloud restore
        await localforage.setItem('appState', newState);
        store.replaceState(newState);

        setStatus('success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[LocalBackup] import failed:', msg);
        setLastError(msg);
        setStatus('error');
      }
    },
    [store],
  );

  const resetStatus = useCallback(() => {
    setStatus('idle');
    setLastError(null);
  }, []);

  return {
    status,
    lastError,
    exportVaultToLocal,
    importVaultFromLocal,
    resetStatus,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsText(file);
  });
}
