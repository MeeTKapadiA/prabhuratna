import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({
  isOpen,
  onClose,
  type = 'success', // 'success', 'error', 'warning', 'info'
  message,
  duration = 4000
}) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-sky-400" />
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100',
    error: 'border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100',
    warning: 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100',
    info: 'border-[#C0392B]/30 bg-red-50 dark:bg-[#E74C3C]/10 text-[#1A1A1A] dark:text-[#F1F1F1]'
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className={`flex items-center gap-3 px-4 py-3 border rounded-xl shadow-xl backdrop-blur-md ${borders[type]}`}>
        {icons[type]}
        <span className="text-sm font-medium pr-2">{message}</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
