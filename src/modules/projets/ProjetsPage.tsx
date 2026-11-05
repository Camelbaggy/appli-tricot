import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus } from 'lucide-react';
import { db, isActive, useActive } from '../../db';
import type { ProjectStatus } from '../../db';
import { Card, EmptyState, Fab, PageHeader } from '../../components';
import { cn } from '../../lib/cn';
import { ProjectForm } from './ProjectForm';
import { STATUS_LABELS, STATUS_ORDER, formatDates, groupByStatus, recipientLabel } from './logic';

export function ProjetsPage() {
  const projects = useActive(db.projects);
  const patterns = useActive(db.patterns);
  const [tab, setTab] = useState<ProjectStatus>('en_cours');
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => groupByStatus((projects ?? []).filter(isActive)), [projects]);
  const patternTitles = useMemo(
    () => new Map((patterns ?? []).map((p) => [p.id, p.title])),
    [patterns],
  );
  const list = groups[tab];

  return (
    <>
      <PageHeader title="Projets" />
      <div
        role="tablist"
        aria-label="Statut des projets"
        className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-stone-200 p-1 dark:bg-stone-800"
      >
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={cn(
              'min-h-touch rounded-xl px-1 text-sm font-medium',
              tab === s
                ? 'bg-white text-brand-700 shadow-sm dark:bg-stone-600 dark:text-white'
                : 'text-stone-600 dark:text-stone-300',
            )}
          >
            {STATUS_LABELS[s]} ({groups[s].length})
          </button>
        ))}
      </div>

      {projects && list.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={40} />}
          title={
            tab === 'a_venir'
              ? 'Rien à venir'
              : tab === 'en_cours'
                ? 'Rien en cours'
                : 'Rien de terminé'
          }
          description="Touchez + pour créer un projet."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((p) => {
            const dates = formatDates(p);
            const patternTitle = p.patternId ? patternTitles.get(p.patternId) : undefined;
            return (
              <li key={p.id}>
                <Link to={`/projets/${p.id}`} className="block">
                  <Card className="flex flex-col gap-1">
                    <span className="text-lg font-semibold">{p.name}</span>
                    <span className="text-sm text-stone-600 dark:text-stone-400">
                      {recipientLabel(p)}
                      {p.isPro ? ' · Pièce pro' : ''}
                    </span>
                    {patternTitle && <span className="text-sm">Patron : {patternTitle}</span>}
                    {dates && (
                      <span className="text-sm text-stone-600 dark:text-stone-400">{dates}</span>
                    )}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Fab label="Nouveau projet" icon={<Plus />} onClick={() => setCreating(true)} />
      {creating && <ProjectForm open onClose={() => setCreating(false)} />}
    </>
  );
}
