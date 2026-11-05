import { describe, expect, it } from 'vitest';
import type { Pattern, Project } from '../../db';
import { filterPatterns, isKnitted, parseTags, projectsForPattern } from './logic';

const pat = (id: string, o: Partial<Pattern> = {}): Pattern => ({
  id,
  title: id,
  category: 'femme',
  tags: [],
  fileIds: [],
  createdAt: 1,
  updatedAt: 1,
  ...o,
});
const proj = (
  id: string,
  patternId: string,
  status: Project['status'],
  deletedAt?: number,
): Project => ({
  id,
  name: id,
  status,
  recipientType: 'soi',
  isPro: false,
  patternId,
  createdAt: 1,
  updatedAt: 1,
  deletedAt,
});

describe('isKnitted', () => {
  it('vrai si bascule manuelle', () => {
    expect(isKnitted(pat('a', { knitted: true }), [])).toBe(true);
  });
  it('vrai si un projet terminé utilise le patron', () => {
    expect(isKnitted(pat('a'), [proj('p', 'a', 'termine')])).toBe(true);
  });
  it('faux si projet non terminé, supprimé ou autre patron', () => {
    const projects = [
      proj('p', 'a', 'en_cours'),
      proj('q', 'a', 'termine', 5),
      proj('r', 'b', 'termine'),
    ];
    expect(isKnitted(pat('a'), projects)).toBe(false);
  });
  it('projectsForPattern ignore les supprimés', () => {
    expect(
      projectsForPattern('a', [proj('p', 'a', 'termine'), proj('q', 'a', 'termine', 5)]),
    ).toHaveLength(1);
  });
});

describe('filterPatterns', () => {
  const patterns = [
    pat('Pull Marin', { designer: 'Élodie', category: 'femme' }),
    pat('Bonnet', { designer: 'Paul', category: 'accessoire', knitted: true }),
    pat('Plaid', { category: 'maison' }),
  ];
  const projects = [proj('x', 'Plaid', 'termine')];
  const ids = (l: Pattern[]) => l.map((p) => p.id);
  it('par catégorie', () => {
    expect(ids(filterPatterns(patterns, projects, { category: 'maison' }))).toEqual(['Plaid']);
  });
  it('recherche titre/créateur sans accents ni casse', () => {
    expect(ids(filterPatterns(patterns, projects, { search: 'elodie' }))).toEqual(['Pull Marin']);
    expect(ids(filterPatterns(patterns, projects, { search: 'BONN' }))).toEqual(['Bonnet']);
  });
  it('déjà tricoté / pas encore', () => {
    expect(ids(filterPatterns(patterns, projects, { knitted: 'tricote' }))).toEqual([
      'Bonnet',
      'Plaid',
    ]);
    expect(ids(filterPatterns(patterns, projects, { knitted: 'pas_encore' }))).toEqual([
      'Pull Marin',
    ]);
  });
  it('ignore les patrons supprimés', () => {
    expect(filterPatterns([pat('z', { deletedAt: 1 })], [], {})).toEqual([]);
  });
});

describe('parseTags', () => {
  it('découpe et dédoublonne', () => expect(parseTags(' a, b ,,a')).toEqual(['a', 'b']));
});
