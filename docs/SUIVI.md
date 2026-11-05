# Suivi du projet — Appli Tricot

Document de passation : à lire en premier pour reprendre le projet dans une nouvelle conversation.
Dernière mise à jour : 5 novembre 2026.

## Liens

- Application en ligne : https://camelbaggy.github.io/appli-tricot/
- Dépôt : https://github.com/Camelbaggy/appli-tricot (public)
- Cahier des charges : [PROJET.md](PROJET.md)
- Architecture, modèle de données, contrats entre modules : [ARCHITECTURE.md](ARCHITECTURE.md)
- Plan initial (Claude Doc) : https://claude.ai/artifact/LbEGN2FASaHxg8fAKKq9tQ

## Décisions prises

| Sujet | Décision |
|---|---|
| Utilisatrice / appareils | Une utilisatrice ; téléphone Android (Pixel 9) en priorité, PC en secondaire. Mobile d'abord. |
| Plateforme | PWA installable, hors-ligne complet (React + TypeScript + Vite + Dexie + Tailwind). |
| Synchronisation | Google Drive (`appDataFolder`), pas de serveur ni de compte supplémentaire. Fusion par enregistrement, dernier `updatedAt` gagnant. |
| Import de patrons | Fichiers locaux ou Google Picker (ses patrons sont déjà sur Drive). |
| Catalogue de fils / recherche de patrons | API Ravelry (elle a un compte), via un petit relais serverless pour protéger les identifiants. Codes couleur Ravelry peu fiables : palette jacquard complétée à la main. |
| Hébergement | GitHub Pages, dépôt rendu public. Déploiement **manuel** : workflow « Deploy » (`workflow_dispatch`). |
| Google Cloud | Projet n° 791350247692, application OAuth en mode Test (utilisateurs de test à jour), origine autorisée `https://camelbaggy.github.io`. Identifiants dans les variables du dépôt : `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_APP_ID`. Guide : `src/modules/sync/README.md`. |

## Méthode de travail

- Claude (Opus) joue le rôle de chef de projet : il découpe, rédige les consignes, relit, teste et intègre.
- Le code est écrit par des agents Sonnet en parallèle, chacun dans un worktree et sur une branche `feat/<module>` partant de `main`, en ne modifiant que son dossier `src/modules/<module>/`.
- Avant de lancer des modules en parallèle, le chef de projet pose dans `main` les **contrats** entre modules (stubs exportés par `src/modules/<module>/index.ts`, voir ARCHITECTURE.md).
- Relecture : lint, typecheck, tests, build, puis parcours Playwright en émulation Pixel 7 sur l'app intégrée (branches fusionnées ensemble), captures examinées. Les défauts sont renvoyés à l'agent concerné.
- Une PR par module ; Nicolas a autorisé Claude à **fusionner lui-même** les PR une fois validées (CI verte). Déployer ensuite via le workflow « Deploy ».
- Limites de l'environnement Claude : il ne peut pas modifier les paramètres du dépôt (visibilité, Pages, variables Actions) ; ces réglages sont faits par Nicolas.

## Avancement

### Phase 1 — MVP « je tricote avec » : terminée (PR #1 à #5)

| Module (n° du cahier des charges) | État | Où |
|---|---|---|
| Socle : PWA, base Dexie (17 tables), navigation, CI, déploiement | ✅ | `src/app`, `src/db`, `src/components` |
| 1. Espace Projets | ✅ statuts, fiche, destinataire, dates, patron lié | `src/modules/projets` |
| 2. Bibliothèque de patrons | ✅ import fichiers + Drive, catégories, « déjà tricoté », historique | `src/modules/patrons` |
| 3. Filothèque | ✅ stock par fil/coloris/bain, consommations, déduction, coût matière | `src/modules/filotheque` |
| 7. Chronomètre | ✅ par projet, une session à la fois, total | `src/modules/tricot` |
| 8. Compte-rangs multiples + journal de bord | ✅ | `src/modules/tricot` |
| 9. Liseuse hors-ligne | ✅ PDF/images, écran allumé, zoom, barre de repérage, double compteur | `src/modules/tricot` |
| Synchro Google Drive + sauvegarde zip | ✅ code livré ; à valider en conditions réelles | `src/modules/sync` |

Fonctions déjà exportées pour la suite : `projectMaterialCost` / `computeMaterialCost` (filotheque) et `projectTotalMs` (tricot), pour l'Espace Pro.

### À valider par Nicolas et sa compagne

- [ ] Installer l'app sur le Pixel (Chrome › ⋮ › Installer l'application).
- [ ] Se connecter à Google dans Réglages, vérifier la synchro entre téléphone et PC.
- [ ] Importer un vrai patron depuis Drive et l'utiliser dans la liseuse en tricotant.
- [ ] Remonter les retours d'usage (ergonomie, manques) avant d'attaquer la phase 2.

### Phase 2 — organisation et activité pro : à faire

- 10. Carnet de mensurations (profils, association à un projet ; champ `measurementProfileId` déjà présent sur `projects`).
- 11. Matériel (aiguilles) et carnet d'échantillons (tables `needles`, `swatches` déjà déclarées).
- 6. Espace Pro / festival : événements, liste de production, coût matière + main-d'œuvre (taux horaire dans `settings`), bénéfice selon prix de vente, stock prêt à vendre. S'appuie sur `projectMaterialCost` et `projectTotalMs`.
- Découpage suggéré : 3 agents en parallèle (mensurations ; matériel + échantillons ; espace pro), contrats à poser d'abord (ex. panneau « Mensurations » et panneau « Pro » dans la fiche projet).

### Phase 3 — connexion au monde extérieur : à faire

- Relais serverless Ravelry (ex. Cloudflare Worker) : application à enregistrer sur Ravelry, identifiants hors du code client.
- 4. Sourcing : catalogue de fils filtrable, liste de courses, bouton « reçu » → filothèque (table `shoppingItems`).
- 5. Stash diving : recherche de patrons Ravelry compatibles avec une pelote (grosseur, métrage) + recherche dans sa propre bibliothèque ; ajout en projet « À venir » lié au fil.

### Phase 4 — Studio de création jacquard : à faire

- 12. Grille au ratio réel de l'échantillon, palette de coloris d'une gamme, dimensions en cm, alerte de flottés, miroir, répétition, export vers la liseuse (table `jacquardCharts`).

## Points d'attention connus

- En mode Test Google, une reconnexion peut être demandée périodiquement (l'app affiche « Reconnexion nécessaire »).
- Toute évolution du schéma Dexie doit passer par une nouvelle `version(n)` avec migration (la v1 est en production).
- Préférences de la liseuse (hauteur de barre, barre qui suit le compteur) stockées en `localStorage`, donc par appareil, non synchronisées.
- On ne peut pas encore modifier une référence de fil (seulement la pelote).
- Le Wake Lock n'a été vérifié qu'en branchement (pas en navigateur réel) ; à confirmer sur le Pixel.
