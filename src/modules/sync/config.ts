function env(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value && value.trim() ? value.trim() : undefined;
}

export const googleClientId = (): string | undefined => env('VITE_GOOGLE_CLIENT_ID');
export const googleApiKey = (): string | undefined => env('VITE_GOOGLE_API_KEY');
/** Numéro du projet Google Cloud (optionnel, recommandé pour le Picker avec le scope drive.file). */
export const googleAppId = (): string | undefined => env('VITE_GOOGLE_APP_ID');

/** La synchro n'existe que si un ID client OAuth est fourni. */
export const isDriveConfigured = (): boolean => googleClientId() !== undefined;
/** Le Picker demande en plus une clé API. */
export const isPickerConfigured = (): boolean =>
  isDriveConfigured() && googleApiKey() !== undefined;

export const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';

const loading = new Map<string, Promise<void>>();

/** Charge un script externe à la demande (une seule fois par adresse). */
export function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(src);
      script.remove();
      reject(new Error('Impossible de charger les scripts Google (êtes-vous hors-ligne ?).'));
    };
    document.head.appendChild(script);
  });
  loading.set(src, promise);
  return promise;
}
