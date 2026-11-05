import { db } from './database';
import { create } from './helpers';
import type { FileSource, StoredFile } from './types';

/** Enregistre un fichier (PDF, image) dans la base locale pour un usage hors-ligne. */
export async function saveFile(
  file: Blob & { name?: string },
  options: { name?: string; source?: FileSource; driveFileId?: string } = {},
): Promise<StoredFile> {
  return create(db.files, {
    name: options.name ?? file.name ?? 'fichier',
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    blob: file,
    source: options.source ?? 'local',
    driveFileId: options.driveFileId,
  });
}
