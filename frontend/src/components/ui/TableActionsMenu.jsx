import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export default function TableActionsMenu({ actions = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1.5 rounded-lg border border-slate-300 dark:border-[#2D3138] hover:bg-slate-100 dark:hover:bg-[#1E2126] text-slate-600 dark:text-[#F1F1F1] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
        aria-label="Actions Menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-48 rounded-xl bg-white dark:bg-[#1E2126] border border-slate-200 dark:border-[#2D3138] shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-[#2D3138]/60">
          <div className="py-1">
            {actions.map((act, idx) => {
              if (act.hidden) return null;
              const Icon = act.icon;
              const isDanger = act.variant === 'danger';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    if (act.onClick) act.onClick();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isDanger
                      ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400'
                      : 'text-slate-700 dark:text-[#F1F1F1] hover:bg-slate-100 dark:hover:bg-[#121417]'
                  }`}
                >
                  {Icon && <Icon className={`w-4 h-4 ${isDanger ? 'text-rose-500' : 'text-slate-500 dark:text-[#9CA3AF]'}`} />}
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
