import { useSyncExternalStore } from 'react';
import { db, TABLE_NAMES, create, update, type AppDatabase, type JsonValue } from '../../db';
import { getAccessToken, setRemembered, signIn, signOut } from './auth';
import { isDriveConfigured } from './config';
import { createDriveClient, DriveAuthError, type DriveClient } from './driveClient';
import { isOwnWrite, syncAll } from './engine';
import { LOCAL_SETTING_PREFIX } from './merge';
import type { SyncState } from './status';

export const SYNC_DELAY_MS = 5000;
const KEY_CONNECTED = `${LOCAL_SETTING_PREFIX}connected`;
const KEY_LAST_SYNC = `${LOCAL_SETTING_PREFIX}lastSyncAt`;

let state: SyncState = {
  configured: isDriveConfigured(),
  connected: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  phase: 'idle',
};
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export const getSyncState = (): SyncState => state;
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, getSyncState, getSyncState);
}

async function saveSetting(key: string, value: JsonValue): Promise<void> {
  const existing = await db.settings.get(key);
  if (existing) await update(db.settings, key, { key, value });
  else await create(db.settings, { key, value }, key);
}
async function loadSetting(key: string): Promise<JsonValue | undefined> {
  const row = await db.settings.get(key);
  return row && row.deletedAt === undefined ? row.value : undefined;
}

let inFlight: Promise<void> | null = null;
let rerun = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let clientOverride: DriveClient | undefined;

/** Pour les tests : remplace le transport réel. */
export function setDriveClientForTests(client: DriveClient | undefined): void {
  clientOverride = client;
}

async function runOnce(): Promise<void> {
  if (!state.configured || !state.connected) return;
  if (!navigator.onLine) {
    setState({ online: false });
    return;
  }
  setState({ phase: 'syncing', online: true, error: undefined });
  try {
    await syncAll(db, clientOverride ?? createDriveClient(getAccessToken));
    const now = Date.now();
    setState({ phase: 'idle', lastSyncAt: now });
    await saveSetting(KEY_LAST_SYNC, now);
  } catch (error) {
    if (error instanceof DriveAuthError) setState({ phase: 'reauth', error: error.message });
    else {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setState({ phase: 'error', error: message });
    }
  }
}

/** Synchronise maintenant. Une seule synchro à la fois ; une demande pendant l'une d'elles en relance une. */
export function syncNow(): Promise<void> {
  if (inFlight) {
    rerun = true;
    return inFlight;
  }
  inFlight = (async () => {
    try {
      do {
        rerun = false;
        await runOnce();
      } while (rerun && state.phase === 'idle');
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Programme une synchro après les écritures locales (temporisation, regroupe les rafales). */
export function scheduleSync(delay = SYNC_DELAY_MS): void {
  if (!state.configured || !state.connected) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

const hooked = new WeakSet<AppDatabase>();

/** Écoute les écritures locales de chaque table (hors écritures de la synchro et réglages `sync.*`). */
export function installWriteHooks(target: AppDatabase): void {
  if (hooked.has(target)) return;
  hooked.add(target);
  for (const name of TABLE_NAMES) {
    const isLocalSetting = (obj: unknown) =>
      name === 'settings' &&
      typeof (obj as { key?: unknown }).key === 'string' &&
      (obj as { key: string }).key.startsWith(LOCAL_SETTING_PREFIX);
    const table = target.table(name);
    table.hook('creating', (_key, obj) => {
      if (!isOwnWrite() && !isLocalSetting(obj)) scheduleSync();
    });
    table.hook('updating', (_mods, _key, obj) => {
      if (!isOwnWrite() && !isLocalSetting(obj)) scheduleSync();
    });
  }
}

let started = false;

/** Démarre la synchro (idempotent) : état mémorisé, hooks, retour en ligne, synchro initiale. */
export async function startSync(): Promise<void> {
  if (started) return;
  started = true;
  installWriteHooks(db);
  window.addEventListener('online', () => {
    setState({ online: true });
    void syncNow();
  });
  window.addEventListener('offline', () => setState({ online: false }));
  if (!state.configured) return;
  const [connected, last] = await Promise.all([
    loadSetting(KEY_CONNECTED),
    loadSetting(KEY_LAST_SYNC),
  ]);
  setRemembered(connected === true);
  setState({
    connected: connected === true,
    lastSyncAt: typeof last === 'number' ? last : undefined,
  });
  if (connected === true) void syncNow();
}

/** Connexion à Google (à appeler depuis un clic). */
export async function connectGoogle(): Promise<void> {
  try {
    await signIn();
  } catch (error) {
    setState({ error: error instanceof Error ? error.message : 'Connexion impossible' });
    throw error;
  }
  setRemembered(true);
  await saveSetting(KEY_CONNECTED, true);
  setState({ connected: true, phase: 'idle', error: undefined });
  void syncNow();
}

export async function disconnectGoogle(): Promise<void> {
  signOut();
  clearTimeout(timer);
  await saveSetting(KEY_CONNECTED, false);
  setState({ connected: false, phase: 'idle', error: undefined });
}

/** Utilisé par le Picker : jeton valide, ou erreur « Reconnexion nécessaire ». */
export async function ensureToken(): Promise<string> {
  try {
    return await getAccessToken();
  } catch (error) {
    setState({ phase: 'reauth' });
    throw error;
  }
}

/** Pour les tests : remet l'état à zéro. */
export function resetSyncForTests(patch: Partial<SyncState> = {}): void {
  clearTimeout(timer);
  inFlight = null;
  rerun = false;
  state = { ...state, phase: 'idle', error: undefined, lastSyncAt: undefined, ...patch };
  listeners.forEach((l) => l());
}
