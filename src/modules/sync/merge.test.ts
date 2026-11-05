import { describe, expect, it } from 'vitest';
import type { BaseRecord } from '../../db';
import { changedRecords, isSyncable, mergeRecords, pickWinner, stableStringify } from './merge';

interface Rec extends BaseRecord {
  name: string;
}
const rec = (id: string, name: string, updatedAt: number, deletedAt?: number): Rec => ({
  id,
  name,
  createdAt: 1,
  updatedAt,
  ...(deletedAt !== undefined ? { deletedAt } : {}),
});

describe('stableStringify', () => {
  it("ne dépend pas de l'ordre des clés ni des undefined", () => {
    expect(stableStringify({ b: 1, a: [{ d: 1, c: undefined }] })).toBe(
      stableStringify({ a: [{ d: 1 }], b: 1 }),
    );
  });
});

describe('mergeRecords', () => {
  it('le plus récent gagne, dans les deux sens', () => {
    const a = rec('1', 'ancien', 10);
    const b = rec('1', 'récent', 20);
    expect(mergeRecords([a], [b])).toEqual([b]);
    expect(mergeRecords([b], [a])).toEqual([b]);
  });

  it("garde un enregistrement présent d'un seul côté", () => {
    const a = rec('1', 'a', 10);
    const b = rec('2', 'b', 10);
    expect(mergeRecords([a], [b])).toEqual([a, b]);
    expect(mergeRecords([], [b])).toEqual([b]);
    expect(mergeRecords([a], [])).toEqual([a]);
  });

  it('propage une suppression plus récente', () => {
    const live = rec('1', 'vivant', 10);
    const dead = rec('1', 'vivant', 20, 20);
    expect(mergeRecords([live], [dead])[0]?.deletedAt).toBe(20);
    expect(mergeRecords([dead], [live])[0]?.deletedAt).toBe(20);
  });

  it('une modification plus récente que la suppression ressuscite', () => {
    const dead = rec('1', 'x', 20, 20);
    const edited = rec('1', 'modifié', 30);
    expect(mergeRecords([dead], [edited])).toEqual([edited]);
    expect(mergeRecords([edited], [dead])).toEqual([edited]);
  });

  it('égalité de timestamps : la suppression gagne', () => {
    const live = rec('1', 'vivant', 20);
    const dead = rec('1', 'vivant', 20, 20);
    expect(mergeRecords([live], [dead])).toEqual([dead]);
    expect(mergeRecords([dead], [live])).toEqual([dead]);
  });

  it('égalité de timestamps : départage déterministe par contenu', () => {
    const a = rec('1', 'alpha', 20);
    const b = rec('1', 'beta', 20);
    expect(mergeRecords([a], [b])).toEqual(mergeRecords([b], [a]));
    expect(pickWinner(a, b)).toBe(pickWinner(b, a));
  });

  it('est idempotente', () => {
    const local = [rec('1', 'a', 10), rec('2', 'b', 30), rec('3', 'c', 5, 5)];
    const remote = [rec('1', 'a2', 20), rec('2', 'b0', 5), rec('4', 'd', 1)];
    const once = mergeRecords(local, remote);
    expect(mergeRecords(once, remote)).toEqual(once);
    expect(mergeRecords(once, local)).toEqual(once);
    expect(mergeRecords(once, once)).toEqual(once);
  });

  it('est commutative et associative', () => {
    const x = [rec('1', 'x', 10), rec('2', 'x', 20, 20)];
    const y = [rec('1', 'y', 10), rec('2', 'y', 20), rec('3', 'y', 1)];
    const z = [rec('1', 'z', 11), rec('3', 'z', 1, 1)];
    expect(mergeRecords(x, y)).toEqual(mergeRecords(y, x));
    expect(mergeRecords(mergeRecords(x, y), z)).toEqual(mergeRecords(x, mergeRecords(y, z)));
    expect(mergeRecords(mergeRecords(z, x), y)).toEqual(mergeRecords(mergeRecords(y, z), x));
  });

  it('résout les doublons dans une même liste', () => {
    expect(mergeRecords([rec('1', 'a', 1), rec('1', 'b', 2)], [])).toEqual([rec('1', 'b', 2)]);
  });

  it('liste vide des deux côtés', () => {
    expect(mergeRecords([], [])).toEqual([]);
  });
});

describe('changedRecords', () => {
  it('détecte nouveautés et modifications seulement', () => {
    const base = [rec('1', 'a', 1), rec('2', 'b', 1)];
    const merged = [rec('1', 'a', 1), rec('2', 'b2', 2), rec('3', 'c', 1)];
    expect(changedRecords(merged, base).map((r) => r.id)).toEqual(['2', '3']);
    expect(changedRecords(base, base)).toEqual([]);
  });
});

describe('isSyncable', () => {
  it('exclut les réglages propres à l’appareil', () => {
    const setting = (key: string) => ({ ...rec(key, 'x', 1), key });
    expect(isSyncable('settings', setting('sync.connected'))).toBe(false);
    expect(isSyncable('settings', setting('theme'))).toBe(true);
    expect(isSyncable('projects', rec('1', 'x', 1))).toBe(true);
  });
});
