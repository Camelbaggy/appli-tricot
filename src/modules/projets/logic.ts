import type { Project, ProjectStatus, RecipientType } from '../../db';

export const STATUS_ORDER: ProjectStatus[] = ['a_venir', 'en_cours', 'termine'];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminés',
};

export const STATUS_SINGULAR: Record<ProjectStatus, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
};

export const RECIPIENT_LABELS: Record<RecipientType, string> = {
  soi: 'Pour soi',
  cadeau: 'Cadeau',
  commande: 'Commande',
};

/** Regroupe les projets par statut (les plus récemment modifiés d'abord). */
export function groupByStatus(projects: Project[]): Record<ProjectStatus, Project[]> {
  const groups: Record<ProjectStatus, Project[]> = { a_venir: [], en_cours: [], termine: [] };
  for (const p of projects) groups[p.status].push(p);
  for (const s of STATUS_ORDER) groups[s].sort((a, b) => b.updatedAt - a.updatedAt);
  return groups;
}

/** Date du jour au format ISO yyyy-mm-dd (locale). */
export function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/**
 * Champs à modifier pour passer un projet à un nouveau statut : « en cours » pose la date de début
 * du jour si elle est vide, « terminé » pose la date de fin du jour si elle est vide.
 */
export function statusChanges(
  project: Pick<Project, 'startDate' | 'endDate'>,
  status: ProjectStatus,
  today: string = todayIso(),
): Partial<Pick<Project, 'status' | 'startDate' | 'endDate'>> {
  const changes: Partial<Pick<Project, 'status' | 'startDate' | 'endDate'>> = { status };
  if (status === 'en_cours' && !project.startDate) changes.startDate = today;
  if (status === 'termine' && !project.endDate) changes.endDate = today;
  return changes;
}

export function recipientLabel(p: Pick<Project, 'recipientType' | 'recipientName'>): string {
  const base = RECIPIENT_LABELS[p.recipientType];
  const name = p.recipientName?.trim();
  return name && p.recipientType !== 'soi' ? `${base} : ${name}` : base;
}

/** « 03/11/2026 » à partir d'une date ISO. */
export function formatDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function formatDates(p: Pick<Project, 'startDate' | 'endDate'>): string {
  if (p.startDate && p.endDate) return `${formatDate(p.startDate)} → ${formatDate(p.endDate)}`;
  if (p.startDate) return `Début : ${formatDate(p.startDate)}`;
  if (p.endDate) return `Fin : ${formatDate(p.endDate)}`;
  return '';
}
