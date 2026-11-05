import type { Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { getActive, getActiveById } from './helpers';
import type { BaseRecord } from './types';

/**
 * Liste réactive des enregistrements non supprimés. `undefined` pendant le premier chargement.
 * Pour une requête plus fine, utiliser `useLiveQuery` avec `isActive` ou un index.
 */
export function useActive<T extends BaseRecord>(table: Table<T, string>): T[] | undefined {
  return useLiveQuery(() => getActive(table), [table]);
}

/** Enregistrement réactif par id ; `undefined` si chargement en cours, absent ou supprimé. */
export function useActiveById<T extends BaseRecord>(
  table: Table<T, string>,
  id: string | undefined,
): T | undefined {
  return useLiveQuery(() => (id ? getActiveById(table, id) : undefined), [table, id]);
}
