import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { create, db } from '../../db';
import { stepCounter } from './counterActions';

describe('stepCounter', () => {
  beforeEach(async () => {
    await db.counters.clear();
  });

  it('ne perd aucun rang lors d’appuis simultanés', async () => {
    const c = await create(db.counters, { projectId: 'p', label: 'Corps', value: 0, order: 0 });
    await Promise.all(Array.from({ length: 10 }, () => stepCounter(c.id, 1)));
    expect((await db.counters.get(c.id))?.value).toBe(10);
  });

  it('ne descend pas sous zéro', async () => {
    const c = await create(db.counters, { projectId: 'p', label: 'Corps', value: 0, order: 0 });
    await stepCounter(c.id, -1);
    expect((await db.counters.get(c.id))?.value).toBe(0);
  });
});
