import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, TABLE_NAMES } from './database';
import {
  create,
  getActive,
  getActiveById,
  isActive,
  newId,
  nowMs,
  softDelete,
  update,
} from './helpers';
import type { NewRecord, Project } from './types';

const project = (name: string): NewRecord<Project> => ({
  name,
  status: 'a_venir',
  recipientType: 'soi',
  isPro: false,
});

beforeEach(async () => {
  await Promise.all(TABLE_NAMES.map((t) => db.table(t).clear()));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('nowMs / newId', () => {
  it('renvoie des epoch ms', () => {
    expect(Math.abs(nowMs() - Date.now())).toBeLessThan(1000);
  });
  it('génère des ids uniques', () => {
    expect(newId()).not.toBe(newId());
  });
});

describe('schéma', () => {
  it('déclare toutes les tables de ARCHITECTURE.md', () => {
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual([...TABLE_NAMES].sort());
    expect(names).toHaveLength(17);
  });
});

describe('create', () => {
  it('pose id et horodatages', async () => {
    const p = await create(db.projects, project('Pull'));
    expect(p.id).toBeTruthy();
    expect(p.createdAt).toBe(p.updatedAt);
    expect(await db.projects.get(p.id)).toEqual(p);
  });

  it('accepte un id imposé (settings)', async () => {
    const s = await create(db.settings, { key: 'hourlyRate', value: 12 }, 'hourlyRate');
    expect(s.id).toBe('hourlyRate');
  });
});

describe('update', () => {
  it('met à jour les champs et updatedAt sans toucher createdAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1000);
    const p = await create(db.projects, project('Pull'));
    vi.setSystemTime(5000);
    const u = await update(db.projects, p.id, { name: 'Gilet', status: 'en_cours' });
    expect(u).toMatchObject({
      name: 'Gilet',
      status: 'en_cours',
      createdAt: 1000,
      updatedAt: 5000,
    });
    expect((await db.projects.get(p.id))?.updatedAt).toBe(5000);
  });

  it('renvoie null pour un id inconnu', async () => {
    expect(await update(db.projects, 'nope', { name: 'x' })).toBeNull();
  });
});

describe('softDelete et lectures', () => {
  it('pose deletedAt, conserve la ligne et la masque des lectures actives', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1000);
    const a = await create(db.projects, project('A'));
    const b = await create(db.projects, project('B'));
    vi.setSystemTime(2000);
    expect(await softDelete(db.projects, a.id)).toBe(true);

    const raw = await db.projects.get(a.id);
    expect(raw).toMatchObject({ deletedAt: 2000, updatedAt: 2000 });
    expect(isActive(raw!)).toBe(false);

    expect((await getActive(db.projects)).map((p) => p.id)).toEqual([b.id]);
    expect(await getActiveById(db.projects, a.id)).toBeUndefined();
    expect((await getActiveById(db.projects, b.id))?.name).toBe('B');
  });

  it('est idempotent et renvoie false pour un id inconnu', async () => {
    const a = await create(db.projects, project('A'));
    await softDelete(db.projects, a.id);
    const first = (await db.projects.get(a.id))?.deletedAt;
    expect(await softDelete(db.projects, a.id)).toBe(true);
    expect((await db.projects.get(a.id))?.deletedAt).toBe(first);
    expect(await softDelete(db.projects, 'nope')).toBe(false);
  });
});
