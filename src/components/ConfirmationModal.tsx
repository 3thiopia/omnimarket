import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false
}: ConfirmationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${
                  type === 'danger' ? 'bg-red-50 text-red-500' : 
                  type === 'warning' ? 'bg-orange-50 text-orange-500' : 
                  'bg-blue-50 text-blue-500'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={isLoading}
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{message}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
                  disabled={isLoading}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-6 py-4 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
                    type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 
                    type === 'warning' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 
                    'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
