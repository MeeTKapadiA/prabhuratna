import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'sky',
  className = ''
}) {
  const colors = {
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
  };

  return (
    <div className={`glass-panel p-5 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] flex items-start justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm ${className}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9CA3AF]">{title}</p>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-[#F1F1F1] mt-1 tracking-tight">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-1">{subtitle}</p>}
        {trend && (
          <span className={`inline-flex items-center text-xs font-semibold mt-2 px-2 py-0.5 rounded-full ${
            trend.isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {trend.isPositive ? '↑' : '↓'} {trend.text}
          </span>
        )}
      </div>

      {Icon && (
        <div className={`p-3 rounded-xl border ${colors[color] || colors.sky} transition-transform group-hover:scale-110 duration-200`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
