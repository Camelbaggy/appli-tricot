import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink, Pencil, Play, Trash2 } from 'lucide-react';
import { create, db, isActive, softDelete, update, useActive, useActiveById } from '../../db';
import { Button, Card, EmptyState, PageHeader, Sheet } from '../../components';
import { readerPath } from '../tricot';

import { FileThumb } from './FileThumb';
import { PatternForm } from './PatternForm';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  YARN_WEIGHT_LABELS,
  isKnitted,
  projectsForPattern,
} from './logic';

function FileRow({ fileId }: { fileId: string }) {
  const file = useActiveById(db.files, fileId);
  if (!file) return null;
  return (
    <li className="flex items-center gap-3">
      <FileThumb fileId={fileId} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{file.name}</p>
        <Link
          to={readerPath(fileId)}
          className="inline-flex min-h-touch items-center gap-2 text-brand-700 underline dark:text-brand-100"
        >
          <BookOpen size={18} aria-hidden="true" /> Ouvrir dans la liseuse
        </Link>
      </div>
    </li>
  );
}

export function PatternDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pattern = useActiveById(db.patterns, id);
  const projects = useActive(db.projects);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!pattern) {
    return (
      <EmptyState
        title="Patron introuvable"
        action={
          <Link to="/patrons" className="text-brand-700 underline dark:text-brand-100">
            Retour aux patrons
          </Link>
        }
      />
    );
  }

  const active = (projects ?? []).filter(isActive);
  const history = projectsForPattern(pattern.id, active);
  const knitted = isKnitted(pattern, active);
  const autoKnitted = !pattern.knitted && knitted;

  const details = [
    pattern.yarnWeight && `Fil : ${YARN_WEIGHT_LABELS[pattern.yarnWeight]}`,
    (pattern.yardageMin !== undefined || pattern.yardageMax !== undefined) &&
      `Métrage : ${[pattern.yardageMin, pattern.yardageMax].filter((v) => v !== undefined).join(' à ')} m`,
    pattern.needleSizeMm !== undefined && `Aiguilles : ${pattern.needleSizeMm} mm`,
  ].filter(Boolean) as string[];

  async function startProject() {
    if (!pattern) return;
    const p = await create(db.projects, {
      name: pattern.title,
      status: 'a_venir',
      recipientType: 'soi',
      isPro: false,
      patternId: pattern.id,
    });
    navigate(`/projets/${p.id}`);
  }

  async function remove() {
    if (!pattern) return;
    await softDelete(db.patterns, pattern.id);
    navigate('/patrons', { replace: true });
  }

  return (
    <>
      <Link
        to="/patrons"
        className="mb-2 inline-flex min-h-touch items-center gap-1 text-brand-700 dark:text-brand-100"
      >
        <ArrowLeft size={18} aria-hidden="true" /> Patrons
      </Link>
      <PageHeader
        title={pattern.title}
        subtitle={[pattern.designer, CATEGORY_LABELS[pattern.category]].filter(Boolean).join(' · ')}
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

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2">
          <label className="flex min-h-touch items-center gap-3">
            <input
              type="checkbox"
              checked={knitted}
              disabled={autoKnitted}
              onChange={(e) => update(db.patterns, pattern.id, { knitted: e.target.checked })}
              className="h-6 w-6 accent-brand-600"
            />
            <span>Déjà tricoté{autoKnitted ? ' (projet terminé)' : ''}</span>
          </label>
          {details.map((d) => (
            <p key={d}>{d}</p>
          ))}
          {pattern.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {pattern.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-full bg-stone-200 px-3 py-1 text-sm dark:bg-stone-700"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
          {pattern.sourceUrl && (
            <a
              href={pattern.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-touch items-center gap-2 text-brand-700 underline dark:text-brand-100"
            >
              <ExternalLink size={18} aria-hidden="true" /> Lien source
            </a>
          )}
        </Card>

        <Button onClick={startProject} fullWidth>
          <Play size={18} aria-hidden="true" /> Démarrer un projet avec ce patron
        </Button>

        <Card>
          <h2 className="mb-2 text-lg font-semibold">Fichiers</h2>
          {pattern.fileIds.length === 0 ? (
            <p className="text-stone-600 dark:text-stone-400">Aucun fichier joint.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pattern.fileIds.map((fid) => (
                <FileRow key={fid} fileId={fid} />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold">Projets réalisés</h2>
          {history.length === 0 ? (
            <p className="text-stone-600 dark:text-stone-400">Aucun projet avec ce patron.</p>
          ) : (
            <ul className="flex flex-col">
              {history.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projets/${p.id}`}
                    className="flex min-h-touch items-center justify-between gap-3 text-brand-700 underline dark:text-brand-100"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-sm text-stone-600 no-underline dark:text-stone-400">
                      {STATUS_LABELS[p.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {editing && <PatternForm open pattern={pattern} onClose={() => setEditing(false)} />}
      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer ce patron ?"
      >
        <p className="mb-4 text-stone-700 dark:text-stone-300">
          « {pattern.title} » sera retiré de votre bibliothèque. Les projets liés sont conservés.
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
