import { useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { Button, Card, Input, Sheet } from '../../components';
import { db, softDelete, update, useActive } from '../../db';
import type { WorkSession } from '../../db';
import { startSession, stopSession } from './timer';
import {
  findOpenSession,
  formatClock,
  formatHoursMinutes,
  fromLocalInput,
  projectTotalMs,
  sessionDurationMs,
  toLocalInput,
} from './time';
import { useNow } from './useNow';

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

export function TimerSection({ projectId }: { projectId: string }) {
  const sessions = useActive(db.workSessions);
  const open = sessions ? findOpenSession(sessions) : undefined;
  const runningHere = open?.projectId === projectId;
  const now = useNow(runningHere);
  const [showList, setShowList] = useState(false);
  const [editing, setEditing] = useState<WorkSession | null>(null);

  const mine = (sessions ?? [])
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => b.startedAt - a.startedAt);
  const current = runningHere ? sessionDurationMs(open, now) : 0;
  const total = projectTotalMs(sessions ?? [], projectId, now);

  return (
    <Card aria-label="Chronomètre" className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Chronomètre</h3>
      <div className="text-center">
        <div
          className="font-mono text-5xl font-bold tabular-nums"
          aria-live="off"
          data-testid="clock"
        >
          {formatClock(current)}
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Total du projet : <strong data-testid="total">{formatHoursMinutes(total)}</strong>
        </p>
        {open && !runningHere && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Un autre projet est en cours : le démarrer l’arrêtera.
          </p>
        )}
      </div>
      <Button
        className="min-h-[4.5rem] text-xl"
        variant={runningHere ? 'secondary' : 'primary'}
        onClick={() => void (runningHere ? stopSession(projectId) : startSession(projectId))}
        aria-label={runningHere ? 'Pause' : 'Démarrer le chronomètre'}
      >
        {runningHere ? <Pause aria-hidden size={28} /> : <Play aria-hidden size={28} />}
        {runningHere ? 'Pause' : 'Play'}
      </Button>

      <button
        type="button"
        className="flex min-h-touch items-center justify-between text-left font-medium"
        aria-expanded={showList}
        onClick={() => setShowList((v) => !v)}
      >
        <span>Sessions ({mine.length})</span>
        {showList ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
      </button>
      {showList && (
        <ul className="flex flex-col gap-2">
          {mine.length === 0 && (
            <li className="text-sm text-stone-600 dark:text-stone-400">Aucune session.</li>
          )}
          {mine.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-1 rounded-xl bg-stone-100 pl-3 dark:bg-stone-900"
            >
              <div className="flex-1 py-2 text-sm">
                <div>{dateTime.format(s.startedAt)}</div>
                <div className="text-stone-600 dark:text-stone-400">
                  {s.endedAt === undefined
                    ? 'en cours'
                    : formatHoursMinutes(sessionDurationMs(s, now))}
                </div>
              </div>
              <Button
                variant="ghost"
                aria-label="Corriger la session"
                onClick={() => setEditing(s)}
              >
                <Pencil aria-hidden size={20} />
              </Button>
              <Button
                variant="ghost"
                aria-label="Supprimer la session"
                onClick={() => void softDelete(db.workSessions, s.id)}
              >
                <Trash2 aria-hidden size={20} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing && <SessionEditor session={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function SessionEditor({ session, onClose }: { session: WorkSession; onClose: () => void }) {
  const [start, setStart] = useState(toLocalInput(session.startedAt));
  const [end, setEnd] = useState(session.endedAt ? toLocalInput(session.endedAt) : '');
  const startMs = fromLocalInput(start);
  const endMs = end ? fromLocalInput(end) : undefined;
  const invalid = startMs === undefined || (end !== '' && (endMs === undefined || endMs < startMs));

  return (
    <Sheet open onClose={onClose} title="Corriger la session">
      <div className="flex flex-col gap-3">
        <Input
          label="Début"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input
          label="Fin (vide = en cours)"
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          error={invalid ? 'La fin doit suivre le début.' : undefined}
        />
        <Button
          disabled={invalid}
          onClick={() => {
            if (startMs === undefined) return;
            void update(db.workSessions, session.id, { startedAt: startMs, endedAt: endMs }).then(
              onClose,
            );
          }}
        >
          Enregistrer
        </Button>
      </div>
    </Sheet>
  );
}
