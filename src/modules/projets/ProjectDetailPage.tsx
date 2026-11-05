import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { db, softDelete, update, useActiveById } from '../../db';
import type { ProjectStatus } from '../../db';
import { Button, Card, EmptyState, PageHeader, Sheet } from '../../components';
import { cn } from '../../lib/cn';
import { ProjectTricotPanel, readerPath } from '../tricot';
import { ProjectYarnPanel } from '../filotheque';
import { ProjectForm } from './ProjectForm';
import { STATUS_ORDER, STATUS_SINGULAR, formatDate, recipientLabel, statusChanges } from './logic';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useActiveById(db.projects, id);
  const pattern = useActiveById(db.patterns, project?.patternId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!project) {
    return (
      <EmptyState
        title="Projet introuvable"
        action={
          <Link to="/projets" className="text-brand-700 underline dark:text-brand-100">
            Retour aux projets
          </Link>
        }
      />
    );
  }

  const firstFileId = pattern?.fileIds[0];

  async function changeStatus(status: ProjectStatus) {
    if (!project || status === project.status) return;
    await update(db.projects, project.id, statusChanges(project, status));
  }

  async function remove() {
    if (!project) return;
    await softDelete(db.projects, project.id);
    navigate('/projets', { replace: true });
  }

  return (
    <>
      <Link
        to="/projets"
        className="mb-2 inline-flex min-h-touch items-center gap-1 text-brand-700 dark:text-brand-100"
      >
        <ArrowLeft size={18} aria-hidden="true" /> Projets
      </Link>
      <PageHeader
        title={project.name}
        subtitle={recipientLabel(project)}
        actions={
          <>
            <Button variant="secondary" aria-label="Modifier" onClick={() => setEditing(true)}>
              <Pencil size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              aria-label="Supprimer"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={18} aria-hidden="true" />
            </Button>
          </>
        }
      />

      <div
        role="group"
        aria-label="Statut"
        className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-stone-200 p-1 dark:bg-stone-800"
      >
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={project.status === s}
            onClick={() => changeStatus(s)}
            className={cn(
              'min-h-touch rounded-xl px-1 text-sm font-medium',
              project.status === s
                ? 'bg-brand-600 text-white'
                : 'text-stone-600 dark:text-stone-300',
            )}
          >
            {STATUS_SINGULAR[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {(project.startDate || project.endDate || project.isPro || project.notes) && (
          <Card className="flex flex-col gap-1">
            <Info label="Début" value={formatDate(project.startDate)} />
            <Info label="Fin" value={formatDate(project.endDate)} />
            <Info label="Pièce pro" value={project.isPro ? 'Oui' : ''} />
            {project.notes && (
              <p className="mt-2 whitespace-pre-wrap text-stone-700 dark:text-stone-300">
                {project.notes}
              </p>
            )}
          </Card>
        )}

        {pattern && (
          <Card className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-stone-600 dark:text-stone-400">Patron</h2>
            <Link
              to={`/patrons/${pattern.id}`}
              className="text-lg font-semibold text-brand-700 underline dark:text-brand-100"
            >
              {pattern.title}
            </Link>
            {firstFileId && (
              <Link
                to={readerPath(firstFileId)}
                className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 font-medium text-white"
              >
                <BookOpen size={18} aria-hidden="true" /> Ouvrir dans la liseuse
              </Link>
            )}
          </Card>
        )}

        <ProjectTricotPanel projectId={project.id} />
        <ProjectYarnPanel projectId={project.id} />
      </div>

      {editing && <ProjectForm open project={project} onClose={() => setEditing(false)} />}
      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer ce projet ?"
      >
        <p className="mb-4 text-stone-700 dark:text-stone-300">
          « {project.name} » sera retiré de vos projets.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
          <Button variant="danger" className="flex-1" onClick={remove}>
            Supprimer
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="flex justify-between gap-3">
      <span className="text-stone-600 dark:text-stone-400">{label}</span>
      <span>{value}</span>
    </p>
  );
}
