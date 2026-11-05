import { Link } from 'react-router-dom';
import { Minus, Pause, Play, Plus, Wrench } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader } from '../../components';
import { db, useActive } from '../../db';
import type { Counter, Project } from '../../db';
import { stepCounter } from './counterActions';
import { counterSummary } from './counters';
import { startSession, stopSession } from './timer';
import {
  findOpenSession,
  formatClock,
  formatHoursMinutes,
  projectTotalMs,
  sessionDurationMs,
} from './time';
import { useNow } from './useNow';

/** Écran Outils : tableau de bord des projets en cours. */
export function TricotDashboard() {
  const projects = useActive(db.projects);
  const sessions = useActive(db.workSessions);
  const counters = useActive(db.counters);

  const open = sessions ? findOpenSession(sessions) : undefined;
  const now = useNow(open !== undefined);
  const active = (projects ?? []).filter((p) => p.status === 'en_cours');
  const openProject = open ? (projects ?? []).find((p) => p.id === open.projectId) : undefined;

  return (
    <>
      <PageHeader title="Outils" subtitle="En cours" />
      {open && (
        <Card
          role="status"
          aria-label="Chronomètre en marche"
          className="mb-4 flex items-center gap-3 border-brand-500 bg-brand-50 dark:bg-stone-800"
        >
          <span className="relative flex size-3 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-brand-500" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              Chrono en marche{openProject ? ` · ${openProject.name}` : ''}
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums" data-testid="running-clock">
              {formatClock(sessionDurationMs(open, now))}
            </div>
          </div>
          <Button
            variant="secondary"
            aria-label="Arrêter le chrono"
            onClick={() => void stopSession(open.projectId)}
          >
            <Pause aria-hidden />
          </Button>
        </Card>
      )}

      {projects !== undefined && active.length === 0 && (
        <EmptyState
          icon={<Wrench size={40} />}
          title="Aucun projet en cours"
          description="Passez un projet au statut « En cours » pour retrouver ici son chrono et ses compteurs."
        />
      )}
      <ul className="flex flex-col gap-3">
        {active.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            running={open?.projectId === p.id}
            totalMs={projectTotalMs(sessions ?? [], p.id, now)}
            counters={(counters ?? [])
              .filter((c) => c.projectId === p.id)
              .sort((a, b) => a.order - b.order)}
          />
        ))}
      </ul>
    </>
  );
}

function ProjectCard({
  project,
  running,
  totalMs,
  counters,
}: {
  project: Project;
  running: boolean;
  totalMs: number;
  counters: Counter[];
}) {
  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/projets/${project.id}`}
            className="flex min-h-touch min-w-0 flex-1 flex-col justify-center"
          >
            <span className="truncate text-lg font-semibold">{project.name}</span>
            <span className="text-sm text-stone-600 dark:text-stone-400">
              {formatHoursMinutes(totalMs)} au total
            </span>
          </Link>
          <Button
            variant={running ? 'secondary' : 'primary'}
            className="min-h-[3.5rem] min-w-[3.5rem]"
            aria-label={`${running ? 'Pause' : 'Démarrer'} : ${project.name}`}
            onClick={() => void (running ? stopSession(project.id) : startSession(project.id))}
          >
            {running ? <Pause aria-hidden /> : <Play aria-hidden />}
          </Button>
        </div>
        {counters.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-xl bg-stone-100 p-2 dark:bg-stone-900"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.label}</div>
              <div className="text-sm text-stone-600 tabular-nums dark:text-stone-400">
                {counterSummary(c.value, c.target)}
              </div>
            </div>
            <Button
              variant="secondary"
              aria-label={`Moins un, ${c.label} (${project.name})`}
              onClick={() => void stepCounter(c.id, -1)}
            >
              <Minus aria-hidden />
            </Button>
            <Button
              aria-label={`Plus un, ${c.label} (${project.name})`}
              onClick={() => void stepCounter(c.id, 1)}
            >
              <Plus aria-hidden />
            </Button>
          </div>
        ))}
        <Link
          to={`/projets/${project.id}`}
          className="inline-flex min-h-touch items-center text-sm font-medium text-brand-700 underline dark:text-brand-100"
        >
          Ouvrir le projet
        </Link>
      </Card>
    </li>
  );
}
