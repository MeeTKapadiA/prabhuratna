import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search by barcode, name, SKU...',
  className = '',
  autoFocus = false
}) {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-[#9CA3AF] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] rounded-xl text-sm text-slate-900 dark:text-[#F1F1F1] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C] transition-all duration-200"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#121417] text-slate-400 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
