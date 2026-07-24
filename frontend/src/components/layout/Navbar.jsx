import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ShoppingCart, LogOut, Clock, Menu, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ toggleSidebar, isSidebarCollapsed, toggleSidebarCollapse }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] sticky top-0 z-50 px-4 sm:px-6 flex items-center justify-between flex-nowrap transition-colors shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-[#F1F1F1] hover:bg-slate-100 dark:hover:bg-[#121417]"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleSidebarCollapse}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="hidden lg:flex p-2 rounded-xl text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-[#F1F1F1] hover:bg-slate-100 dark:hover:bg-[#121417] transition-colors"
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>

        <Link to="/app/dashboard" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Prabhuratna Metals Logo"
            className="w-9 h-9 object-contain rounded-xl bg-white p-0.5 border border-slate-200 dark:border-[#2D3138] flex-shrink-0 shadow-sm"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-900 dark:text-[#F1F1F1] leading-none">PRABHURATNA</h1>
            <p className="text-[10px] text-[#C0392B] dark:text-[#E74C3C] font-bold tracking-wider uppercase">ERP & Billing POS</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138] text-xs text-slate-700 dark:text-[#9CA3AF] font-mono">
          <Clock className="w-3.5 h-3.5 text-[#C0392B] dark:text-[#E74C3C]" />
          <span>{time}</span>
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] hover:bg-slate-200 dark:hover:bg-[#2D3138] text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-[#2D3138] transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#4A5568]" />}
        </button>

        {/* Quick POS Billing CTA */}
        <Link
          to="/app/billing"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] hover:bg-[#A93226] text-white font-semibold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Quick POS Billing</span>
        </Link>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-[#2D3138]">
          <div className="text-right hidden xl:block">
            <p className="text-xs font-semibold text-slate-900 dark:text-[#F1F1F1]">{user?.name || 'Admin User'}</p>
            <p className="text-[10px] text-slate-500 dark:text-[#9CA3AF] capitalize">{user?.role || 'Store Manager'}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            title="Log Out"
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
