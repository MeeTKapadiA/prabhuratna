import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  footer = null
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content Container */}
      <div className={`relative w-full ${maxWidth} glass-panel border border-slate-200 dark:border-[#2D3138] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 bg-white dark:bg-[#1E2126] text-slate-900 dark:text-[#F1F1F1]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2D3138] bg-[#FAFAF8] dark:bg-[#121417]">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F1F1F1]">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#9CA3AF] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2126] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#2D3138] bg-[#FAFAF8] dark:bg-[#121417]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
