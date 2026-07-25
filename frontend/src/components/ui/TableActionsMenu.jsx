import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export default function TableActionsMenu({ actions = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const visibleActionsCount = actions.filter((a) => !a.hidden).length;
      const estimatedMenuHeight = visibleActionsCount * 38 + 16;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top = rect.bottom + 6;
      if (spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight) {
        top = rect.top - estimatedMenuHeight - 6;
      }

      const left = Math.min(Math.max(10, rect.left), window.innerWidth - 200);

      setMenuPosition({ top, left });
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    function handleScrollOrClickOutside(event) {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScroll() {
      if (isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleScrollOrClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleScrollOrClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-lg border border-slate-300 dark:border-[#2D3138] hover:bg-slate-100 dark:hover:bg-[#1E2126] text-slate-600 dark:text-[#F1F1F1] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
        aria-label="Actions Menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
          className="fixed w-48 rounded-xl bg-white dark:bg-[#1E2126] border border-slate-200 dark:border-[#2D3138] shadow-2xl z-[9999] py-1.5 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-[#2D3138]/60"
        >
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
