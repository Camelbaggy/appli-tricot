import type { DriveClient, DriveFile } from './driveClient';

/** Faux Drive en mémoire, utilisé par les tests. */
export class MemoryDrive implements DriveClient {
  readonly files = new Map<string, { name: string; data: Blob }>();
  private counter = 0;
  /** Noms des fichiers envoyés (création ou mise à jour), dans l'ordre. */
  uploads: string[] = [];

  async list(): Promise<DriveFile[]> {
    return [...this.files.entries()].map(([id, f]) => ({ id, name: f.name }));
  }
  async download(fileId: string): Promise<Blob> {
    const f = this.files.get(fileId);
    if (!f) throw new Error(`Fichier introuvable : ${fileId}`);
    return f.data;
  }
  async create(name: string, data: Blob): Promise<DriveFile> {
    const id = `mem-${++this.counter}`;
    this.files.set(id, { name, data });
    this.uploads.push(name);
    return { id, name };
  }
  async update(fileId: string, data: Blob): Promise<void> {
    const f = this.files.get(fileId);
    if (!f) throw new Error(`Fichier introuvable : ${fileId}`);
    f.data = data;
    this.uploads.push(f.name);
  }
  idByName(name: string): string | undefined {
    for (const [id, f] of this.files) if (f.name === name) return id;
    return undefined;
  }
}
