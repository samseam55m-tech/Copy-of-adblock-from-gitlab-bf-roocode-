import { useCallback, useState } from 'react';
import localforage from 'localforage';
import { useGoogleDrive } from './useGoogleDrive';

/**
 * Thin orchestration layer that connects the local `localforage` store
 * (keyed as `'appState'`) with the Google Drive `appDataFolder` via
 * `useGoogleDrive`.
 *
 * Usage:
 *   const { syncStatus, pushToCloud, pullFromCloud, ... } = useCloudSync();
 */

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useCloudSync() {
  const drive = useGoogleDrive();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // -----------------------------------------------------------------------
  // Push local state -> Google Drive
  // -----------------------------------------------------------------------
  const pushToCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const localState = await localforage.getItem('appState');
      if (!localState) throw new Error('No local data to push.');
      const json = JSON.stringify(localState);
      await drive.uploadVaultData(json);
      setSyncStatus('success');
    } catch {
      setSyncStatus('error');
    }
  }, [drive]);

  // -----------------------------------------------------------------------
  // Pull Google Drive -> local state (returns the parsed object so the
  // caller can feed it into React state / StoreProvider).
  // -----------------------------------------------------------------------
  const pullFromCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const json = await drive.downloadVaultData();
      if (!json) {
        setSyncStatus('success');
        return null;
      }
      const parsed = JSON.parse(json);
      // Persist into localforage so the app picks it up on next load
      await localforage.setItem('appState', parsed);
      setSyncStatus('success');
      return parsed;
    } catch {
      setSyncStatus('error');
      return null;
    }
  }, [drive]);

  return {
    /** Re-exported from useGoogleDrive for convenience */
    user: drive.user,
    loading: drive.loading,
    error: drive.error,
    signIn: drive.signIn,
    signOut: drive.signOut,

    /** Sync-specific */
    syncStatus,
    pushToCloud,
    pullFromCloud,
  };
}
