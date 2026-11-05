import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Feuille modale ancrée en bas de l'écran (Échap ou clic sur le fond pour fermer). */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-stone-800"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
