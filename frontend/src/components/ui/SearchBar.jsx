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
      <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-9 py-2.5 bg-slate-800/80 dark:bg-slate-800/80 light:bg-white border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded-xl text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all duration-200"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 p-1 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-slate-200 text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
