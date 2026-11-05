import { DriveAuthError } from './driveClient';
import { GOOGLE_SCOPES, googleClientId, loadScript } from './config';

const GIS_URL = 'https://accounts.google.com/gsi/client';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback: (error: { type?: string; message?: string }) => void;
}
interface GoogleOAuth2 {
  initTokenClient(config: TokenClientConfig): { requestAccessToken(o?: { prompt?: string }): void };
  revoke(token: string, done?: () => void): void;
}
const oauth2 = (): GoogleOAuth2 =>
  (window as unknown as { google: { accounts: { oauth2: GoogleOAuth2 } } }).google.accounts.oauth2;

let token: string | undefined;
let expiresAt = 0;
let refreshing: Promise<string> | null = null;
/** Mis à jour par le contrôleur : l'utilisatrice s'est déjà connectée sur cet appareil. */
let remembered = false;

export function setRemembered(value: boolean): void {
  remembered = value;
}

async function requestToken(prompt: '' | 'consent' | 'select_account'): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) throw new Error("Google Drive n'est pas configuré.");
  await loadScript(GIS_URL);
  return new Promise<string>((resolve, reject) => {
    const client = oauth2().initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.access_token) {
          token = response.access_token;
          expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
          resolve(token);
        } else {
          reject(new DriveAuthError(response.error ?? 'Connexion refusée'));
        }
      },
      error_callback: (error) => reject(new DriveAuthError(error.message ?? error.type)),
    });
    client.requestAccessToken({ prompt });
  });
}

/** Connexion à l'initiative de l'utilisatrice (doit venir d'un clic : ouvre la fenêtre Google). */
export function signIn(): Promise<string> {
  return requestToken(remembered ? '' : 'consent');
}

export function signOut(): void {
  if (token) {
    try {
      oauth2().revoke(token);
    } catch {
      // pas de réseau ou script non chargé : l'oubli local suffit
    }
  }
  token = undefined;
  expiresAt = 0;
  remembered = false;
}

/** Jeton valide, renouvelé silencieusement (prompt: '') à l'expiration. */
export async function getAccessToken(): Promise<string> {
  if (token && Date.now() < expiresAt - 60_000) return token;
  if (!remembered) throw new DriveAuthError();
  refreshing ??= requestToken('').finally(() => {
    refreshing = null;
  });
  try {
    return await refreshing;
  } catch (error) {
    token = undefined;
    throw error instanceof DriveAuthError ? error : new DriveAuthError();
  }
}

export function hasValidToken(): boolean {
  return !!token && Date.now() < expiresAt - 60_000;
}
