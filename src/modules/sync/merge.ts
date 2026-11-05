import type { BaseRecord } from '../../db';

/** Sérialisation JSON déterministe (clés triées) : sert aux comparaisons et au départage. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

/**
 * Compare deux versions d'un même enregistrement. Ordre total :
 * 1. `updatedAt` le plus récent ; 2. à égalité, la suppression l'emporte ;
 * 3. sinon, la sérialisation canonique la plus grande (départage arbitraire mais déterministe).
 * Renvoie > 0 si `a` gagne, < 0 si `b` gagne, 0 si identiques.
 */
export function compareVersions(a: BaseRecord, b: BaseRecord): number {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt - b.updatedAt;
  const aDel = a.deletedAt !== undefined;
  const bDel = b.deletedAt !== undefined;
  if (aDel !== bDel) return aDel ? 1 : -1;
  const sa = stableStringify(a);
  const sb = stableStringify(b);
  return sa === sb ? 0 : sa > sb ? 1 : -1;
}

/** Version gagnante entre deux versions du même enregistrement. */
export function pickWinner<T extends BaseRecord>(a: T, b: T): T {
  return compareVersions(a, b) >= 0 ? a : b;
}

/**
 * Fusion par enregistrement (dernier `updatedAt` gagnant, tombstones incluses).
 * Idempotente et commutative. Les doublons d'id dans une même liste sont aussi résolus.
 * Le résultat est trié par id.
 */
export function mergeRecords<T extends BaseRecord>(local: readonly T[], remote: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const record of [...local, ...remote]) {
    const existing = byId.get(record.id);
    byId.set(record.id, existing ? pickWinner(existing, record) : record);
  }
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Enregistrements de `merged` absents de `base` ou différents de la version de `base`. */
export function changedRecords<T extends BaseRecord>(
  merged: readonly T[],
  base: readonly T[],
): T[] {
  const baseById = new Map(base.map((r) => [r.id, r]));
  return merged.filter((r) => {
    const b = baseById.get(r.id);
    return !b || stableStringify(b) !== stableStringify(r);
  });
}

/** Les réglages `sync.*` sont propres à l'appareil : ils ne voyagent jamais. */
export const LOCAL_SETTING_PREFIX = 'sync.';

export function isSyncable(table: string, record: BaseRecord): boolean {
  if (table !== 'settings') return true;
  const key = (record as { key?: unknown }).key;
  return !(typeof key === 'string' && key.startsWith(LOCAL_SETTING_PREFIX));
}
