import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            onClick={onCancel}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-bg-surface border border-border-main rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: 'var(--surface-elevation-3)' }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 rounded-2xl shrink-0 ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-text-main mb-1">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-bg-surface-hover hover:text-text-main transition-colors"
              >
                {cancelText}
              </button>
              <button 
                onClick={onConfirm}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isDestructive 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-accent text-white hover:opacity-90'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
