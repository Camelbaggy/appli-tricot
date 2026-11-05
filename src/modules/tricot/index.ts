// Contrat public du module tricot (implémenté par le module, utilisé par les autres).
export { ProjectTricotPanel } from './ProjectTricotPanel';
/** Chemin de la liseuse pour un fichier (PDF ou image) de la table `files`. */
export const readerPath = (fileId: string) => `/tricot/liseuse/${fileId}`;
