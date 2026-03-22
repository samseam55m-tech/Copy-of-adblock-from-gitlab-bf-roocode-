import { useState, useEffect, useCallback } from 'react';
import { X, User, LogOut, CloudUpload, CloudDownload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCloudSync, SyncStatus } from '../hooks/useCloudSync';

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (status === 'idle') return null;

  const config = {
    syncing: { icon: Loader2, text: 'Syncing...', className: 'text-accent animate-spin' },
    success: { icon: CheckCircle2, text: 'Done!', className: 'text-green-500' },
    error: { icon: AlertCircle, text: 'Failed', className: 'text-red-500' },
  }[status];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 mt-2 text-sm">
      <Icon className={`w-4 h-4 ${config.className}`} />
      <span className="text-text-muted">{config.text}</span>
    </div>
  );
}

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const { user, loading, signIn, signOut, syncStatus, pushToCloud, pullFromCloud } = useCloudSync();

  const isSyncing = syncStatus === 'syncing';

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSignIn = useCallback(async () => {
    await signIn();
  }, [signIn]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handleBackup = useCallback(async () => {
    if (isSyncing) return;
    await pushToCloud();
  }, [isSyncing, pushToCloud]);

  const handleRestore = useCallback(async () => {
    if (isSyncing) return;
    await pullFromCloud();
  }, [isSyncing, pullFromCloud]);

  return (
    <>
      {/* Trigger: Profile Avatar in the header */}
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 border-border-main hover:border-accent transition-colors ml-auto"
        aria-label="Open account menu"
      >
        {user?.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={user.displayName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-bg-surface-hover flex items-center justify-center">
            <User className="w-5 h-5 text-text-muted" />
          </div>
        )}
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[70] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Sliding Overlay Panel (from right) */}
      <div
        className={`account-menu-panel fixed inset-y-0 right-0 w-full max-w-sm bg-bg-main z-[80] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-main shrink-0">
          <h2 className="text-lg font-semibold">Account</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 hover:bg-bg-surface-hover rounded-xl transition-colors"
            aria-label="Close account menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Profile Section */}
          {user ? (
            <div className="flex flex-col items-center text-center pt-4 pb-2">
              {/* Large Avatar */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-accent mb-4 shadow-lg">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-bg-surface-hover flex items-center justify-center">
                    <User className="w-10 h-10 text-text-muted" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-text-main">{user.displayName}</h3>
              <p className="text-sm text-text-muted mt-1">{user.email}</p>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-main text-text-muted hover:bg-bg-surface-hover hover:text-text-main transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center pt-8 pb-4">
              <div className="w-20 h-20 rounded-full bg-bg-surface-hover flex items-center justify-center mb-5">
                <User className="w-10 h-10 text-text-muted" />
              </div>
              <p className="text-text-muted text-sm mb-6 max-w-[240px]">
                Sign in with your Google account to back up and restore your vault data across devices.
              </p>
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-accent text-white font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".8" />
                    <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".6" />
                    <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".4" />
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {/* Divider */}
          {user && (
            <>
              <div className="border-t border-border-main" />

              {/* Cloud Sync Controls */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">Cloud Sync</h4>

                {/* Backup Button */}
                <button
                  onClick={handleBackup}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-bg-surface hover:bg-bg-surface-hover transition-colors disabled:opacity-50 group"
                >
                  {isSyncing ? (
                    <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />
                  ) : (
                    <CloudUpload className="w-5 h-5 text-accent shrink-0 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="text-left">
                    <span className="text-sm font-semibold text-text-main block">Backup to Cloud</span>
                    <span className="text-xs text-text-muted">Upload your vault to Google Drive</span>
                  </div>
                </button>

                {/* Restore Button */}
                <button
                  onClick={handleRestore}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-bg-surface hover:bg-bg-surface-hover transition-colors disabled:opacity-50 group"
                >
                  {isSyncing ? (
                    <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />
                  ) : (
                    <CloudDownload className="w-5 h-5 text-accent shrink-0 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="text-left">
                    <span className="text-sm font-semibold text-text-main block">Restore from Cloud</span>
                    <span className="text-xs text-text-muted">Download your vault from Google Drive</span>
                  </div>
                </button>

                {/* Sync Status */}
                <div className="px-1">
                  <SyncStatusBadge status={syncStatus} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-main shrink-0">
          <p className="text-xs text-text-muted text-center">
            Your data is stored privately in your Google Drive.
          </p>
        </div>
      </div>
    </>
  );
}
