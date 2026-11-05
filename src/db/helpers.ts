import type { Table } from 'dexie';
import type { BaseRecord, NewRecord } from './types';

/** Horodatage courant en epoch ms (point d'entrée unique, simple à simuler en test). */
export function nowMs(): number {
  return Date.now();
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Crée un enregistrement (id, createdAt, updatedAt posés ici). `id` imposable (ex. settings). */
export async function create<T extends BaseRecord>(
  table: Table<T, string>,
  data: NewRecord<T>,
  id: string = newId(),
): Promise<T> {
  const now = nowMs();
  const record = { ...data, id, createdAt: now, updatedAt: now } as T;
  await table.add(record);
  return record;
}

/** Met à jour des champs et rafraîchit `updatedAt`. Renvoie null si l'enregistrement n'existe pas. */
export async function update<T extends BaseRecord>(
  table: Table<T, string>,
  id: string,
  changes: Partial<NewRecord<T>>,
): Promise<T | null> {
  return table.db.transaction('rw', table, async () => {
    const existing = await table.get(id);
    if (!existing) return null;
    const next = { ...existing, ...changes, id, createdAt: existing.createdAt, updatedAt: nowMs() };
    await table.put(next);
    return next;
  });
}

/** Suppression logique : pose `deletedAt` (et `updatedAt`, pour que la synchro la propage). */
export async function softDelete<T extends BaseRecord>(
  table: Table<T, string>,
  id: string,
): Promise<boolean> {
  return table.db.transaction('rw', table, async () => {
    const existing = await table.get(id);
    if (!existing) return false;
    if (existing.deletedAt !== undefined) return true;
    const now = nowMs();
    await table.put({ ...existing, deletedAt: now, updatedAt: now });
    return true;
  });
}

export function isActive(record: BaseRecord): boolean {
  return record.deletedAt === undefined;
}

/** Tous les enregistrements non supprimés. */
export async function getActive<T extends BaseRecord>(table: Table<T, string>): Promise<T[]> {
  return table.filter(isActive).toArray();
}

/** Un enregistrement par id, `undefined` s'il est absent ou supprimé. */
export async function getActiveById<T extends BaseRecord>(
  table: Table<T, string>,
  id: string,
): Promise<T | undefined> {
  const record = await table.get(id);
  return record && isActive(record) ? record : undefined;
}
