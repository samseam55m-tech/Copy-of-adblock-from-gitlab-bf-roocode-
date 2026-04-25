import React, { useCallback, useState } from 'react';
import localforage from 'localforage';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useStore } from '../store';

/**
 * Local (file-based) backup hook. Exports the current vault state as a
 * JSON file using native Capacitor plugins, and imports a previously
 * exported file back into the app, overwriting local data.
 *
 * Export pipeline:
 *   1. Stringify the React Context snapshot.
 *   2. Filesystem.writeFile -> writes natively to Directory.Cache.
 *      (Cache dir bypasses Android 11+ scoped-storage permission issues.)
 *   3. Share.share() -> opens the native Android share sheet so the user
 *      can pick "Save to device", "Save to Files", Drive, etc.
 *
 * Import pipeline (unchanged): file picker -> FileReader -> JSON.parse ->
 * strict overwrite of localforage + React context.
 */

export type LocalBackupStatus = 'idle' | 'exporting' | 'importing' | 'success' | 'error';

const EXPORT_FILENAME = 'roleplay_vault_backup.json';

export function useLocalBackup() {
  const store = useStore();
  const [status, setStatus] = useState<LocalBackupStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Export: native write via Capacitor Filesystem + Share sheet
  // -----------------------------------------------------------------------
  const exportVaultToLocal = useCallback(async () => {
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

      // Write to the app's cache directory. This avoids Android 11+
      // scoped-storage permission prompts entirely.
      const writeResult = await Filesystem.writeFile({
        path: EXPORT_FILENAME,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Hand the native file URI to the OS share sheet so the user can
      // pick where to save it (Files app, Drive, email, etc.).
      await Share.share({
        title: 'Export Roleplay Vault',
        url: writeResult.uri,
        dialogTitle: 'Save Vault Backup',
      });

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
