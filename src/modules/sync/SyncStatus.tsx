import { Link } from 'react-router-dom';
import { CloudOff } from 'lucide-react';

/** Indicateur de synchro affiché dans l'en-tête. Placeholder : toujours « Hors-ligne / local ». */
export function SyncStatus() {
  return (
    <Link
      to="/reglages"
      className="inline-flex min-h-touch items-center gap-2 rounded-xl px-3 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
      aria-label="Synchronisation : hors-ligne, données locales. Ouvrir les réglages"
    >
      <CloudOff size={18} aria-hidden="true" />
      <span>Hors-ligne / local</span>
    </Link>
  );
}
