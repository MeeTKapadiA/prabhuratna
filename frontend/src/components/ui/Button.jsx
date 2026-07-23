import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C0392B]/40 dark:focus:ring-[#E74C3C]/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-[#C0392B] hover:bg-[#A93226] dark:bg-[#E74C3C] dark:hover:bg-[#EC7063] text-white shadow-lg shadow-[#C0392B]/20 dark:shadow-[#E74C3C]/20',
    secondary: 'bg-[#4A5568] hover:bg-[#374151] dark:bg-[#94A3B8] dark:hover:bg-[#CBD5E1] text-white dark:text-[#121417] border border-[#4A5568] dark:border-[#94A3B8]',
    success: 'bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white shadow-lg shadow-emerald-600/20',
    danger: 'bg-rose-600 hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400 text-white shadow-lg shadow-rose-600/20',
    outline: 'bg-transparent border border-[#C0392B]/50 dark:border-[#E74C3C]/50 hover:bg-[#C0392B]/10 dark:hover:bg-[#E74C3C]/10 text-[#C0392B] dark:text-[#E74C3C]',
    ghost: 'bg-transparent hover:bg-[#E5E7EB] dark:hover:bg-[#2D3138] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F1F1F1]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled || isLoading}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  );
}
