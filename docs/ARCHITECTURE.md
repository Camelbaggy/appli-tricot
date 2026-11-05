# Architecture — Appli Tricot

Application de gestion et de création pour le tricot. Cahier des charges : [PROJET.md](PROJET.md).

## Contraintes produit

- Utilisatrice unique, appareil principal : **téléphone Android (Pixel 9, Chrome)**. Usage secondaire sur PC (navigateur desktop). Concevoir **mobile d'abord** (largeur 360–430 px), puis adapter au desktop.
- **Hors-ligne complet** : toute fonctionnalité hors sourcing/recherche Ravelry doit marcher sans réseau.
- **Synchronisation multi-appareils via Google Drive** (pas de compte supplémentaire, pas de serveur à nous).
- Interface **en français**.

## Stack

| Couche | Choix |
|---|---|
| Build | Vite + React 18 + TypeScript (strict) |
| Routage | React Router (HashRouter, compatible GitHub Pages) |
| UI | Tailwind CSS ; icônes lucide-react |
| Données locales | IndexedDB via Dexie.js + `dexie-react-hooks` (`useLiveQuery`) |
| PWA | vite-plugin-pwa (Workbox), manifest installable |
| PDF | pdfjs-dist |
| Tests | Vitest + Testing Library + fake-indexeddb |
| Lint | ESLint + Prettier |
| Hébergement | GitHub Pages (workflow manuel `workflow_dispatch`) |

Pas de state manager global : la base Dexie est la source de vérité, les composants lisent via `useLiveQuery`.

## Arborescence

```
src/
  app/            # shell : routes, layout, barre de navigation, providers
  db/             # schéma Dexie, types d'entités, helpers CRUD génériques
  modules/
    projets/      # module 1 (+ lien mensurations)
    patrons/      # module 2 (bibliothèque)
    filotheque/   # module 3 (+ consommations)
    tricot/       # modules 7, 8, 9 : chrono, compteurs, journal, liseuse
    sync/         # synchro Google Drive, import Drive, sauvegarde
    ...           # phases suivantes : mensurations, materiel, pro, sourcing, jacquard
  components/     # composants UI partagés (Button, Card, Sheet, EmptyState…)
  lib/            # utilitaires purs (dates, unités, ids)
```

Chaque module expose ses pages via `src/modules/<module>/routes.tsx`. Un module ne modifie pas les fichiers d'un autre module ; ce qui est partagé va dans `db/`, `components/` ou `lib/`.

## Modèle de données

Toutes les entités héritent de :

```ts
interface BaseRecord {
  id: string;          // crypto.randomUUID()
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms, mis à jour à chaque écriture
  deletedAt?: number;  // suppression logique (tombstone), nécessaire à la synchro
}
```

Ne jamais supprimer physiquement une ligne : poser `deletedAt`. Les requêtes d'affichage filtrent `deletedAt`. Toute écriture passe par les helpers de `src/db/` qui gèrent `updatedAt`.

Tables (phase 1 en gras, les autres sont déclarées dès le socle pour figer le schéma) :

- **projects** : name, status (`a_venir` | `en_cours` | `termine`), recipientType (`soi` | `cadeau` | `commande`), recipientName?, startDate?, endDate?, patternId?, measurementProfileId?, eventId?, isPro (bool), salePrice?, notes?, coverFileId?
- **patterns** : title, designer?, category (`femme` | `homme` | `enfant` | `bebe` | `accessoire` | `maison` | `autre`), tags[], fileIds[], yarnWeight?, yardageMin?, yardageMax?, needleSizeMm?, sourceUrl?, ravelryId?
- **yarns** (référence d'un fil) : brand, line (gamme), weight (`lace` | `fingering` | `sport` | `dk` | `worsted` | `aran` | `bulky` | `super_bulky`), fiber (composition texte), ballWeightG, ballLengthM, needleSizeMm?, ravelryId?
- **stashItems** (pelotes possédées) : yarnId, colorway, colorHex?, dyeLot?, initialQuantityG, pricePerBall?, location?, notes?
- **consumptions** : projectId, stashItemId, quantityG. Le stock restant = initialQuantityG − somme des consommations (calculé, jamais stocké). Mètres déduits via ballLengthM/ballWeightG.
- **counters** : projectId, label, value, target? (pour le décompte « restants »), order
- **journalEntries** : projectId, text, date
- **workSessions** : projectId, startedAt, endedAt? (une session ouverte = chrono en marche ; au plus une ouverte à la fois)
- **files** : name, mimeType, size, blob (Blob), driveFileId?, source (`local` | `drive`)
- **readerStates** : fileId, page, zoom, rulerY, totalRows?, currentRow (état de la liseuse par fichier)
- shoppingItems, measurementProfiles, needles, swatches, events, settings (clé/valeur : hourlyRate, etc.), jacquardCharts — définis plus tard.

## Synchronisation Google Drive

- Connexion avec Google Identity Services (token client, côté navigateur). Scopes : `drive.appdata` (données de l'app, dossier caché) et `drive.file` (fichiers que l'utilisatrice choisit via Google Picker).
- Le client OAuth (Client ID) est fourni par variable d'environnement `VITE_GOOGLE_CLIENT_ID` ; l'app fonctionne entièrement sans (synchro désactivée).
- Données : un fichier JSON par table dans `appDataFolder` (`projects.json`…). Fusion **par enregistrement, dernier `updatedAt` gagnant** ; les tombstones se propagent.
- Fichiers binaires (PDF, images) : envoyés une fois dans `appDataFolder` sous le nom `file-<id>` (immuables). Un fichier importé depuis le Drive de l'utilisatrice garde son `driveFileId` et n'est pas réenvoyé.
- Synchro déclenchée au démarrage, au retour en ligne, et après écriture (avec temporisation). Un indicateur d'état est visible dans le shell.
- Sauvegarde manuelle : export/import d'une archive zip (JSON + fichiers), indépendante de Drive.

## Ravelry (phase 3)

API Ravelry pour le catalogue de fils et la recherche de patrons. Les identifiants ne doivent pas être dans le code client : un petit proxy serverless (Cloudflare Worker) sera ajouté en phase 3. Les codes couleur hexadécimaux des coloris ne sont pas fiables côté Ravelry : prévoir une saisie/pipette manuelle.

## Conventions

- TypeScript strict, pas de `any`. Composants fonctionnels, hooks.
- Texte UI en français, code et noms d'identifiants en anglais.
- Cibles tactiles ≥ 48 px, utilisable d'une main ; prise en compte du mode sombre (`prefers-color-scheme`).
- Chaque module livre des tests Vitest sur sa logique (calculs, helpers db) ; `npm run lint`, `npm run typecheck`, `npm test` et `npm run build` doivent passer.
- Commits en français ou anglais, petits et explicites. Une branche par module, PR vers `main`.

## Contrats entre modules (phase 1)

Pour développer les modules en parallèle, chaque module expose ses éléments publics dans `src/modules/<module>/index.ts`. Les autres modules n'importent que depuis cet index. Les stubs existent déjà dans le socle ; le module propriétaire les implémente sans changer leur signature.

| Élément | Propriétaire | Utilisé par |
|---|---|---|
| `ProjectTricotPanel({ projectId })` : chrono, compte-rangs, journal | tricot | fiche projet |
| `readerPath(fileId)` → route `/tricot/liseuse/:fileId` | tricot | fiche patron, fiche projet |
| `ProjectYarnPanel({ projectId })` : fils et consommations du projet | filotheque | fiche projet |
| `DriveImportButton({ onImported })` : import Google Picker → table `files` | sync | import de patrons |
| `saveFile(blob, options)` dans `src/db/files.ts` | socle | patrons, sync |
