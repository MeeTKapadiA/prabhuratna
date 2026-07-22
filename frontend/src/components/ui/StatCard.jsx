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
    sky: 'bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20'
  };

  return (
    <div className={`glass-panel p-5 rounded-2xl border border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-start justify-between relative overflow-hidden group hover:border-slate-700 dark:hover:border-slate-700 light:hover:border-slate-300 transition-all ${className}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">{title}</p>
        <h3 className="text-2xl font-extrabold text-slate-100 dark:text-slate-100 light:text-slate-900 mt-1 tracking-tight">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 mt-1">{subtitle}</p>}
        {trend && (
          <span className={`inline-flex items-center text-xs font-semibold mt-2 px-2 py-0.5 rounded-full ${trend.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
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
