import { googleApiKey, googleAppId, loadScript } from './config';

const API_URL = 'https://apis.google.com/js/api.js';
const PICKER_MIME_TYPES = 'application/pdf,image/png,image/jpeg,image/webp,image/gif';

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
}

interface PickerDoc {
  id: string;
  name: string;
  mimeType: string;
}
interface PickerResponse {
  action: string;
  docs?: PickerDoc[];
}
interface PickerBuilder {
  addView(view: unknown): PickerBuilder;
  enableFeature(feature: unknown): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setLocale(locale: string): PickerBuilder;
  setCallback(callback: (response: PickerResponse) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}
interface PickerApi {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new (viewId?: unknown) => {
    setMimeTypes(types: string): unknown;
    setIncludeFolders(v: boolean): unknown;
  };
  ViewId: { DOCS: unknown };
  Feature: { MULTISELECT_ENABLED: unknown };
  Action: { PICKED: string; CANCEL: string };
}
type GoogleWindow = Window & {
  gapi?: { load(name: string, done: () => void): void };
  google?: { picker?: PickerApi };
};

async function loadPicker(): Promise<PickerApi> {
  await loadScript(API_URL);
  const w = window as GoogleWindow;
  await new Promise<void>((resolve) => w.gapi!.load('picker', resolve));
  return w.google!.picker!;
}

/** Ouvre le Google Picker (PDF et images, sélection multiple). Résout `[]` si annulé. */
export async function pickDriveFiles(accessToken: string): Promise<PickedFile[]> {
  const apiKey = googleApiKey();
  if (!apiKey) throw new Error("Le Picker n'est pas configuré (clé API manquante).");
  const picker = await loadPicker();
  return new Promise<PickedFile[]>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS);
    view.setMimeTypes(PICKER_MIME_TYPES);
    view.setIncludeFolders(true);
    const builder = new picker.PickerBuilder()
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setLocale('fr')
      .setCallback((response) => {
        if (response.action === picker.Action.PICKED) {
          resolve((response.docs ?? []).map(({ id, name, mimeType }) => ({ id, name, mimeType })));
        } else if (response.action === picker.Action.CANCEL) {
          resolve([]);
        }
      });
    const appId = googleAppId();
    if (appId) builder.setAppId(appId);
    builder.build().setVisible(true);
  });
}

/** Télécharge le contenu d'un fichier choisi dans le Picker. */
export async function downloadPickedFile(
  file: PickedFile,
  accessToken: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): Promise<Blob> {
  const response = await fetchImpl(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok)
    throw new Error(`Téléchargement de « ${file.name} » impossible (${response.status})`);
  const blob = await response.blob();
  return blob.type ? blob : new Blob([blob], { type: file.mimeType });
}
