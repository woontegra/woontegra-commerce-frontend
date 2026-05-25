import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:       string;
  error?:       string;
  hint?:        string;
  helperText?:  string;
  fullWidth?:   boolean;
  icon?:        React.ReactNode;
  suffix?:      React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  helperText,
  fullWidth: _fullWidth,
  icon,
  suffix,
  className = '',
  ...props
}, ref) => {
  const resolvedHint = hint ?? helperText;
  return (
    <div className="w-full">
      {label && <label className="wn-label">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`wn-input ${icon ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''} ${
            error ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : ''
          } ${className}`}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {resolvedHint && !error && <p className="mt-1.5 text-xs text-slate-600">{resolvedHint}</p>}
    </div>
  );
});

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?:  string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, hint, className = '', ...props
}, ref) => (
  <div className="w-full">
    {label && <label className="wn-label">{label}</label>}
    <textarea
      ref={ref}
      className={`wn-input resize-y min-h-[100px] ${
        error ? 'border-red-500/50 focus:border-red-500' : ''
      } ${className}`}
      {...props}
    />
    {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    {hint && !error && <p className="mt-1.5 text-xs text-slate-600">{hint}</p>}
  </div>
));

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?:  string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, hint, className = '', children, ...props
}, ref) => (
  <div className="w-full">
    {label && <label className="wn-label">{label}</label>}
    <select
      ref={ref}
      className={`wn-select ${error ? 'border-red-500/50' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    {hint && !error && <p className="mt-1.5 text-xs text-slate-600">{hint}</p>}
  </div>
));

Select.displayName = 'Select';

export default Input;
