import { useCallback, useState } from 'react';
import localforage from 'localforage';
import { useGoogleDrive } from './useGoogleDrive';

/**
 * Thin orchestration layer that connects the local `localforage` store
 * (keyed as `'appState'`) with the Google Drive `appDataFolder` via
 * `useGoogleDrive`.
 *
 * Usage:
 *   const { syncStatus, pushToCloud, pullFromCloud, deleteCloudData, ... } = useCloudSync();
 */

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Merge helpers – deduplicate arrays of objects by `id`, preferring the
// entry with the most recent `updatedAt` (or `createdAt`) timestamp.
// ---------------------------------------------------------------------------

function mergeById<T extends { id: string; updatedAt?: number; createdAt?: number }>(
  local: T[],
  cloud: T[],
): T[] {
  const map = new Map<string, T>();

  // Seed with local entries
  for (const item of local) {
    map.set(item.id, item);
  }

  // Overlay cloud entries, keeping the newer version when both exist
  for (const item of cloud) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTs = (existing.updatedAt ?? existing.createdAt) || 0;
      const incomingTs = (item.updatedAt ?? item.createdAt) || 0;
      if (incomingTs >= existingTs) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values());
}

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[CloudSync] pushToCloud failed:', msg);
      setSyncStatus('error');
    }
  }, [drive]);

  // -----------------------------------------------------------------------
  // Pull Google Drive -> merge with local -> persist & return merged data
  // The caller MUST use the returned object to update React state so the
  // UI refreshes instantly.
  // -----------------------------------------------------------------------
  const pullFromCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const json = await drive.downloadVaultData();
      if (!json) {
        setSyncStatus('success');
        return null;
      }
      const cloudState = JSON.parse(json) as Record<string, unknown>;

      // Fetch current local state for merging
      const localState = (await localforage.getItem('appState') || {}) as Record<string, unknown>;

      // Merge each collection by ID, keeping the newer version of each item
      const merged = {
        cards: mergeById(
          (localState.cards || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
          (cloudState.cards || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
        ),
        projects: mergeById(
          (localState.projects || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
          (cloudState.projects || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
        ),
        promptProjects: mergeById(
          (localState.promptProjects || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
          (cloudState.promptProjects || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
        ),
        tags: mergeById(
          (localState.tags || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
          (cloudState.tags || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
        ),
        deletedHeaderBlocks: mergeById(
          (localState.deletedHeaderBlocks || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
          (cloudState.deletedHeaderBlocks || []) as Array<{ id: string; updatedAt?: number; createdAt?: number }>,
        ),
        // For scalar values, prefer cloud
        theme: (cloudState.theme as string) || (localState.theme as string) || 'dark',
      };

      // Persist merged state into localforage
      await localforage.setItem('appState', merged);
      setSyncStatus('success');
      return merged;
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

  return {
    /** Re-exported from useGoogleDrive for convenience */
    user: drive.user,
    loading: drive.loading,
    error: drive.error,
    restoring: drive.restoring,
    signIn: drive.signIn,
    signOut: drive.signOut,

    /** Sync-specific */
    syncStatus,
    pushToCloud,
    pullFromCloud,
    deleteCloudData,
  };
}
