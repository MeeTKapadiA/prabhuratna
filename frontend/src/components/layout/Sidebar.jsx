import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAccessibleNavItems } from '../../config/navConfig';
import { ShieldCheck, X } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed }) {
  const { user, isAdmin, hasPermission } = useAuth();

  // Dynamically filter navigation items from navConfig
  const navItems = getAccessibleNavItems(user, hasPermission);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#121417]/70 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`
          fixed lg:static top-16 left-0 bottom-0 z-40 glass-panel border-r border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] flex flex-col justify-between transition-all duration-300 ease-in-out shadow-xs
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9CA3AF]">
            {!isCollapsed && <span>Navigation Menu</span>}
            <button onClick={onClose} className="lg:hidden p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={isCollapsed ? item.label : ''}
                className={({ isActive }) => `
                  flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                  ${isActive
                    ? 'bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 text-[#C0392B] dark:text-[#E74C3C] border border-[#C0392B]/30 dark:border-[#E74C3C]/30 shadow-xs font-bold'
                    : 'text-slate-700 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-[#F1F1F1] hover:bg-slate-100 dark:hover:bg-[#121417]'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Role Badge */}
        {!isCollapsed && (
          <div className="p-4 border-t border-slate-200 dark:border-[#2D3138] bg-[#FAFAF8] dark:bg-[#121417]">
            <div className="p-3 rounded-xl bg-white dark:bg-[#1E2126] border border-slate-200 dark:border-[#2D3138] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900 dark:text-[#F1F1F1] truncate">{user?.name || 'User'}</p>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  isAdmin ? 'bg-[#C0392B] text-white' : 'bg-slate-700 text-white'
                }`}>
                  {user?.role || 'Staff'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Authorized POS Session
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
