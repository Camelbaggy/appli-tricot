# Appli Tricot

PWA hors-ligne de gestion de tricot (projets, patrons, laine, liseuse de grilles, jacquard). Pour reprendre le projet, lire d'abord `docs/SUIVI.md` (état, décisions, méthode, prochaines étapes). Lire `docs/ARCHITECTURE.md` avant toute modification ; le cahier des charges est `docs/PROJET.md`.

## Commandes

- `npm install`
- `npm run dev` — serveur de dev
- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` — les quatre doivent passer avant tout commit

## Règles

- Mobile d'abord (Android Chrome, 360–430 px), interface en français.
- La base Dexie (`src/db/`) est la source de vérité. Jamais de suppression physique : `deletedAt`. Toujours passer par les helpers de `src/db/` pour écrire.
- Un module ne modifie que son dossier `src/modules/<module>/`. Toute modification de `src/db/`, `src/components/`, `src/app/` doit être minimale et signalée dans la PR.
- Pas de nouvelle dépendance sans raison claire, signalée dans la PR.
