import { useLiveQuery } from 'dexie-react-hooks';
import { db, isActive, type Consumption, type StashItem, type Yarn } from '../../db';
import { computeMaterialCost, remainingG, type MaterialCost } from './calc';

export interface StockData {
  yarns: Yarn[];
  items: StashItem[];
  consumptions: Consumption[];
}

/** Fils, pelotes et consommations actifs (réactif). `undefined` pendant le chargement. */
export function useStockData(): StockData | undefined {
  return useLiveQuery(async () => {
    const [yarns, items, consumptions] = await Promise.all([
      db.yarns.filter(isActive).toArray(),
      db.stashItems.filter(isActive).toArray(),
      db.consumptions.filter(isActive).toArray(),
    ]);
    return { yarns, items, consumptions };
  }, []);
}

/** Restant (g) d'une pelote d'après les consommations actives. */
export function remainingOf(item: StashItem, consumptions: readonly Consumption[]): number {
  return remainingG(
    item.initialQuantityG,
    consumptions.filter((c) => c.stashItemId === item.id),
  );
}

/**
 * Coût matière d'un projet : g, m et euros (somme quantité × prix par pelote / poids pelote).
 * Utilisable hors React (Espace Pro). Les pelotes/fils supprimés logiquement comptent encore :
 * leur prix reste connu.
 */
export async function projectMaterialCost(projectId: string): Promise<MaterialCost> {
  const consumptions = await db.consumptions
    .where('projectId')
    .equals(projectId)
    .filter(isActive)
    .toArray();
  const itemIds = [...new Set(consumptions.map((c) => c.stashItemId))];
  const items = (await db.stashItems.bulkGet(itemIds)).filter((s): s is StashItem => !!s);
  const yarnIds = [...new Set(items.map((s) => s.yarnId))];
  const yarns = (await db.yarns.bulkGet(yarnIds)).filter((y): y is Yarn => !!y);
  return computeMaterialCost(consumptions, items, yarns);
}
