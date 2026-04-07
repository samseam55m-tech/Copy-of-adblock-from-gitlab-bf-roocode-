import { useCallback, useState } from 'react';
import localforage from 'localforage';
import { useGoogleDrive } from './useGoogleDrive';

/**
 * Thin orchestration layer that connects the local `localforage` store
 * (keyed as `'appState'`) with the Google Drive `appDataFolder` via
 * `useGoogleDrive`.
 *
 * Architecture:
 * - Restore = strict overwrite (cloud replaces local entirely)
 * - Sign-out = wipe local data to prevent cross-account bleeding
 * - Backup = find-then-PATCH (no duplicate files)
 *
 * Usage:
 *   const { syncStatus, pushToCloud, pullFromCloud, deleteCloudData, ... } = useCloudSync();
 */

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useCloudSync() {
  const drive = useGoogleDrive();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // -----------------------------------------------------------------------
  // Push local state -> Google Drive
  // The underlying uploadVaultData already does findVaultFile() first:
  //   - If file exists -> PATCH (overwrite in place, no duplication)
  //   - If file is null -> POST (create new)
  // -----------------------------------------------------------------------
  const pushToCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const localState = await localforage.getItem('appState');
      if (!localState) throw new Error('No local data to push.');
      const json = JSON.stringify(localState);
      await drive.uploadVaultData(json);
      setSyncStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[CloudSync] pushToCloud failed:', msg);
      setSyncStatus('error');
    }
  }, [drive]);

  // -----------------------------------------------------------------------
  // Pull Google Drive -> STRICT OVERWRITE local
  // No merging. The cloud JSON completely replaces localforage and the
  // caller MUST use the returned object to call replaceState() so the
  // React context updates instantly.
  // -----------------------------------------------------------------------
  const pullFromCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const json = await drive.downloadVaultData();
      if (!json) {
        setSyncStatus('success');
        return null;
      }
      const cloudState = JSON.parse(json);

      // Strict overwrite: cloud data completely replaces local
      await localforage.setItem('appState', cloudState);
      setSyncStatus('success');
      return cloudState;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[CloudSync] pullFromCloud failed:', msg);
      setSyncStatus('error');
      return null;
    }
  }, [drive]);

  // -----------------------------------------------------------------------
  // Delete vault data from Google Drive
  // -----------------------------------------------------------------------
  const deleteCloudData = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      await drive.deleteVaultData();
      setSyncStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[CloudSync] deleteCloudData failed:', msg);
      setSyncStatus('error');
    }
  }, [drive]);

  // -----------------------------------------------------------------------
  // Sign out: clear Google auth + wipe local data
  // The caller MUST also call clearState() on the store to reset React
  // context, preventing Account A's data from bleeding into Account B.
  // -----------------------------------------------------------------------
  const signOutAndWipe = useCallback(async () => {
    await drive.signOut();
    // Wipe localforage so no data remains for the next account
    await localforage.removeItem('appState');
  }, [drive]);

  return {
    /** Re-exported from useGoogleDrive for convenience */
    user: drive.user,
    loading: drive.loading,
    error: drive.error,
    restoring: drive.restoring,
    signIn: drive.signIn,

    /** Sign out + wipe local data (replaces plain signOut) */
    signOutAndWipe,

    /** Sync-specific */
    syncStatus,
    pushToCloud,
    pullFromCloud,
    deleteCloudData,
  };
}
