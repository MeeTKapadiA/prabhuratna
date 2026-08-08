import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAccessibleNavSections } from '../../config/navConfig';
import { ShieldCheck, X, ChevronDown, ChevronRight } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed }) {
  const { user, isAdmin, hasPermission } = useAuth();
  const location = useLocation();

  // Get accessible sections and items
  const navSections = getAccessibleNavSections(user, hasPermission);

  // State to track collapsed sections (default: all open)
  const [openSections, setOpenSections] = useState({
    sales: true,
    stock: true,
    admin: true
  });

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-x-0 top-16 bottom-0 bg-[#121417]/70 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`
          fixed lg:relative lg:top-auto top-16 left-0 bottom-0 z-40 glass-panel border-r border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] flex flex-col justify-between shadow-xs
          shrink-0 h-[calc(100dvh-4rem)] lg:h-full overflow-hidden overscroll-contain
          transition-[width,transform] duration-300 ease-in-out
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-3 space-y-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 custom-scrollbar overscroll-contain touch-pan-y">
          <div className="flex items-center justify-end px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9CA3AF]">
            <button onClick={onClose} className="lg:hidden p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {navSections.map((section) => {
            const isSectionOpen = openSections[section.id] ?? true;
            const hasActiveChild = section.items.some((item) => location.pathname.startsWith(item.path));

            return (
              <div key={section.id} className="space-y-1">
                {/* Section Header (collapsible) */}
                {section.title && !isCollapsed && (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#9CA3AF] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className={hasActiveChild ? 'text-[#C0392B] dark:text-[#E74C3C] font-black' : ''}>
                      {section.title}
                    </span>
                    {isSectionOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Section Items */}
                {(isSectionOpen || isCollapsed || !section.title) && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={onClose}
                          title={isCollapsed ? item.label : ''}
                          className={({ isActive }) => `
                            flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2 rounded-xl font-medium text-sm transition-all duration-200
                            ${isActive
                              ? 'bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 text-[#C0392B] dark:text-[#E74C3C] border border-[#C0392B]/30 dark:border-[#E74C3C]/30 shadow-xs font-bold'
                              : 'text-slate-700 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-[#F1F1F1] hover:bg-slate-100 dark:hover:bg-[#121417]'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {!isCollapsed && <span className="truncate text-xs">{item.label}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Role Badge */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-200 dark:border-[#2D3138] bg-[#FAFAF8] dark:bg-[#121417]">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1E2126] border border-slate-200 dark:border-[#2D3138] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900 dark:text-[#F1F1F1] truncate">{user?.name || 'User'}</p>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  isAdmin ? 'bg-[#C0392B] text-white' : 'bg-slate-700 text-white'
                }`}>
                  {user?.role || 'Staff'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-[#9CA3AF] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Authorized POS Session
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
