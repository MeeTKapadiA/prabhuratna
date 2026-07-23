import React from 'react';

export default function Badge({
  children,
  variant = 'info', // 'success', 'danger', 'warning', 'info', 'neutral'
  size = 'md',
  className = ''
}) {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    info: 'bg-[#C0392B]/10 text-[#C0392B] dark:bg-[#E74C3C]/10 dark:text-[#E74C3C] border-[#C0392B]/20 dark:border-[#E74C3C]/20',
    neutral: 'bg-[#E5E7EB] text-[#6B7280] border-[#E5E7EB] dark:bg-[#2D3138] dark:text-[#9CA3AF] dark:border-[#2D3138]'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
