import { describe, expect, it } from 'vitest';
import type { Project } from '../../db';
import { groupByStatus, recipientLabel, statusChanges, todayIso } from './logic';

const mk = (id: string, status: Project['status'], updatedAt = 1): Project => ({
  id,
  name: id,
  status,
  recipientType: 'soi',
  isPro: false,
  createdAt: 1,
  updatedAt,
});

describe('groupByStatus', () => {
  it('regroupe par statut, récents d’abord', () => {
    const g = groupByStatus([
      mk('a', 'a_venir'),
      mk('b', 'en_cours', 1),
      mk('c', 'en_cours', 5),
      mk('d', 'termine'),
    ]);
    expect(g.a_venir.map((p) => p.id)).toEqual(['a']);
    expect(g.en_cours.map((p) => p.id)).toEqual(['c', 'b']);
    expect(g.termine).toHaveLength(1);
  });
});

describe('statusChanges', () => {
  it('pose la date de début en passant en cours si vide', () => {
    expect(statusChanges({}, 'en_cours', '2026-11-05')).toEqual({
      status: 'en_cours',
      startDate: '2026-11-05',
    });
    expect(statusChanges({ startDate: '2026-01-01' }, 'en_cours', '2026-11-05')).toEqual({
      status: 'en_cours',
    });
  });
  it('pose la date de fin en terminant si vide', () => {
    expect(statusChanges({}, 'termine', '2026-11-05')).toEqual({
      status: 'termine',
      endDate: '2026-11-05',
    });
    expect(statusChanges({ endDate: '2026-02-02' }, 'termine', '2026-11-05')).toEqual({
      status: 'termine',
    });
    expect(statusChanges({}, 'a_venir', '2026-11-05')).toEqual({ status: 'a_venir' });
  });
});

describe('divers', () => {
  it('todayIso', () => expect(todayIso(new Date(2026, 10, 5))).toBe('2026-11-05'));
  it('recipientLabel', () => {
    expect(recipientLabel({ recipientType: 'cadeau', recipientName: 'Léa' })).toBe('Cadeau : Léa');
    expect(recipientLabel({ recipientType: 'soi', recipientName: 'x' })).toBe('Pour soi');
  });
});
