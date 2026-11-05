import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create, db } from '../../db';
import {
  getSyncState,
  installWriteHooks,
  resetSyncForTests,
  setDriveClientForTests,
  syncNow,
  SYNC_DELAY_MS,
} from './controller';
import { DriveAuthError } from './driveClient';
import { MemoryDrive } from './memoryDrive';
import { displayStatus, formatAgo, statusLabel, type SyncState } from './status';

class CountingDrive extends MemoryDrive {
  lists = 0;
  override async list() {
    this.lists++;
    await Promise.resolve();
    return super.list();
  }
}

const project = { name: 'Pull', status: 'a_venir', recipientType: 'soi', isPro: false } as const;

describe('contrôleur de synchro', () => {
  let drive: CountingDrive;
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    drive = new CountingDrive();
    setDriveClientForTests(drive);
    resetSyncForTests({ configured: true, connected: true, online: true });
  });
  afterEach(() => {
    setDriveClientForTests(undefined);
    resetSyncForTests({ configured: false, connected: false });
    vi.useRealTimers();
  });

  it('verrou : deux demandes simultanées ne lancent pas deux synchros en parallèle', async () => {
    const first = syncNow();
    const second = syncNow();
    await Promise.all([first, second]);
    // une passe + une relance demandée pendant la première, jamais en parallèle
    expect(drive.lists).toBe(2);
    expect(getSyncState().phase).toBe('idle');
    expect(getSyncState().lastSyncAt).toBeTypeOf('number');
  });

  it('ne fait rien si non connecté', async () => {
    resetSyncForTests({ connected: false });
    await syncNow();
    expect(drive.lists).toBe(0);
  });

  it('passe en « Reconnexion nécessaire » sur erreur d’authentification', async () => {
    drive.list = async () => {
      throw new DriveAuthError();
    };
    await syncNow();
    expect(displayStatus(getSyncState())).toBe('reauth');
  });

  it('passe en erreur sur panne réseau, avec le message', async () => {
    drive.list = async () => {
      throw new Error('boum');
    };
    await syncNow();
    expect(displayStatus(getSyncState())).toBe('error');
    expect(getSyncState().error).toBe('boum');
  });

  it('les écritures locales déclenchent une synchro temporisée (une seule pour une rafale)', async () => {
    installWriteHooks(db);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await create(db.projects, { ...project });
    await create(db.projects, { ...project });
    expect(drive.lists).toBe(0);
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS - 100);
    expect(drive.lists).toBe(0);
    await vi.advanceTimersByTimeAsync(200);
    await vi.waitFor(() => expect(drive.lists).toBe(1));
  });

  it('une écriture de la synchro elle-même ne la redéclenche pas', async () => {
    installWriteHooks(db);
    const other = new MemoryDrive();
    const { AppDatabase } = await import('../../db');
    const remote = new AppDatabase(`remote-${Math.random()}`);
    await remote.projects.put({ ...project, id: 'r1', createdAt: 1, updatedAt: 1 });
    const { syncAll } = await import('./engine');
    await syncAll(remote, other);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await syncAll(db, other);
    expect(await db.projects.get('r1')).toBeDefined();
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS + 100);
    expect(drive.lists).toBe(0);
  });
});

describe('affichage du statut', () => {
  const base: SyncState = { configured: true, connected: true, online: true, phase: 'idle' };
  it('couvre tous les états', () => {
    expect(displayStatus({ ...base, configured: false })).toBe('local');
    expect(displayStatus({ ...base, connected: false })).toBe('local');
    expect(displayStatus({ ...base, phase: 'syncing' })).toBe('syncing');
    expect(displayStatus({ ...base, online: false })).toBe('offline');
    expect(displayStatus({ ...base, phase: 'error' })).toBe('error');
    expect(displayStatus({ ...base, phase: 'reauth' })).toBe('reauth');
    expect(displayStatus(base)).toBe('synced');
  });
  it('formate les libellés', () => {
    expect(statusLabel({ ...base, configured: false }, 0)).toBe('Local seulement');
    expect(statusLabel({ ...base, phase: 'syncing' }, 0)).toBe('Synchronisation…');
    expect(statusLabel({ ...base, online: false }, 0)).toBe('Hors-ligne');
    expect(statusLabel({ ...base, phase: 'reauth' }, 0)).toBe('Reconnexion nécessaire');
    expect(statusLabel({ ...base, lastSyncAt: 1000 }, 5 * 60_000 + 1000)).toBe(
      'Synchronisé il y a 5 min',
    );
  });
  it('formatAgo', () => {
    expect(formatAgo(0, 10_000)).toBe("à l'instant");
    expect(formatAgo(0, 3 * 3600_000)).toBe('il y a 3 h');
    expect(formatAgo(0, 2 * 86400_000)).toBe('il y a 2 j');
  });
});
