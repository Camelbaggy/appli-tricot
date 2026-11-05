import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudDownload } from 'lucide-react';
import { saveFile } from '../../db';
import { Button } from '../../components';
import { ensureToken, useSyncState } from './controller';
import { isPickerConfigured } from './config';
import { downloadPickedFile, pickDriveFiles } from './picker';

/**
 * Bouton « Importer depuis Google Drive » (Google Picker). Appelle `onImported` avec les ids
 * des enregistrements créés dans la table `files`. Ne rend rien si Drive n'est pas configuré.
 * Contrat : implémenté par le module sync, rendu par l'import de patrons (module patrons).
 */
export function DriveImportButton({ onImported }: { onImported: (fileIds: string[]) => void }) {
  const { connected } = useSyncState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!isPickerConfigured()) return null;

  if (!connected) {
    return (
      <Link
        to="/reglages"
        className="inline-flex min-h-touch items-center text-sm font-medium text-brand-700 underline dark:text-brand-100"
      >
        Se connecter à Google pour importer depuis Drive
      </Link>
    );
  }

  async function handleClick() {
    setBusy(true);
    setError(undefined);
    try {
      const token = await ensureToken();
      const picked = await pickDriveFiles(token);
      const ids: string[] = [];
      for (const file of picked) {
        const blob = await downloadPickedFile(file, token);
        const saved = await saveFile(blob, {
          name: file.name,
          source: 'drive',
          driveFileId: file.id,
        });
        ids.push(saved.id);
      }
      if (ids.length > 0) onImported(ids);
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'import depuis Drive a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={() => void handleClick()} disabled={busy}>
        <CloudDownload size={20} aria-hidden="true" />
        {busy ? 'Import en cours…' : 'Importer depuis Google Drive'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
