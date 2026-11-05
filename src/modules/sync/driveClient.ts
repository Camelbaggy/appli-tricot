/** Fichier du dossier caché `appDataFolder`. */
export interface DriveFile {
  id: string;
  name: string;
}

/**
 * Couche transport vers Google Drive (dossier `appDataFolder`). Interface volontairement
 * minimale pour pouvoir la simuler en test (voir `memoryDrive.ts`).
 */
export interface DriveClient {
  list(): Promise<DriveFile[]>;
  /** Télécharge le contenu d'un fichier (aussi utilisé pour un `driveFileId` choisi via Picker). */
  download(fileId: string): Promise<Blob>;
  create(name: string, data: Blob): Promise<DriveFile>;
  update(fileId: string, data: Blob): Promise<void>;
}

/** Jeton absent, expiré ou refusé : il faut se reconnecter. */
export class DriveAuthError extends Error {
  constructor(message = 'Reconnexion nécessaire') {
    super(message);
    this.name = 'DriveAuthError';
  }
}

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

/** Corps `multipart/related` (métadonnées JSON + contenu), construit à la main. */
export function buildMultipart(
  metadata: Record<string, unknown>,
  data: Blob,
  boundary: string,
): Blob {
  return new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${data.type || 'application/octet-stream'}\r\n\r\n`,
    data,
    `\r\n--${boundary}--`,
  ]);
}

/** Implémentation réelle au-dessus de `fetch`. `getToken` fournit un jeton valide. */
export function createDriveClient(
  getToken: () => Promise<string>,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): DriveClient {
  async function request(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await getToken();
    const response = await fetchImpl(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) throw new DriveAuthError();
    if (!response.ok) throw new Error(`Google Drive a répondu ${response.status}`);
    return response;
  }

  return {
    async list() {
      const files: DriveFile[] = [];
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({
          spaces: 'appDataFolder',
          pageSize: '1000',
          fields: 'nextPageToken, files(id, name)',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const response = await request(`${API}/files?${params}`);
        const body = (await response.json()) as { files?: DriveFile[]; nextPageToken?: string };
        files.push(...(body.files ?? []));
        pageToken = body.nextPageToken;
      } while (pageToken);
      return files;
    },
    async download(fileId) {
      const response = await request(`${API}/files/${encodeURIComponent(fileId)}?alt=media`);
      return response.blob();
    },
    async create(name, data) {
      const boundary = `tricot-${Math.random().toString(36).slice(2)}`;
      const body = buildMultipart({ name, parents: ['appDataFolder'] }, data, boundary);
      const response = await request(`${UPLOAD}/files?uploadType=multipart&fields=id,name`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      });
      return (await response.json()) as DriveFile;
    },
    async update(fileId, data) {
      await request(`${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': data.type || 'application/octet-stream' },
        body: data,
      });
    },
  };
}
