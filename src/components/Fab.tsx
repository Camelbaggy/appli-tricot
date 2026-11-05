import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Libellé accessible obligatoire (le bouton n'affiche qu'une icône). */
  label: string;
  icon: ReactNode;
}

/** Bouton d'action flottant, placé au-dessus de la barre de navigation. */
export function Fab({ label, icon, className, type = 'button', ...props }: FabProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg',
        'bottom-[calc(5rem+env(safe-area-inset-bottom))] hover:bg-brand-700',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
