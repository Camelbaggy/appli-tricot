import { db, update } from '../../db';
import { applyDelta } from './counters';

/**
 * Ajoute `delta` à un compteur en relisant sa valeur dans une transaction.
 * Deux appuis rapides ne doivent jamais partir de la même valeur affichée (rang perdu).
 */
export async function stepCounter(id: string, delta: 1 | -1): Promise<void> {
  await db.transaction('rw', db.counters, async () => {
    const counter = await db.counters.get(id);
    if (!counter || counter.deletedAt !== undefined) return;
    const value = applyDelta(counter.value, delta);
    if (value !== counter.value) await update(db.counters, id, { value });
  });
}
