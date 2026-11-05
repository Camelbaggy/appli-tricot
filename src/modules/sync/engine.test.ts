// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, type Project, type StoredFile, type Yarn } from '../../db';
import { blobFileName, syncAll } from './engine';
import { MemoryDrive } from './memoryDrive';

const project = (id: string, name: string, updatedAt: number, deletedAt?: number): Project => ({
  id,
  name,
  status: 'en_cours',
  recipientType: 'soi',
  isPro: false,
  createdAt: 1,
  updatedAt,
  ...(deletedAt !== undefined ? { deletedAt } : {}),
});

const fileRec = (id: string, over: Partial<StoredFile> = {}): StoredFile => ({
  id,
  name: `${id}.pdf`,
  mimeType: 'application/pdf',
  size: 4,
  blob: new Blob(['data'], { type: 'application/pdf' }),
  source: 'local',
  createdAt: 1,
  updatedAt: 5,
  ...over,
});

let counter = 0;
function newDevice(): AppDatabase {
  return new AppDatabase(`device-${++counter}-${Math.random()}`);
}

async function ids(db: AppDatabase) {
  return (await db.projects.toArray()).map((p) => [p.id, p.name, p.updatedAt, p.deletedAt]);
}

describe('syncAll', () => {
  let drive: MemoryDrive;
  let a: AppDatabase;
  let b: AppDatabase;
  beforeEach(() => {
    drive = new MemoryDrive();
    a = newDevice();
    b = newDevice();
  });

  it('première synchro : pousse tout vers un Drive vide', async () => {
    await a.projects.put(project('p1', 'Pull', 10));
    const result = await syncAll(a, drive);
    expect(result.pushedTables).toBeGreaterThan(0);
    const json = JSON.parse(await (await drive.download(drive.idByName('projects.json')!)).text());
    expect(json).toHaveLength(1);
  });

  it('deux appareils convergent, sans toucher à updatedAt', async () => {
    await a.projects.put(project('p1', 'Pull A', 10));
    await a.projects.put(project('p2', 'Bonnet', 10));
    await b.projects.put(project('p1', 'Pull B', 20));
    await b.projects.put(project('p3', 'Écharpe', 15));
    await syncAll(a, drive);
    await syncAll(b, drive);
    await syncAll(a, drive);
    expect(await ids(a)).toEqual(await ids(b));
    expect((await a.projects.get('p1'))?.name).toBe('Pull B');
    expect((await a.projects.get('p1'))?.updatedAt).toBe(20);
    expect(await a.projects.count()).toBe(3);
  });

  it('propage les suppressions (tombstones)', async () => {
    await a.projects.put(project('p1', 'Pull', 10));
    await syncAll(a, drive);
    await syncAll(b, drive);
    expect(await b.projects.count()).toBe(1);
    await b.projects.put(project('p1', 'Pull', 30, 30));
    await syncAll(b, drive);
    await syncAll(a, drive);
    expect((await a.projects.get('p1'))?.deletedAt).toBe(30);
  });

  it('est idempotente : une deuxième synchro n’envoie ni n’écrit rien', async () => {
    await a.projects.put(project('p1', 'Pull', 10));
    await syncAll(a, drive);
    drive.uploads = [];
    const again = await syncAll(a, drive);
    expect(again).toEqual({ pulled: 0, pushedTables: 0, blobsUploaded: 0, blobsDownloaded: 0 });
    expect(drive.uploads).toEqual([]);
  });

  it('ne synchronise pas les réglages sync.* mais bien les autres', async () => {
    const setting = (key: string, value: boolean) => ({
      id: key,
      key,
      value,
      createdAt: 1,
      updatedAt: 1,
    });
    await a.settings.put(setting('sync.connected', true));
    await a.settings.put(setting('darkMode', true));
    await syncAll(a, drive);
    await syncAll(b, drive);
    expect((await b.settings.toArray()).map((s) => s.key)).toEqual(['darkMode']);
  });

  it('synchronise plusieurs tables', async () => {
    const yarn: Yarn = {
      id: 'y1',
      brand: 'Drops',
      line: 'Alpaca',
      weight: 'fingering',
      fiber: 'alpaga',
      ballWeightG: 50,
      ballLengthM: 167,
      createdAt: 1,
      updatedAt: 1,
    };
    await a.yarns.put(yarn);
    await syncAll(a, drive);
    await syncAll(b, drive);
    expect(await b.yarns.get('y1')).toEqual(yarn);
  });

  describe('fichiers', () => {
    it('envoie le Blob une seule fois et le télécharge sur l’autre appareil', async () => {
      await a.files.put(fileRec('f1'));
      await syncAll(a, drive);
      await syncAll(a, drive);
      expect(drive.uploads.filter((n) => n === blobFileName('f1'))).toHaveLength(1);
      expect(
        JSON.parse(await (await drive.download(drive.idByName('files.json')!)).text())[0],
      ).not.toHaveProperty('blob');

      const result = await syncAll(b, drive);
      expect(result.blobsDownloaded).toBe(1);
      const copy = await b.files.get('f1');
      expect(copy?.name).toBe('f1.pdf');
      expect(await copy?.blob.text()).toBe('data');
    });

    it('conserve le Blob local quand la fiche distante gagne', async () => {
      await a.files.put(fileRec('f1'));
      await syncAll(a, drive);
      await syncAll(b, drive);
      await a.files.put(fileRec('f1', { name: 'renommé.pdf', updatedAt: 50 }));
      await syncAll(a, drive);
      const result = await syncAll(b, drive);
      expect(result.blobsDownloaded).toBe(0);
      const copy = await b.files.get('f1');
      expect(copy?.name).toBe('renommé.pdf');
      expect(await copy?.blob.text()).toBe('data');
    });

    it('n’envoie pas un fichier importé depuis Drive (driveFileId connu)', async () => {
      await a.files.put(fileRec('f2', { source: 'drive', driveFileId: 'user-drive-1' }));
      await syncAll(a, drive);
      expect(drive.idByName(blobFileName('f2'))).toBeUndefined();
      expect(drive.idByName('files.json')).toBeDefined();
    });

    it('télécharge un fichier Drive absent localement via son driveFileId', async () => {
      drive.files.set('user-drive-1', {
        name: 'mon-patron.pdf',
        data: new Blob(['from drive'], { type: 'application/pdf' }),
      });
      await a.files.put(fileRec('f2', { source: 'drive', driveFileId: 'user-drive-1' }));
      await syncAll(a, drive);
      const result = await syncAll(b, drive);
      expect(result.blobsDownloaded).toBe(1);
      expect(await (await b.files.get('f2'))?.blob.text()).toBe('from drive');
    });

    it('retente plus tard quand le Blob est introuvable', async () => {
      await a.files.put(fileRec('f2', { source: 'drive', driveFileId: 'introuvable' }));
      await syncAll(a, drive);
      await syncAll(b, drive);
      expect(await b.files.get('f2')).toBeUndefined();
      drive.files.set('introuvable', { name: 'x', data: new Blob(['ok']) });
      await syncAll(b, drive);
      expect(await b.files.get('f2')).toBeDefined();
    });

    it('propage la suppression d’un fichier sans Blob', async () => {
      await a.files.put(fileRec('f1'));
      await syncAll(a, drive);
      await syncAll(b, drive);
      await a.files.put(fileRec('f1', { updatedAt: 60, deletedAt: 60 }));
      await syncAll(a, drive);
      await syncAll(b, drive);
      expect((await b.files.get('f1'))?.deletedAt).toBe(60);
    });
  });
});
