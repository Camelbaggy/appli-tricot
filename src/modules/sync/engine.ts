import Dexie from 'dexie';
import { TABLE_NAMES, type AppDatabase, type BaseRecord, type TableName } from '../../db';
import type { DriveClient, DriveFile } from './driveClient';
import { changedRecords, isSyncable, mergeRecords } from './merge';

/** Enregistrement générique : la synchro ne connaît pas les champs métier. */
export type AnyRecord = BaseRecord & Record<string, unknown>;

/** Tables dont les enregistrements sont fusionnés (toutes ; `files` sans son Blob). */
export const SYNCED_TABLES: readonly TableName[] = TABLE_NAMES;

export interface SyncResult {
  /** enregistrements écrits en local */
  pulled: number;
  /** tables réécrites sur le Drive */
  pushedTables: number;
  blobsUploaded: number;
  blobsDownloaded: number;
}

export const tableFileName = (table: string) => `${table}.json`;
export const blobFileName = (id: string) => `file-${id}`;

/** Marque la transaction courante comme écriture de la synchro (les hooks l'ignorent). */
const OWN_WRITE = '__syncOwnWrite';

/** Vrai si le hook Dexie est déclenché par une écriture de la synchro elle-même. */
export function isOwnWrite(): boolean {
  const tx = Dexie.currentTransaction as unknown as Record<string, unknown> | null;
  return !!tx && tx[OWN_WRITE] === true;
}

/** Enlève le Blob d'un enregistrement `files` (le JSON ne contient que les métadonnées). */
export function stripBlob(table: string, record: AnyRecord): AnyRecord {
  if (table !== 'files') return record;
  const copy = { ...record };
  delete copy.blob;
  return copy;
}

export async function readLocalMeta(db: AppDatabase, table: TableName): Promise<AnyRecord[]> {
  const rows = (await db.table(table).toArray()) as AnyRecord[];
  return rows.filter((r) => isSyncable(table, r)).map((r) => stripBlob(table, r));
}

export interface MergeOutcome {
  /** résultat de la fusion (sans Blob) */
  merged: AnyRecord[];
  /** état local (sans Blob) avant fusion */
  local: AnyRecord[];
  written: number;
  blobsFetched: number;
}

/**
 * Fusionne `incoming` dans la table locale et écrit le résultat avec `bulkPut` — sans toucher
 * à `updatedAt` (seule exception aux helpers de src/db). Pour `files`, les Blobs locaux sont
 * conservés ; les Blobs manquants sont demandés à `resolveBlob` (un enregistrement dont le Blob
 * reste introuvable n'est pas écrit : il sera retenté à la synchro suivante).
 */
export async function mergeIntoLocal(
  db: AppDatabase,
  name: TableName,
  incoming: readonly AnyRecord[],
  options: {
    resolveBlob?: (record: AnyRecord) => Promise<Blob | undefined>;
    /** false : les hooks Dexie réagissent (ex. restauration, qui doit déclencher une synchro) */
    silent?: boolean;
  } = {},
): Promise<MergeOutcome> {
  const silent = options.silent ?? true;
  const table = db.table<AnyRecord, string>(name);
  const local = await readLocalMeta(db, name);
  const merged = mergeRecords(
    local,
    incoming.filter((r) => isSyncable(name, r)).map((r) => stripBlob(name, r)),
  );
  const toWrite = changedRecords(merged, local);
  const rows: AnyRecord[] = [];
  let blobsFetched = 0;

  for (const record of toWrite) {
    if (name !== 'files') {
      rows.push(record);
      continue;
    }
    const existing = (await table.get(record.id)) as AnyRecord | undefined;
    let blob = existing?.blob as Blob | undefined;
    if (!blob && record.deletedAt === undefined) {
      blob = await options.resolveBlob?.(record);
      if (blob) blobsFetched++;
    }
    if (!blob && record.deletedAt === undefined) continue;
    rows.push({ ...record, blob: blob ?? new Blob([]) });
  }

  if (rows.length > 0) {
    await db.transaction('rw', table, async () => {
      if (silent)
        (Dexie.currentTransaction as unknown as Record<string, unknown>)[OWN_WRITE] = true;
      await table.bulkPut(rows);
    });
  }
  return { merged, local, written: rows.length, blobsFetched };
}

function jsonBlob(records: AnyRecord[]): Blob {
  return new Blob([JSON.stringify(records)], { type: 'application/json' });
}

async function readRemoteTable(client: DriveClient, file: DriveFile | undefined) {
  if (!file) return [] as AnyRecord[];
  const text = await (await client.download(file.id)).text();
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error(`Fichier distant invalide : ${file.name}`);
  return parsed as AnyRecord[];
}

/** Envoie une seule fois le Blob de chaque fichier local (jamais ceux importés depuis le Drive). */
async function uploadMissingBlobs(
  db: AppDatabase,
  client: DriveClient,
  merged: readonly AnyRecord[],
  byName: Map<string, DriveFile>,
): Promise<number> {
  let uploaded = 0;
  for (const record of merged) {
    if (record.deletedAt !== undefined) continue;
    if (record.source === 'drive' && record.driveFileId) continue;
    const name = blobFileName(record.id);
    if (byName.has(name)) continue;
    const local = (await db.files.get(record.id)) as { blob?: Blob } | undefined;
    if (!local?.blob) continue;
    const created = await client.create(name, local.blob);
    byName.set(name, created);
    uploaded++;
  }
  return uploaded;
}

/**
 * Synchro complète : pour chaque table, télécharge le JSON distant, fusionne, écrit en local,
 * puis réécrit le distant s'il diffère. Aucune détection de verrou ici (voir `controller.ts`).
 */
export async function syncAll(db: AppDatabase, client: DriveClient): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushedTables: 0, blobsUploaded: 0, blobsDownloaded: 0 };
  const listing = await client.list();
  const byName = new Map<string, DriveFile>();
  for (const file of listing) if (!byName.has(file.name)) byName.set(file.name, file);

  for (const name of SYNCED_TABLES) {
    const remoteFile = byName.get(tableFileName(name));
    const remote = (await readRemoteTable(client, remoteFile)).filter((r) => isSyncable(name, r));

    const outcome = await mergeIntoLocal(db, name, remote, {
      resolveBlob: async (record) => {
        const remoteBlob = byName.get(blobFileName(record.id));
        const driveFileId = typeof record.driveFileId === 'string' ? record.driveFileId : undefined;
        const fileId = remoteBlob?.id ?? driveFileId;
        if (!fileId) return undefined;
        try {
          const data = await client.download(fileId);
          const mimeType = typeof record.mimeType === 'string' ? record.mimeType : '';
          return mimeType && data.type !== mimeType ? new Blob([data], { type: mimeType }) : data;
        } catch {
          return undefined;
        }
      },
    });
    result.pulled += outcome.written;
    result.blobsDownloaded += outcome.blobsFetched;

    if (name === 'files') {
      result.blobsUploaded += await uploadMissingBlobs(db, client, outcome.merged, byName);
    }
    if (
      changedRecords(outcome.merged, remote).length > 0 ||
      (!remoteFile && outcome.merged.length > 0)
    ) {
      const data = jsonBlob(outcome.merged);
      if (remoteFile) await client.update(remoteFile.id, data);
      else byName.set(tableFileName(name), await client.create(tableFileName(name), data));
      result.pushedTables++;
    }
  }
  return result;
}
