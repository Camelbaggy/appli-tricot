import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import { Card, EmptyState, Fab, Input, PageHeader, Select } from '../../components';
import type { StashItem, Yarn } from '../../db';
import { AddStashSheet } from './AddStashSheet';
import { ColorDot } from './ColorDot';
import {
  WEIGHT_LABELS,
  formatBalls,
  formatG,
  formatM,
  formatStock,
  gramsToBalls,
  gramsToMeters,
  yarnTitle,
} from './calc';
import { remainingOf, useStockData } from './data';
import { weightOptions } from './forms';

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function matches(yarn: Yarn, item: StashItem, q: string): boolean {
  if (!q) return true;
  const hay = normalize(
    [yarn.brand, yarn.line, yarn.fiber, item.colorway, item.dyeLot, item.location]
      .filter(Boolean)
      .join(' '),
  );
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export function FilothequePage() {
  const data = useStockData();
  const [query, setQuery] = useState('');
  const [weight, setWeight] = useState('');
  const [adding, setAdding] = useState(false);

  const view = useMemo(() => {
    if (!data) return undefined;
    const q = normalize(query.trim());
    const yarnById = new Map(data.yarns.map((y) => [y.id, y]));
    const rows = data.items
      .map((item) => ({
        item,
        yarn: yarnById.get(item.yarnId),
        left: remainingOf(item, data.consumptions),
      }))
      .filter((r): r is { item: StashItem; yarn: Yarn; left: number } => !!r.yarn);

    let totalG = 0;
    let totalM = 0;
    let totalBalls = 0;
    for (const r of rows) {
      const g = Math.max(0, r.left);
      totalG += g;
      totalM += gramsToMeters(g, r.yarn);
      totalBalls += gramsToBalls(g, r.yarn);
    }

    const groups = new Map<string, { yarn: Yarn; rows: typeof rows }>();
    for (const r of rows) {
      if (weight && r.yarn.weight !== weight) continue;
      if (!matches(r.yarn, r.item, q)) continue;
      const g = groups.get(r.yarn.id) ?? { yarn: r.yarn, rows: [] };
      g.rows.push(r);
      groups.set(r.yarn.id, g);
    }
    const list = [...groups.values()].sort((a, b) =>
      yarnTitle(a.yarn).localeCompare(yarnTitle(b.yarn), 'fr'),
    );
    for (const g of list)
      g.rows.sort((a, b) => a.item.colorway.localeCompare(b.item.colorway, 'fr'));
    return { total: { totalG, totalM, totalBalls, count: rows.length }, groups: list };
  }, [data, query, weight]);

  return (
    <>
      <PageHeader title="Laine" />
      {!view ? (
        <p className="py-8 text-center text-stone-600 dark:text-stone-400">Chargement…</p>
      ) : view.total.count === 0 ? (
        <EmptyState
          icon={<Package size={40} />}
          title="Aucune pelote en stock"
          description="Ajoutez vos pelotes (marque, coloris, métrage) pour suivre votre stock."
        />
      ) : (
        <div className="flex flex-col gap-4 pb-24">
          <Card aria-label="Total du stock">
            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Total du stock</p>
            <p className="text-xl font-bold">
              {formatBalls(view.total.totalBalls)} · {formatG(view.total.totalG)} ·{' '}
              {formatM(view.total.totalM)}
            </p>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {view.total.count} {view.total.count > 1 ? 'coloris en stock' : 'coloris en stock'}
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <Input
              label="Recherche"
              type="search"
              value={query}
              placeholder="Marque, coloris, bain…"
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              label="Grosseur"
              value={weight}
              options={[{ value: '', label: 'Toutes les grosseurs' }, ...weightOptions]}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {view.groups.length === 0 ? (
            <p className="py-6 text-center text-stone-600 dark:text-stone-400">
              Aucune pelote ne correspond.
            </p>
          ) : (
            view.groups.map(({ yarn, rows }) => (
              <section key={yarn.id} aria-label={yarnTitle(yarn)}>
                <h2 className="text-lg font-semibold">{yarnTitle(yarn)}</h2>
                <p className="mb-2 text-sm text-stone-600 dark:text-stone-400">
                  {WEIGHT_LABELS[yarn.weight]}
                  {yarn.fiber ? ` · ${yarn.fiber}` : ''} · {yarn.ballWeightG} g / {yarn.ballLengthM}{' '}
                  m
                </p>
                <ul className="flex flex-col gap-2">
                  {rows.map(({ item, left }) => (
                    <li key={item.id}>
                      <Link
                        to={`/filotheque/${item.id}`}
                        className="flex min-h-touch items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-800"
                      >
                        <ColorDot hex={item.colorHex} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {item.colorway}
                            {item.dyeLot ? ` · bain ${item.dyeLot}` : ''}
                          </span>
                          <span
                            className={
                              left <= 0
                                ? 'block text-sm text-red-700 dark:text-red-400'
                                : 'block text-sm text-stone-600 dark:text-stone-400'
                            }
                          >
                            {formatStock(Math.max(0, left), yarn)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}
      <Fab label="Ajouter une pelote" icon={<Plus size={26} />} onClick={() => setAdding(true)} />
      {adding && data && <AddStashSheet yarns={data.yarns} onClose={() => setAdding(false)} />}
    </>
  );
}
