import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Boxes,
  TrendingUp,
  BarChart3,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose, isCollapsed }) {
  const navItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'POS Billing', path: '/app/billing', icon: ShoppingCart },
    { label: 'Products', path: '/app/products', icon: Package },
    { label: 'Quotations', path: '/app/quotations', icon: FileText },
    { label: 'Inventory Track', path: '/app/inventory', icon: Boxes },
    { label: 'Profit Analytics', path: '/app/profit-margin', icon: TrendingUp },
    { label: 'Reports & Export', path: '/app/reports', icon: BarChart3 }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`
          fixed lg:static top-16 left-0 bottom-0 z-40 glass-panel border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {!isCollapsed && <span>Main Menu</span>}
            <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white">
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
                    ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Badge */}
        {!isCollapsed && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-xs">
              <p className="font-semibold text-slate-900 dark:text-slate-200">Prabhuratna Metals</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Status: <span className="text-emerald-500 font-medium">Online</span></p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
