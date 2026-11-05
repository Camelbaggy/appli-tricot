import { useEffect, useRef, useState } from 'react';
import { Card, PageHeader, Button } from '../../components';
import { db } from '../../db';
import { createBackup, restoreBackup, blobToBytes } from './backup';
import { isDriveConfigured } from './config';
import { connectGoogle, disconnectGoogle, syncNow, useSyncState } from './controller';
import { displayStatus, statusLabel } from './status';
import { useNow } from './useNow';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(2)} Go`;
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function Message({ kind, children }: { kind: 'ok' | 'error'; children: React.ReactNode }) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`mt-3 text-sm ${kind === 'error' ? 'text-red-700 dark:text-red-400' : 'text-green-800 dark:text-green-400'}`}
    >
      {children}
    </p>
  );
}

function DriveSection() {
  const state = useSyncState();
  const [error, setError] = useState<string>();
  const now = useNow();
  const kind = displayStatus(state);

  if (!isDriveConfigured()) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Google Drive</h2>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          La synchronisation avec Google Drive n&rsquo;est pas configurée. Vos données restent sur
          cet appareil, et l&rsquo;application fonctionne normalement. La sauvegarde manuelle
          ci-dessous reste disponible.
        </p>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Pour l&rsquo;activer, suivez la section « Configurer Google Drive » du fichier
          src/modules/sync/README.md.
        </p>
      </Card>
    );
  }

  async function connect() {
    setError(undefined);
    try {
      await connectGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.');
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Google Drive</h2>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        {state.connected ? statusLabel(state, now) : 'Non connecté : données locales seulement.'}
      </p>
      {state.connected && state.lastSyncAt && (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Dernière synchro : {formatDateTime(state.lastSyncAt)}
        </p>
      )}
      {state.error && kind !== 'synced' && <Message kind="error">{state.error}</Message>}
      {error && <Message kind="error">{error}</Message>}
      <div className="mt-3 flex flex-col gap-2">
        {!state.connected && <Button onClick={() => void connect()}>Se connecter à Google</Button>}
        {state.connected && kind === 'reauth' && (
          <Button onClick={() => void connect()}>Se reconnecter à Google</Button>
        )}
        {state.connected && (
          <>
            <Button onClick={() => void syncNow()} disabled={kind === 'syncing'}>
              Synchroniser maintenant
            </Button>
            <Button variant="secondary" onClick={() => void disconnectGoogle()}>
              Se déconnecter
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function BackupSection() {
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string }>();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function exportBackup() {
    setBusy(true);
    setMessage(undefined);
    try {
      const bytes = await createBackup(db);
      const blob = new Blob([bytes as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sauvegarde-tricot-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setMessage({ kind: 'ok', text: 'Sauvegarde exportée.' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Export impossible.' });
    } finally {
      setBusy(false);
    }
  }

  async function restore(file: File) {
    setBusy(true);
    setMessage(undefined);
    try {
      const summary = await restoreBackup(db, await blobToBytes(file));
      setMessage({
        kind: 'ok',
        text:
          summary.written === 0
            ? 'Sauvegarde fusionnée : rien à ajouter, vos données sont déjà à jour.'
            : `Sauvegarde fusionnée : ${summary.written} élément(s) ajouté(s) ou mis à jour.`,
      });
    } catch (e) {
      setMessage({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Restauration impossible.',
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Sauvegarde</h2>
      <p className="mt-2 text-stone-700 dark:text-stone-300">
        Une archive zip avec toutes vos données et vos fichiers, indépendante de Google Drive. La
        restauration fusionne : les éléments plus récents sur cet appareil sont conservés.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Button onClick={() => void exportBackup()} disabled={busy}>
          Exporter une sauvegarde
        </Button>
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
          Restaurer une sauvegarde
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          aria-label="Fichier de sauvegarde à restaurer"
          data-testid="restore-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void restore(file);
          }}
        />
      </div>
      {message && <Message kind={message.kind}>{message.text}</Message>}
    </Card>
  );
}

function StorageSection() {
  const [persisted, setPersisted] = useState<boolean>();
  const [usage, setUsage] = useState<{ used: number; quota?: number }>();
  const supported = typeof navigator !== 'undefined' && !!navigator.storage;

  useEffect(() => {
    if (!supported) return;
    void navigator.storage.persisted?.().then(setPersisted, () => undefined);
    void navigator.storage.estimate?.().then(
      (e) => setUsage({ used: e.usage ?? 0, quota: e.quota }),
      () => undefined,
    );
  }, [supported]);

  async function requestPersist() {
    try {
      setPersisted(await navigator.storage.persist());
    } catch {
      setPersisted(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Stockage sur l&rsquo;appareil</h2>
      {!supported ? (
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          Ce navigateur ne permet pas de gérer le stockage.
        </p>
      ) : (
        <>
          <p className="mt-2 text-stone-700 dark:text-stone-300">
            {persisted === undefined
              ? 'Vérification du stockage…'
              : persisted
                ? 'Stockage persistant accordé : le navigateur ne supprimera pas vos données.'
                : 'Stockage non persistant : le navigateur pourrait effacer les données si la place manque.'}
          </p>
          {usage && (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Espace utilisé : {formatBytes(usage.used)}
              {usage.quota ? ` sur ${formatBytes(usage.quota)} disponibles` : ''}
            </p>
          )}
          {persisted === false && (
            <div className="mt-3">
              <Button variant="secondary" onClick={() => void requestPersist()}>
                Demander le stockage persistant
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function ReglagesPage() {
  return (
    <>
      <PageHeader title="Réglages" subtitle="Synchronisation, sauvegarde et stockage" />
      <div className="flex flex-col gap-4">
        <DriveSection />
        <BackupSection />
        <StorageSection />
      </div>
    </>
  );
}
