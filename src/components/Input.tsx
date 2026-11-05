import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const fieldClass =
  'min-h-touch w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 ' +
  'dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldClass, error && 'border-red-600', className)}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
