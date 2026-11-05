import type { Pattern, PatternCategory, Project, YarnWeight } from '../../db';

export const CATEGORY_ORDER: PatternCategory[] = [
  'femme',
  'homme',
  'enfant',
  'bebe',
  'accessoire',
  'maison',
  'autre',
];

export const CATEGORY_LABELS: Record<PatternCategory, string> = {
  femme: 'Femme',
  homme: 'Homme',
  enfant: 'Enfant',
  bebe: 'Bébé',
  accessoire: 'Accessoire',
  maison: 'Maison',
  autre: 'Autre',
};

export const YARN_WEIGHT_LABELS: Record<YarnWeight, string> = {
  lace: 'Lace',
  fingering: 'Fingering',
  sport: 'Sport',
  dk: 'DK',
  worsted: 'Worsted',
  aran: 'Aran',
  bulky: 'Bulky',
  super_bulky: 'Super bulky',
};

/** Projets (non supprimés) réalisés avec ce patron. */
export function projectsForPattern(patternId: string, projects: Project[]): Project[] {
  return projects.filter((p) => p.patternId === patternId && p.deletedAt === undefined);
}

/** « Déjà tricoté » : bascule manuelle OU au moins un projet terminé utilise ce patron. */
export function isKnitted(pattern: Pick<Pattern, 'id' | 'knitted'>, projects: Project[]): boolean {
  if (pattern.knitted) return true;
  return projectsForPattern(pattern.id, projects).some((p) => p.status === 'termine');
}

export type KnittedFilter = 'tous' | 'tricote' | 'pas_encore';

export interface PatternFilters {
  category?: PatternCategory | null;
  search?: string;
  knitted?: KnittedFilter;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filtre la bibliothèque : catégorie, recherche sur titre/créateur, déjà tricoté ou non. */
export function filterPatterns(
  patterns: Pattern[],
  projects: Project[],
  { category, search, knitted = 'tous' }: PatternFilters,
): Pattern[] {
  const q = normalize((search ?? '').trim());
  return patterns.filter((p) => {
    if (p.deletedAt !== undefined) return false;
    if (category && p.category !== category) return false;
    if (q && !normalize(`${p.title} ${p.designer ?? ''}`).includes(q)) return false;
    if (knitted !== 'tous') {
      const k = isKnitted(p, projects);
      if (knitted === 'tricote' ? !k : k) return false;
    }
    return true;
  });
}

/** « a, b ,c » → ['a','b','c'] */
export function parseTags(text: string): string[] {
  return [
    ...new Set(
      text
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
}

export const STATUS_LABELS: Record<Project['status'], string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
};
