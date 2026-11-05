// @vitest-environment node
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { AppDatabase, type Project, type StoredFile } from '../../db';
import { createBackup, restoreBackup } from './backup';

const project = (id: string, name: string, updatedAt: number): Project => ({
  id,
  name,
  status: 'a_venir',
  recipientType: 'soi',
  isPro: false,
  createdAt: 1,
  updatedAt,
});

const file: StoredFile = {
  id: 'f1',
  name: 'patron.pdf',
  mimeType: 'application/pdf',
  size: 5,
  blob: new Blob(['hello'], { type: 'application/pdf' }),
  source: 'local',
  createdAt: 1,
  updatedAt: 5,
};

let n = 0;
const newDb = () => new AppDatabase(`backup-${++n}-${Math.random()}`);

describe('sauvegarde zip', () => {
  it('contient un JSON par table et les Blobs dans files/', async () => {
    const db = newDb();
    await db.projects.put(project('p1', 'Pull', 10));
    await db.files.put(file);
    const entries = unzipSync(await createBackup(db));
    expect(Object.keys(entries)).toContain('projects.json');
    expect(Object.keys(entries)).toContain('manifest.json');
    expect(Object.keys(entries)).toContain('files/f1');
    expect(JSON.parse(new TextDecoder().decode(entries['files.json']))[0]).not.toHaveProperty(
      'blob',
    );
  });

  it('aller-retour : exporter puis restaurer dans une base vide', async () => {
    const src = newDb();
    await src.projects.put(project('p1', 'Pull', 10));
    await src.files.put(file);
    const dest = newDb();
    const summary = await restoreBackup(dest, await createBackup(src));
    expect(summary.written).toBe(2);
    expect((await dest.projects.get('p1'))?.name).toBe('Pull');
    const restored = await dest.files.get('f1');
    expect(restored?.mimeType).toBe('application/pdf');
    expect(await restored?.blob.text()).toBe('hello');
  });

  it('fusionne : ne remplace pas ce qui est plus récent en local', async () => {
    const src = newDb();
    await src.projects.put(project('p1', 'Ancien', 10));
    await src.projects.put(project('p2', 'Autre', 10));
    const archive = await createBackup(src);
    const dest = newDb();
    await dest.projects.put(project('p1', 'Récent', 99));
    await dest.projects.put(project('p3', 'Local seulement', 1));
    await restoreBackup(dest, archive);
    expect((await dest.projects.get('p1'))?.name).toBe('Récent');
    expect(await dest.projects.get('p2')).toBeDefined();
    expect(await dest.projects.get('p3')).toBeDefined();
  });

  it('restaurer deux fois ne change rien', async () => {
    const src = newDb();
    await src.projects.put(project('p1', 'Pull', 10));
    const archive = await createBackup(src);
    const dest = newDb();
    await restoreBackup(dest, archive);
    expect((await restoreBackup(dest, archive)).written).toBe(0);
  });

  it('refuse un fichier qui n’est pas une sauvegarde', async () => {
    const db = newDb();
    await expect(restoreBackup(db, new Uint8Array([1, 2, 3]))).rejects.toThrow(/zip/);
  });
});
