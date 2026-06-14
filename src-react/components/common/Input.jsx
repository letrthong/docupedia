import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  className = '',
  type = 'text',
  ...props
}, ref) => {
  const baseStyles = 'w-full px-4 py-2.5 border rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:disabled:bg-slate-900 text-slate-900 placeholder:text-slate-400';
  const errorStyles = error ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600';

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`${baseStyles} ${errorStyles}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
