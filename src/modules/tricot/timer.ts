import { create, db, getActive, nowMs, update } from '../../db';

/** Démarre le chrono d'un projet ; clôt toute session ouverte ailleurs (une seule à la fois). */
export async function startSession(projectId: string): Promise<void> {
  const open = (await getActive(db.workSessions)).filter((s) => s.endedAt === undefined);
  if (open.some((s) => s.projectId === projectId)) return;
  const now = nowMs();
  for (const s of open) await update(db.workSessions, s.id, { endedAt: now });
  await create(db.workSessions, { projectId, startedAt: now });
}

/** Arrête la session ouverte du projet. */
export async function stopSession(projectId: string): Promise<void> {
  const now = nowMs();
  const open = (await getActive(db.workSessions)).filter(
    (s) => s.projectId === projectId && s.endedAt === undefined,
  );
  for (const s of open) await update(db.workSessions, s.id, { endedAt: now });
}
