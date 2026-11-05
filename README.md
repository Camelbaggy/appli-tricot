# Appli Tricot

PWA hors-ligne de gestion de tricot (projets, patrons, laine). Voir `docs/PROJET.md` (cahier des charges) et `docs/ARCHITECTURE.md` (stack, modèle de données).

## Lancer

```bash
npm install
npm run dev        # serveur de dev
npm run preview    # sert le build de production (après npm run build)
```

Optionnel : copier `.env.example` en `.env.local` et renseigner `VITE_GOOGLE_CLIENT_ID` pour la synchro Drive (l'app fonctionne sans).

## Tester

```bash
npm run lint        # ESLint + Prettier
npm run typecheck   # TypeScript strict
npm test            # Vitest (jsdom, fake-indexeddb)
npm run build       # build de production + service worker
```

Les quatre doivent passer avant tout commit. `npm run icons` régénère les icônes PNG depuis `public/icon.svg`.

## Déployer

Le déploiement sur GitHub Pages est **manuel** : onglet Actions, workflow « Déploiement GitHub Pages », « Run workflow ». Prérequis : Settings, Pages, Source = « GitHub Actions ». Le workflow construit avec `VITE_BASE=/<nom-du-dépôt>/` (soit `/appli-tricot/`). En local, `VITE_BASE=/appli-tricot/ npm run build` reproduit ce build.

## Ajouter un module

Créer `src/modules/<module>/routes.tsx` exportant `routes: RouteObject[]`, puis l'ajouter dans `src/app/router.tsx`.
