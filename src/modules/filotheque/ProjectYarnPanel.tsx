/**
 * Panneau affiché dans la fiche d'un projet : fils associés et consommations (déduites du stock).
 * Contrat : implémenté par le module filothèque, rendu par la fiche projet (module projets).
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Select, Sheet } from '../../components';
import { create, db, isActive, softDelete, update, type Consumption } from '../../db';
import { ColorDot } from './ColorDot';
import {
  computeMaterialCost,
  formatEuro,
  formatG,
  formatM,
  gramsToMeters,
  remainingG,
  yarnTitle,
} from './calc';
import { useStockData, type StockData } from './data';
import { QuantityField } from './QuantityField';

function ConsumptionSheet({
  data,
  projectId,
  editing,
  onClose,
}: {
  data: StockData;
  projectId: string;
  editing?: Consumption;
  onClose: () => void;
}) {
  const yarnById = new Map(data.yarns.map((y) => [y.id, y]));
  const options = data.items
    .filter((i) => yarnById.has(i.yarnId))
    .map((i) => ({ item: i, yarn: yarnById.get(i.yarnId)! }))
    .sort((a, b) =>
      `${yarnTitle(a.yarn)} ${a.item.colorway}`.localeCompare(
        `${yarnTitle(b.yarn)} ${b.item.colorway}`,
        'fr',
      ),
    );
  const [itemId, setItemId] = useState(editing?.stashItemId ?? options[0]?.item.id ?? '');
  const [grams, setGrams] = useState<number | undefined>(editing?.quantityG);
  const [error, setError] = useState<string>();

  const chosen = options.find((o) => o.item.id === itemId);
  // restant en ignorant la consommation en cours d'édition
  const left = chosen
    ? remainingG(
        chosen.item.initialQuantityG,
        data.consumptions.filter((c) => c.stashItemId === chosen.item.id && c.id !== editing?.id),
      )
    : 0;
  const exceeds = chosen !== undefined && grams !== undefined && grams > left;

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Modifier la consommation' : 'Ajouter une consommation'}
    >
      {options.length === 0 ? (
        <>
          <p className="mb-4 text-stone-700 dark:text-stone-300">
            Votre stock est vide. Ajoutez d'abord des pelotes dans l'onglet Laine.
          </p>
          <Button fullWidth variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </>
      ) : (
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!chosen) return;
            if (grams === undefined || grams <= 0) {
              setError('Indiquez une quantité supérieure à 0.');
              return;
            }
            if (editing)
              await update(db.consumptions, editing.id, {
                stashItemId: chosen.item.id,
                quantityG: grams,
              });
            else
              await create(db.consumptions, {
                projectId,
                stashItemId: chosen.item.id,
                quantityG: grams,
              });
            onClose();
          }}
        >
          <Select
            label="Pelote"
            value={itemId}
            options={options.map(({ item, yarn }) => ({
              value: item.id,
              label: `${yarnTitle(yarn)} · ${item.colorway}`,
            }))}
            onChange={(e) => {
              setItemId(e.target.value);
              setGrams(undefined);
            }}
          />
          {chosen && (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Restant en stock : {formatG(Math.max(0, left))} ·{' '}
              {formatM(gramsToMeters(Math.max(0, left), chosen.yarn))}
            </p>
          )}
          {chosen && (
            <QuantityField
              key={chosen.item.id}
              label="Quantité utilisée"
              spec={chosen.yarn}
              initialG={chosen.item.id === editing?.stashItemId ? editing.quantityG : undefined}
              onChange={(g) => {
                setGrams(g);
                setError(undefined);
              }}
              error={error}
            />
          )}
          {exceeds && (
            <p
              role="alert"
              className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
            >
              Attention : cette quantité dépasse le restant en stock ({formatG(Math.max(0, left))}).
              Vous pouvez quand même enregistrer.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              Enregistrer
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

/** Section « Laine utilisée » de la fiche projet. */
export function ProjectYarnPanel({ projectId }: { projectId: string }) {
  const data = useStockData();
  const projectConsumptions = useLiveQuery(
    () => db.consumptions.where('projectId').equals(projectId).filter(isActive).toArray(),
    [projectId],
  );
  // pelotes/fils supprimés logiquement : on les lit quand même pour garder l'affichage des lignes
  const refs = useLiveQuery(async () => {
    const cs = await db.consumptions
      .where('projectId')
      .equals(projectId)
      .filter(isActive)
      .toArray();
    const items = (await db.stashItems.bulkGet([...new Set(cs.map((c) => c.stashItemId))])).filter(
      (s) => !!s,
    );
    const yarns = (await db.yarns.bulkGet([...new Set(items.map((s) => s!.yarnId))])).filter(
      (y) => !!y,
    );
    return {
      items: items as NonNullable<(typeof items)[number]>[],
      yarns: yarns as NonNullable<(typeof yarns)[number]>[],
    };
  }, [projectId]);

  const [sheet, setSheet] = useState<{ editing?: Consumption } | null>(null);
  const [deleting, setDeleting] = useState<Consumption | null>(null);

  const items = refs?.items ?? [];
  const yarns = refs?.yarns ?? [];
  const lines = (projectConsumptions ?? []).slice().sort((a, b) => a.createdAt - b.createdAt);
  const total = computeMaterialCost(lines, items, yarns);

  return (
    <section aria-label="Laine utilisée" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Laine utilisée</h2>
      {lines.length === 0 ? (
        <p className="text-stone-600 dark:text-stone-400">
          Aucune laine renseignée pour ce projet.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {lines.map((c) => {
              const item = items.find((i) => i.id === c.stashItemId);
              const yarn = item ? yarns.find((y) => y.id === item.yarnId) : undefined;
              return (
                <li key={c.id}>
                  <Card className="flex items-center gap-3 p-3">
                    <ColorDot hex={item?.colorHex} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {yarn ? yarnTitle(yarn) : 'Pelote supprimée'}
                      </p>
                      <p className="truncate text-sm text-stone-600 dark:text-stone-400">
                        {item?.colorway ? `${item.colorway} · ` : ''}
                        {formatG(c.quantityG)}
                        {yarn ? ` · ${formatM(gramsToMeters(c.quantityG, yarn))}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`Modifier la consommation ${item?.colorway ?? ''}`.trim()}
                      onClick={() => setSheet({ editing: c })}
                    >
                      <Pencil size={18} aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Supprimer la consommation ${item?.colorway ?? ''}`.trim()}
                      onClick={() => setDeleting(c)}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="font-medium" data-testid="yarn-total">
            Total : {formatG(total.totalG)} · {formatM(total.totalM)} · coût matière{' '}
            {formatEuro(total.totalCost)}
            {total.hasUnpriced && (
              <span className="block text-sm font-normal text-stone-600 dark:text-stone-400">
                Certaines pelotes n'ont pas de prix : coût sous-estimé.
              </span>
            )}
          </p>
        </>
      )}
      <Button variant="secondary" fullWidth onClick={() => setSheet({})} disabled={!data}>
        <Plus size={20} aria-hidden="true" /> Ajouter une consommation
      </Button>

      {sheet && data && (
        <ConsumptionSheet
          data={data}
          projectId={projectId}
          editing={sheet.editing}
          onClose={() => setSheet(null)}
        />
      )}
      <Sheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Supprimer cette consommation ?"
      >
        <p className="mb-4 text-stone-700 dark:text-stone-300">
          {deleting ? formatG(deleting.quantityG) : ''} seront remis dans le stock de la pelote.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleting(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={async () => {
              if (deleting) await softDelete(db.consumptions, deleting.id);
              setDeleting(null);
            }}
          >
            Supprimer
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
