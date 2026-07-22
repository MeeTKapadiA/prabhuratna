import React from 'react';

export default function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  options = [],
  icon: Icon = null,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <Icon className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-[#9CA3AF] pointer-events-none" />
        )}
        
        {type === 'select' ? (
          <select
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-4 py-2.5 bg-white dark:bg-[#1E2126] border ${error ? 'border-rose-500' : 'border-slate-300 dark:border-[#2D3138]'} rounded-xl text-sm text-slate-900 dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C] transition-all duration-200 disabled:opacity-50`}
            {...props}
          >
            {options.map((opt, idx) => (
              <option key={idx} value={opt.value !== undefined ? opt.value : opt} className="bg-white dark:bg-[#1E2126] text-slate-900 dark:text-[#F1F1F1]">
                {opt.label || opt}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className={`w-full p-3 bg-white dark:bg-[#1E2126] border ${error ? 'border-rose-500' : 'border-slate-300 dark:border-[#2D3138]'} rounded-xl text-sm text-slate-900 dark:text-[#F1F1F1] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C] transition-all duration-200 disabled:opacity-50`}
            {...props}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-4 py-2.5 bg-white dark:bg-[#1E2126] border ${error ? 'border-rose-500' : 'border-slate-300 dark:border-[#2D3138]'} rounded-xl text-sm text-slate-900 dark:text-[#F1F1F1] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C] transition-all duration-200 disabled:opacity-50`}
            {...props}
          />
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
