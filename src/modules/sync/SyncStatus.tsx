import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Cloud, CloudCheck, CloudOff, KeyRound, RefreshCw } from 'lucide-react';
import { startSync, useSyncState } from './controller';
import { useNow } from './useNow';
import { displayStatus, statusLabel, type SyncDisplay } from './status';

const ICONS: Record<SyncDisplay, typeof Cloud> = {
  local: CloudOff,
  synced: CloudCheck,
  syncing: RefreshCw,
  offline: CloudOff,
  error: AlertTriangle,
  reauth: KeyRound,
};

/** Indicateur de synchro affiché dans l'en-tête ; lance aussi la synchro au démarrage. */
export function SyncStatus() {
  const state = useSyncState();
  const now = useNow();

  useEffect(() => {
    void startSync();
  }, []);

  const kind = displayStatus(state);
  const Icon = ICONS[kind];
  const label = statusLabel(state, now);
  const alert = kind === 'error' || kind === 'reauth';

  return (
    <Link
      to="/reglages"
      className={`inline-flex min-h-touch items-center gap-2 rounded-xl px-3 text-sm hover:bg-stone-100 dark:hover:bg-stone-800 ${
        alert ? 'text-red-700 dark:text-red-400' : 'text-stone-600 dark:text-stone-300'
      }`}
      aria-label={`Synchronisation : ${label}. Ouvrir les réglages`}
    >
      <Icon size={18} aria-hidden="true" className={kind === 'syncing' ? 'animate-spin' : ''} />
      <span>{label}</span>
    </Link>
  );
}
