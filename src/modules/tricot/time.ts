import type { WorkSession } from '../../db';

/** Durée d'une session en ms ; une session ouverte court jusqu'à `now`. Jamais négative. */
export function sessionDurationMs(
  session: Pick<WorkSession, 'startedAt' | 'endedAt'>,
  now: number,
): number {
  const end = session.endedAt ?? now;
  return Math.max(0, end - session.startedAt);
}

/** Sessions non supprimées d'un projet. */
function ofProject(sessions: readonly WorkSession[], projectId: string): WorkSession[] {
  return sessions.filter((s) => s.projectId === projectId && s.deletedAt === undefined);
}

/**
 * Temps de travail cumulé d'un projet (ms), sessions ouvertes comprises (jusqu'à `now`).
 * Les sessions supprimées sont ignorées. Utilisé aussi par l'Espace Pro.
 */
export function projectTotalMs(
  sessions: readonly WorkSession[],
  projectId: string,
  now: number = Date.now(),
): number {
  return ofProject(sessions, projectId).reduce((sum, s) => sum + sessionDurationMs(s, now), 0);
}

/** Session ouverte (chrono en marche) parmi une liste, tous projets confondus. */
export function findOpenSession(sessions: readonly WorkSession[]): WorkSession | undefined {
  return sessions.find((s) => s.deletedAt === undefined && s.endedAt === undefined);
}

/** Durée de la session ouverte du projet, 0 sinon. */
export function openSessionMs(
  sessions: readonly WorkSession[],
  projectId: string,
  now: number,
): number {
  const open = ofProject(sessions, projectId).find((s) => s.endedAt === undefined);
  return open ? sessionDurationMs(open, now) : 0;
}

/** « 2 h 05 min » / « 12 min » / « 0 min » (arrondi à la minute inférieure). */
export function formatHoursMinutes(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

/** Affichage du chrono « 01:02:03 ». */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** epoch ms vers la valeur d'un <input type="datetime-local"> (heure locale). */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(value: string): number | undefined {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}
