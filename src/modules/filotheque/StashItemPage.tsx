import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, Sheet } from '../../components';
import { db, isActive, softDelete, update, useActiveById, type Project } from '../../db';
import { ColorDot } from './ColorDot';
import {
  WEIGHT_LABELS,
  formatBalls,
  formatEuro,
  formatG,
  formatM,
  formatStock,
  gramsToBalls,
  gramsToMeters,
  remainingG,
  sumConsumedG,
  yarnTitle,
} from './calc';
import { StashItemForm } from './forms';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-stone-600 dark:text-stone-400">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function StashItemPage() {
  const { stashItemId } = useParams();
  const navigate = useNavigate();
  const item = useActiveById(db.stashItems, stashItemId);
  const yarn = useActiveById(db.yarns, item?.yarnId);
  const history = useLiveQuery(async () => {
    if (!stashItemId) return [];
    const consumptions = await db.consumptions
      .where('stashItemId')
      .equals(stashItemId)
      .filter(isActive)
      .toArray();
    const projects = await db.projects.bulkGet([...new Set(consumptions.map((c) => c.projectId))]);
    const byId = new Map(projects.filter((p): p is Project => !!p).map((p) => [p.id, p]));
    return consumptions
      .map((c) => ({ c, project: byId.get(c.projectId) }))
      .sort((a, b) => b.c.createdAt - a.c.createdAt);
  }, [stashItemId]);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const back = (
    <Link
      to="/filotheque"
      className="mb-3 inline-flex min-h-touch items-center gap-1 text-brand-700 dark:text-brand-100"
    >
      <ArrowLeft size={20} aria-hidden="true" /> Laine
    </Link>
  );

  if (item === undefined || yarn === undefined || history === undefined) {
    // chargement ou introuvable : on distingue en laissant Dexie résoudre
    return (
      <>
        {back}
        <EmptyState
          title="Pelote introuvable"
          description="Elle a peut-être été supprimée, ou le chargement est en cours."
        />
      </>
    );
  }

  const consumed = sumConsumedG(history.map((h) => h.c));
  const left = remainingG(
    item.initialQuantityG,
    history.map((h) => h.c),
  );

  return (
    <>
      {back}
      <PageHeader
        title={item.colorway}
        subtitle={yarnTitle(yarn)}
        actions={
          <>
            <Button variant="secondary" aria-label="Modifier" onClick={() => setEditing(true)}>
              <Pencil size={20} aria-hidden="true" />
            </Button>
            <Button variant="danger" aria-label="Supprimer" onClick={() => setConfirming(true)}>
              <Trash2 size={20} aria-hidden="true" />
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-4 pb-24">
        <Card>
          <div className="flex items-center gap-3">
            <ColorDot hex={item.colorHex} size={40} />
            <div>
              <p className="text-sm text-stone-600 dark:text-stone-400">Restant</p>
              <p
                className={
                  left <= 0
                    ? 'text-lg font-bold text-red-700 dark:text-red-400'
                    : 'text-lg font-bold'
                }
              >
                {formatStock(Math.max(0, left), yarn)}
              </p>
            </div>
          </div>
          {left < 0 && (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
              Consommations supérieures au stock initial de {formatG(-left)}.
            </p>
          )}
        </Card>

        <Card>
          <dl className="divide-y divide-stone-200 dark:divide-stone-700">
            <Row label="Fil">{yarnTitle(yarn)}</Row>
            <Row label="Grosseur">{WEIGHT_LABELS[yarn.weight]}</Row>
            {yarn.fiber && <Row label="Composition">{yarn.fiber}</Row>}
            <Row label="Pelote">
              {yarn.ballWeightG} g · {yarn.ballLengthM} m
            </Row>
            {yarn.needleSizeMm !== undefined && <Row label="Aiguilles">{yarn.needleSizeMm} mm</Row>}
            {item.dyeLot && <Row label="Bain">{item.dyeLot}</Row>}
            <Row label="Quantité initiale">
              {formatBalls(gramsToBalls(item.initialQuantityG, yarn))} ·{' '}
              {formatG(item.initialQuantityG)} ·{' '}
              {formatM(gramsToMeters(item.initialQuantityG, yarn))}
            </Row>
            <Row label="Consommé">{formatG(consumed)}</Row>
            {item.pricePerBall !== undefined && (
              <Row label="Prix par pelote">{formatEuro(item.pricePerBall)}</Row>
            )}
            {item.location && <Row label="Emplacement">{item.location}</Row>}
          </dl>
          {item.notes && (
            <p className="mt-3 whitespace-pre-wrap text-stone-700 dark:text-stone-300">
              {item.notes}
            </p>
          )}
        </Card>

        <section aria-label="Historique des consommations">
          <h2 className="mb-2 text-lg font-semibold">Consommations</h2>
          {history.length === 0 ? (
            <p className="text-stone-600 dark:text-stone-400">Cette pelote n'a pas encore servi.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map(({ c, project }) => (
                <li
                  key={c.id}
                  className="flex min-h-touch items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-800"
                >
                  {project && isActive(project) ? (
                    <Link
                      to={`/projets/${project.id}`}
                      className="font-medium text-brand-700 underline dark:text-brand-100"
                    >
                      {project.name}
                    </Link>
                  ) : (
                    <span className="text-stone-600 dark:text-stone-400">Projet supprimé</span>
                  )}
                  <span className="shrink-0 text-sm">
                    {formatG(c.quantityG)} · {formatM(gramsToMeters(c.quantityG, yarn))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <Sheet open onClose={() => setEditing(false)} title="Modifier la pelote">
          <StashItemForm
            spec={yarn}
            yarnId={item.yarnId}
            initial={item}
            submitLabel="Enregistrer"
            onCancel={() => setEditing(false)}
            onSubmit={async (data) => {
              await update(db.stashItems, item.id, data);
              setEditing(false);
            }}
          />
        </Sheet>
      )}
      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Supprimer cette pelote ?"
      >
        <p className="mb-4 text-stone-700 dark:text-stone-300">
          {item.colorway} ({yarnTitle(yarn)}) sera retirée du stock.
          {history.length > 0 && ' Les consommations des projets liés resteront enregistrées.'}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={async () => {
              await softDelete(db.stashItems, item.id);
              navigate('/filotheque', { replace: true });
            }}
          >
            Supprimer
          </Button>
        </div>
      </Sheet>
    </>
  );
}
