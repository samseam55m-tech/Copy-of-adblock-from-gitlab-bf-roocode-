import { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoogleUser {
  email: string;
  displayName: string;
  photoUrl?: string;
}

interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime?: string;
}

interface UseGoogleDriveReturn {
  /** Currently signed-in user (null when signed out) */
  user: GoogleUser | null;
  /** OAuth access token for the current session */
  accessToken: string | null;
  /** True while any async operation is in progress */
  loading: boolean;
  /** Last error message, cleared on next successful operation */
  error: string | null;

  // Auth
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;

  // Drive helpers - all operate on the hidden appDataFolder
  findVaultFile: () => Promise<string | null>;
  createVaultFile: (jsonString: string) => Promise<string>;
  updateVaultFile: (fileId: string, jsonString: string) => Promise<void>;
  downloadVaultFile: (fileId: string) => Promise<string>;

  // Convenience wrappers
  uploadVaultData: (jsonString: string) => Promise<string>;
  downloadVaultData: () => Promise<string | null>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VAULT_FILENAME = 'vault_data.json';
const DRIVE_API = 'https://www.googleapis.com';
const DRIVE_FILES = `${DRIVE_API}/drive/v3/files`;
const DRIVE_UPLOAD = `${DRIVE_API}/upload/drive/v3/files`;

// Google OAuth client ID from capacitor.config.ts
const GOOGLE_CLIENT_ID =
  '1037717798765-jscjfdk82phc7sju9jkq53157mik4deg.apps.googleusercontent.com';

const SCOPES = 'email profile https://www.googleapis.com/auth/drive.appdata';

// ---------------------------------------------------------------------------
// GIS script loader
// ---------------------------------------------------------------------------

let gsiLoadPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise<void>((resolve, reject) => {
    // Already loaded (e.g. via index.html script tag)
    if (typeof google !== 'undefined' && google.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
}

// ---------------------------------------------------------------------------
// Declare the global `google` namespace so TypeScript is happy
// ---------------------------------------------------------------------------

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
        error_callback?: (error: { type: string; message?: string }) => void;
      }) => { requestAccessToken: () => void };
      revoke: (token: string, done?: () => void) => void;
    };
  };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGoogleDrive(): UseGoogleDriveReturn {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref so Drive helpers always see the latest token without stale closures
  const tokenRef = useRef<string | null>(null);

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  const requireToken = (): string => {
    const t = tokenRef.current;
    if (!t) throw new Error('Not authenticated \u2013 call signIn() first.');
    return t;
  };

  const headers = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const wrap = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        return await fn();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Fetch user profile from the access token
  // -----------------------------------------------------------------------

  const fetchUserProfile = useCallback(async (token: string): Promise<GoogleUser> => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch user profile: ${res.status}`);
    const data = await res.json();
    return {
      email: data.email,
      displayName: data.name ?? data.email,
      photoUrl: data.picture ?? undefined,
    };
  }, []);

  // -----------------------------------------------------------------------
  // Auth - Google Identity Services (GIS) OAuth2 implicit flow
  // -----------------------------------------------------------------------

  const signIn = useCallback(async () => {
    await wrap(async () => {
      await loadGsiScript();

      return new Promise<void>((resolve, reject) => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: async (response) => {
            if (response.error || !response.access_token) {
              reject(new Error(response.error ?? 'Sign-in failed: no access token received.'));
              return;
            }

            const token = response.access_token;
            tokenRef.current = token;
            setAccessToken(token);

            try {
              const profile = await fetchUserProfile(token);
              setUser(profile);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          error_callback: (err) => {
            reject(new Error(err.message ?? 'Google sign-in was cancelled or failed.'));
          },
        });

        // This opens the Google consent popup
        client.requestAccessToken();
      });
    });
  }, [wrap, fetchUserProfile]);

  const signOut = useCallback(async () => {
    await wrap(async () => {
      const token = tokenRef.current;
      if (token) {
        // Revoke the token so the user is fully signed out
        await loadGsiScript();
        google.accounts.oauth2.revoke(token);
      }
      tokenRef.current = null;
      setAccessToken(null);
      setUser(null);
    });
  }, [wrap]);

  // -----------------------------------------------------------------------
  // Drive API - low-level helpers
  // -----------------------------------------------------------------------

  /**
   * Search for `vault_data.json` inside the hidden appDataFolder.
   * Returns the file ID if found, or `null`.
   */
  const findVaultFile = useCallback(async (): Promise<string | null> => {
    return wrap(async () => {
      const token = requireToken();
      const q = encodeURIComponent(
        `name='${VAULT_FILENAME}' and 'appDataFolder' in parents and trashed=false`,
      );
      const res = await fetch(
        `${DRIVE_FILES}?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`,
        { headers: headers(token) },
      );
      if (!res.ok) throw new Error(`Drive list failed: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as { files: DriveFileMetadata[] };
      return data.files.length > 0 ? data.files[0].id : null;
    });
  }, [wrap]);

  /**
   * Create `vault_data.json` in the appDataFolder with the given content.
   * Returns the new file ID.
   */
  const createVaultFile = useCallback(
    async (jsonString: string): Promise<string> => {
      return wrap(async () => {
        const token = requireToken();

        const metadata = {
          name: VAULT_FILENAME,
          parents: ['appDataFolder'],
        };

        // Multipart upload so we can send metadata + content in one request.
        const boundary = '----VaultBoundary';
        const body =
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${jsonString}\r\n` +
          `--${boundary}--`;

        const res = await fetch(
          `${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,modifiedTime`,
          {
            method: 'POST',
            headers: {
              ...headers(token),
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
          },
        );
        if (!res.ok) throw new Error(`Drive create failed: ${res.status} ${await res.text()}`);
        const file = (await res.json()) as DriveFileMetadata;
        return file.id;
      });
    },
    [wrap],
  );

  /**
   * Overwrite the content of an existing file.
   */
  const updateVaultFile = useCallback(
    async (fileId: string, jsonString: string): Promise<void> => {
      await wrap(async () => {
        const token = requireToken();
        const res = await fetch(
          `${DRIVE_UPLOAD}/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              ...headers(token),
              'Content-Type': 'application/json',
            },
            body: jsonString,
          },
        );
        if (!res.ok) throw new Error(`Drive update failed: ${res.status} ${await res.text()}`);
      });
    },
    [wrap],
  );

  /**
   * Download the raw JSON string from a file.
   */
  const downloadVaultFile = useCallback(
    async (fileId: string): Promise<string> => {
      return wrap(async () => {
        const token = requireToken();
        const res = await fetch(
          `${DRIVE_FILES}/${fileId}?alt=media`,
          { headers: headers(token) },
        );
        if (!res.ok) throw new Error(`Drive download failed: ${res.status} ${await res.text()}`);
        return res.text();
      });
    },
    [wrap],
  );

  // -----------------------------------------------------------------------
  // Convenience wrappers
  // -----------------------------------------------------------------------

  /**
   * Upload vault data - creates the file if it doesn't exist, otherwise
   * overwrites it. Returns the file ID.
   */
  const uploadVaultData = useCallback(
    async (jsonString: string): Promise<string> => {
      const existingId = await findVaultFile();
      if (existingId) {
        await updateVaultFile(existingId, jsonString);
        return existingId;
      }
      return createVaultFile(jsonString);
    },
    [findVaultFile, updateVaultFile, createVaultFile],
  );

  /**
   * Download vault data. Returns the JSON string, or `null` if the file
   * doesn't exist yet.
   */
  const downloadVaultData = useCallback(async (): Promise<string | null> => {
    const existingId = await findVaultFile();
    if (!existingId) return null;
    return downloadVaultFile(existingId);
  }, [findVaultFile, downloadVaultFile]);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  return {
    user,
    accessToken,
    loading,
    error,
    signIn,
    signOut,
    findVaultFile,
    createVaultFile,
    updateVaultFile,
    downloadVaultFile,
    uploadVaultData,
    downloadVaultData,
  };
}
