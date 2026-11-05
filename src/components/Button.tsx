import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600',
  secondary:
    'bg-stone-200 text-stone-900 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600',
  ghost:
    'bg-transparent text-brand-700 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-stone-800',
  danger: 'bg-red-700 text-white hover:bg-red-800',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl px-4 text-base font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  );
}
