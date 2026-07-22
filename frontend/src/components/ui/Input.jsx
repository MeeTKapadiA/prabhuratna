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
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <Icon className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
        
        {type === 'select' ? (
          <select
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-4 py-2.5 bg-slate-800/80 dark:bg-slate-800/80 light:bg-white border ${error ? 'border-rose-500' : 'border-slate-700 dark:border-slate-700 light:border-slate-300'} rounded-xl text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all duration-200 disabled:opacity-50`}
            {...props}
          >
            {options.map((opt, idx) => (
              <option key={idx} value={opt.value !== undefined ? opt.value : opt} className="bg-slate-900 dark:bg-slate-900 light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900">
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
            className={`w-full p-3 bg-slate-800/80 dark:bg-slate-800/80 light:bg-white border ${error ? 'border-rose-500' : 'border-slate-700 dark:border-slate-700 light:border-slate-300'} rounded-xl text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all duration-200 disabled:opacity-50`}
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
            className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-4 py-2.5 bg-slate-800/80 dark:bg-slate-800/80 light:bg-white border ${error ? 'border-rose-500' : 'border-slate-700 dark:border-slate-700 light:border-slate-300'} rounded-xl text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all duration-200 disabled:opacity-50`}
            {...props}
          />
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
