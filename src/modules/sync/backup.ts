import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { TABLE_NAMES, type AppDatabase } from '../../db';
import { mergeIntoLocal, readLocalMeta, type AnyRecord } from './engine';

const FORMAT = 'appli-tricot-backup';
const VERSION = 1;

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** Archive zip : `manifest.json`, un `<table>.json` par table, et `files/<id>` pour les Blobs. */
export async function createBackup(db: AppDatabase, now: number = Date.now()): Promise<Uint8Array> {
  const entries: Zippable = {
    'manifest.json': strToU8(JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: now })),
  };
  for (const name of TABLE_NAMES) {
    entries[`${name}.json`] = strToU8(JSON.stringify(await readLocalMeta(db, name)));
  }
  const files = (await db.files.toArray()) as Array<{
    id: string;
    blob?: Blob;
    deletedAt?: number;
  }>;
  for (const file of files) {
    if (file.deletedAt !== undefined || !file.blob) continue;
    // Les PDF et images sont déjà compressés : stockage sans recompression (niveau 0).
    entries[`files/${file.id}`] = [await blobToBytes(file.blob), { level: 0 }];
  }
  return zipSync(entries);
}

export interface RestoreSummary {
  /** enregistrements écrits (nouveaux ou plus récents que les locaux) */
  written: number;
  /** nombre de tables modifiées */
  tables: number;
}

/** Restaure une archive en la FUSIONNANT à la base (même règle que la synchro). */
export async function restoreBackup(db: AppDatabase, data: Uint8Array): Promise<RestoreSummary> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(data);
  } catch {
    throw new Error("Ce fichier n'est pas une archive zip valide.");
  }
  const manifest = entries['manifest.json'];
  if (!manifest || (JSON.parse(strFromU8(manifest)) as { format?: string }).format !== FORMAT) {
    throw new Error("Ce fichier n'est pas une sauvegarde de l'application.");
  }
  let written = 0;
  let tables = 0;
  for (const name of TABLE_NAMES) {
    const raw = entries[`${name}.json`];
    if (!raw) continue;
    const parsed: unknown = JSON.parse(strFromU8(raw));
    if (!Array.isArray(parsed)) throw new Error(`Table invalide dans la sauvegarde : ${name}`);
    const outcome = await mergeIntoLocal(db, name, parsed as AnyRecord[], {
      silent: false,
      resolveBlob: async (record) => {
        const bytes = entries[`files/${record.id}`];
        if (!bytes) return undefined;
        const type = typeof record.mimeType === 'string' ? record.mimeType : '';
        return new Blob([bytes as BlobPart], { type });
      },
    });
    written += outcome.written;
    if (outcome.written > 0) tables++;
  }
  return { written, tables };
}
