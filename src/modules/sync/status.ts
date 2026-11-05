export type SyncPhase = 'idle' | 'syncing' | 'error' | 'reauth';
export type SyncDisplay = 'local' | 'synced' | 'syncing' | 'offline' | 'error' | 'reauth';

export interface SyncState {
  /** Drive configuré (variable d'environnement présente) */
  configured: boolean;
  /** l'utilisatrice s'est connectée à Google sur cet appareil */
  connected: boolean;
  online: boolean;
  phase: SyncPhase;
  lastSyncAt?: number;
  error?: string;
}

export function displayStatus(state: SyncState): SyncDisplay {
  if (!state.configured || !state.connected) return 'local';
  if (state.phase === 'reauth') return 'reauth';
  if (state.phase === 'syncing') return 'syncing';
  if (!state.online) return 'offline';
  if (state.phase === 'error') return 'error';
  return 'synced';
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 j ». */
export function formatAgo(from: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

export function statusLabel(state: SyncState, now: number): string {
  switch (displayStatus(state)) {
    case 'local':
      return 'Local seulement';
    case 'syncing':
      return 'Synchronisation…';
    case 'offline':
      return 'Hors-ligne';
    case 'error':
      return 'Erreur de synchro';
    case 'reauth':
      return 'Reconnexion nécessaire';
    case 'synced':
      return state.lastSyncAt ? `Synchronisé ${formatAgo(state.lastSyncAt, now)}` : 'Synchronisé';
  }
}
