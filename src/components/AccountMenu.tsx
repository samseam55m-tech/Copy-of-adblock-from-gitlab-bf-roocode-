import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  LogOut,
  CloudUpload,
  CloudDownload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { useCloudSync, SyncStatus } from '../hooks/useCloudSync';

// ---------------------------------------------------------------------------
// Inline keyframe styles (injected once)
// ---------------------------------------------------------------------------

const ANIMATION_STYLES = `
@keyframes accountMenuSlideIn {
  from { transform: translateX(100%); opacity: 0.8; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes accountMenuSlideOut {
  from { transform: translateX(0);    opacity: 1; }
  to   { transform: translateX(100%); opacity: 0.8; }
}
@keyframes accountMenuFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes accountMenuFadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes cardStagger {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes avatarRingPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
  50%      { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
}
@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15%      { transform: translateX(-6px); }
  30%      { transform: translateX(6px); }
  45%      { transform: translateX(-4px); }
  60%      { transform: translateX(4px); }
  75%      { transform: translateX(-2px); }
  90%      { transform: translateX(2px); }
}
@keyframes successPulse {
  0%   { transform: scale(0.8); opacity: 0; }
  50%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes gradientRotate {
  0%   { --angle: 0deg; }
  100% { --angle: 360deg; }
}
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = ANIMATION_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ---------------------------------------------------------------------------
// SyncStatusBadge
// ---------------------------------------------------------------------------

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (status === 'idle') return null;

  const config = {
    syncing: { icon: Loader2, text: 'Syncing...', className: 'text-indigo-400 animate-spin', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    success: { icon: CheckCircle2, text: 'Done!', className: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    error:   { icon: AlertCircle, text: 'Failed', className: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  }[status];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} transition-all duration-300`}
      style={{ animation: 'cardStagger 0.3s ease-out both' }}
    >
      <Icon className={`w-4 h-4 ${config.className}`} />
      <span className="text-sm text-gray-300">{config.text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionCard
// ---------------------------------------------------------------------------

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  isSyncing?: boolean;
  variant?: 'default' | 'danger';
  delay?: number;
}

function ActionCard({ icon: Icon, title, subtitle, onClick, disabled, isSyncing, variant = 'default', delay = 0 }: ActionCardProps) {
  const isDanger = variant === 'danger';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border backdrop-blur-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group ${
        isDanger
          ? 'bg-red-950/30 border-red-500/20 hover:bg-red-950/50 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/5'
          : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 hover:shadow-lg hover:shadow-indigo-500/5'
      }`}
      style={{
        animation: `cardStagger 0.4s ease-out ${delay}ms both`,
      }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
        isDanger
          ? 'bg-red-500/15 group-hover:bg-red-500/25 group-hover:scale-110'
          : 'bg-indigo-500/15 group-hover:bg-indigo-500/25 group-hover:scale-110'
      }`}>
        {isSyncing ? (
          <Loader2 className={`w-5 h-5 animate-spin ${isDanger ? 'text-red-400' : 'text-indigo-400'}`} />
        ) : (
          <Icon className={`w-5 h-5 transition-transform duration-300 ${
            isDanger ? 'text-red-400' : 'text-indigo-400'
          }`} />
        )}
      </div>
      <div className="text-left flex-1 min-w-0">
        <span className={`text-sm font-semibold block transition-colors duration-200 ${
          isDanger ? 'text-red-100 group-hover:text-red-50' : 'text-white group-hover:text-white'
        }`}>{title}</span>
        <span className={`text-xs block mt-0.5 transition-colors duration-200 ${
          isDanger ? 'text-red-300/60' : 'text-gray-400 group-hover:text-gray-300'
        }`}>{subtitle}</span>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 ${
        isDanger ? 'bg-red-500/20' : 'bg-white/10'
      }`}>
        <svg className={`w-3 h-3 ${isDanger ? 'text-red-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// DeleteConfirmModal
// ---------------------------------------------------------------------------

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteConfirmModalProps) {
  const [input, setInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const CONFIRM_PHRASE = 'delete Google drive data';
  const isMatch = input === CONFIRM_PHRASE;

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setShaking(false);
      // Focus the input after the entrance animation
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (!isMatch) {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
      return;
    }
    onConfirm();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ animation: 'accountMenuFadeIn 0.2s ease-out both' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden ${
          shaking ? '' : ''
        }`}
        style={{
          animation: shaking
            ? 'shake 0.5s ease-in-out'
            : 'modalEnter 0.35s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Red warning header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border-b border-red-500/30">
          <div className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.15), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s linear infinite',
            }}
          />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-50">Delete Cloud Data</h3>
              <p className="text-xs text-red-300/70 mt-0.5">This action is irreversible</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            This will <span className="font-semibold text-red-400">permanently delete</span> your
            vault backup from Google Drive. Your local data will remain untouched, but the cloud
            copy will be gone forever and cannot be recovered.
          </p>

          <div className="bg-red-950/20 border border-red-500/15 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-2.5">
              To confirm, type <span className="font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{CONFIRM_PHRASE}</span> below:
            </p>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={CONFIRM_PHRASE}
              disabled={isDeleting}
              className="w-full px-3.5 py-2.5 rounded-lg bg-gray-800/80 border border-gray-600/50 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-200 disabled:opacity-50 font-mono"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isMatch || isDeleting}
            className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              isMatch
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 active:scale-[0.97]'
                : 'bg-red-600/20 text-red-400/50 cursor-not-allowed opacity-50'
            }`}
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Confirm Delete
              </span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// AccountMenu
// ---------------------------------------------------------------------------

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const {
    user, loading, error, signIn, signOut,
    syncStatus, pushToCloud, pullFromCloud, deleteCloudData,
  } = useCloudSync();

  // Inject animation keyframes once
  useEffect(() => { injectStyles(); }, []);

  // Combine both error sources so the UI always shows the real message
  const displayError = error || signInError;
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
      if (e.key === 'Escape' && !isDeleteModalOpen) setOpen(false);
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isDeleteModalOpen]);

  // Auto-clear delete success message
  useEffect(() => {
    if (!deleteSuccess) return;
    const timer = setTimeout(() => setDeleteSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [deleteSuccess]);

  const handleSignIn = useCallback(async () => {
    setSignInError(null);
    try {
      await signIn();
    } catch (err: unknown) {
      let msg: string;
      try {
        if (err instanceof Error) {
          msg = err.message + (err.stack ? '\n\nStack: ' + err.stack : '');
        } else if (typeof err === 'string') {
          msg = err;
        } else {
          msg = JSON.stringify(err, null, 2) || String(err);
        }
      } catch {
        msg = 'Error could not be serialized: ' + Object.prototype.toString.call(err);
      }
      window.alert('[DEBUG] handleSignIn caught:\n' + msg);
      setSignInError(msg);
    }
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

  const handleDeleteConfirm = useCallback(async () => {
    await deleteCloudData();
    setIsDeleteModalOpen(false);
    setDeleteSuccess(true);
  }, [deleteCloudData]);

  const overlay = (
    <div
      className={`fixed inset-0 z-[9999] isolate ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
        style={{
          animation: open ? 'accountMenuFadeIn 0.3s ease-out both' : 'accountMenuFadeOut 0.25s ease-in both',
        }}
      />

      {/* Sliding Overlay Panel */}
      <div
        className="account-menu-panel fixed inset-y-0 right-0 w-full max-w-sm bg-gray-900/95 backdrop-blur-xl z-[10000] flex flex-col shadow-2xl border-l border-gray-800/50"
        style={{
          paddingTop: 'var(--safe-top)',
          paddingBottom: 'var(--safe-bottom)',
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          animation: open
            ? 'accountMenuSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both'
            : 'accountMenuSlideOut 0.3s cubic-bezier(0.4,0,1,1) both',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 shrink-0 bg-gray-900/50 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-white tracking-tight">Account</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-2 -mr-2 hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-90"
            aria-label="Close account menu"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>

          {user ? (
            <div className="flex flex-col items-center text-center pt-4 pb-2">
              {/* Avatar with animated gradient ring */}
              <div
                className="relative w-22 h-22 rounded-full p-[3px] mb-4"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7, #6366f1)',
                  backgroundSize: '300% 300%',
                  animation: 'avatarRingPulse 3s ease-in-out infinite',
                  width: '88px',
                  height: '88px',
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">{user.displayName}</h3>
              <p className="text-sm text-gray-400 mt-1 font-mono">{user.email}</p>

              <button
                onClick={handleSignOut}
                disabled={loading}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-700/50 bg-gray-800/30 text-gray-400 hover:bg-white/10 hover:text-white hover:border-gray-600/50 transition-all duration-300 disabled:opacity-50 active:scale-[0.97]"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center pt-8 pb-4">
              <div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 flex items-center justify-center mb-5"
                style={{ animation: 'cardStagger 0.4s ease-out both' }}
              >
                <User className="w-10 h-10 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm mb-6 max-w-[240px] leading-relaxed">
                Sign in with your Google account to back up and restore your vault data across devices.
              </p>

              {displayError && (
                <div
                  className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 max-w-[280px] backdrop-blur-sm"
                  style={{ animation: 'cardStagger 0.3s ease-out both' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 text-xs text-left break-all">{displayError}</p>
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={loading}
                className="relative flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.97] transition-all duration-300 disabled:opacity-50"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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

          {user && (
            <>
              {/* Section divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-gray-900/95 px-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Cloud Sync</span>
                </div>
              </div>

              {/* Action Cards */}
              <div className="space-y-3">
                <ActionCard
                  icon={CloudUpload}
                  title="Backup to Cloud"
                  subtitle="Upload your vault to Google Drive"
                  onClick={handleBackup}
                  disabled={isSyncing}
                  isSyncing={isSyncing && syncStatus === 'syncing'}
                  delay={0}
                />

                <ActionCard
                  icon={CloudDownload}
                  title="Restore from Cloud"
                  subtitle="Download your vault from Google Drive"
                  onClick={handleRestore}
                  disabled={isSyncing}
                  isSyncing={isSyncing && syncStatus === 'syncing'}
                  delay={80}
                />

                <ActionCard
                  icon={Trash2}
                  title="Delete Cloud Data"
                  subtitle="Permanently erase your remote backup"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={isSyncing}
                  variant="danger"
                  delay={160}
                />

                {/* Status badge */}
                <div className="px-1 pt-1">
                  <SyncStatusBadge status={syncStatus} />
                </div>

                {/* Delete success message */}
                {deleteSuccess && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                    style={{ animation: 'successPulse 0.5s ease-out both' }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-300">Cloud data deleted successfully</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800/60 shrink-0 bg-gray-900/50 backdrop-blur-md">
          <p className="text-xs text-gray-600 text-center">
            Your data is stored privately in your Google Drive.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Trigger: Profile Avatar stays in the header */}
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 border-gray-700/50 hover:border-indigo-500/70 transition-all duration-300 ml-auto hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95"
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
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
        )}
      </button>

      {/* Portal: render overlay on document.body to escape header stacking context */}
      {createPortal(overlay, document.body)}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isSyncing}
      />
    </>
  );
}
