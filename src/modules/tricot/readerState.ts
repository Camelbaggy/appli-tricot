import { create, db, isActive, update } from '../../db';
import type { ReaderState } from '../../db';

export type PersistedReader = Pick<
  ReaderState,
  'page' | 'zoom' | 'rulerY' | 'totalRows' | 'currentRow'
>;

export const DEFAULT_READER: PersistedReader = { page: 1, zoom: 1, rulerY: 0, currentRow: 0 };

/** État sauvegardé de la liseuse pour un fichier (le plus récent s'il y en a plusieurs). */
export async function loadReaderState(fileId: string): Promise<ReaderState | undefined> {
  const rows = await db.readerStates.where('fileId').equals(fileId).filter(isActive).toArray();
  return rows.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/** Crée ou met à jour l'état de la liseuse d'un fichier ; renvoie l'id de la ligne. */
export async function saveReaderState(
  fileId: string,
  state: PersistedReader,
  knownId?: string,
): Promise<string> {
  const id = knownId ?? (await loadReaderState(fileId))?.id;
  if (id) {
    const updated = await update(db.readerStates, id, state);
    if (updated) return id;
  }
  return (await create(db.readerStates, { fileId, ...state })).id;
}

// Préférences d'affichage propres à l'appareil (hauteur de barre, synchro barre/compteur).
export interface ReaderPrefs {
  /** hauteur de la barre = hauteur d'un rang, en unités document */
  rulerHeight: number;
  syncRuler: boolean;
  /** sens de déplacement de la barre à chaque +1 : -1 monte, 1 descend */
  direction: -1 | 1;
}

export const DEFAULT_PREFS: ReaderPrefs = { rulerHeight: 80, syncRuler: false, direction: -1 };
const PREFS_KEY = 'tricot.reader.prefs';

export function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<ReaderPrefs>;
    return {
      rulerHeight:
        typeof p.rulerHeight === 'number' && p.rulerHeight >= 10 && p.rulerHeight <= 600
          ? p.rulerHeight
          : DEFAULT_PREFS.rulerHeight,
      syncRuler: p.syncRuler === true,
      direction: p.direction === 1 ? 1 : -1,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // stockage indisponible : les préférences ne persistent pas, sans conséquence
  }
}
