# Module sync

Synchronisation Google Drive, sauvegarde zip, page Réglages, indicateur d'état et import via Google Picker.
L'application marche entièrement sans Google : sans configuration, les données restent sur l'appareil.

## Fonctionnement en bref

- `merge.ts` : fusion par enregistrement (dernier `updatedAt` gagnant, suppressions propagées, égalité départagée de façon déterministe).
- `engine.ts` : synchro complète (un `<table>.json` par table dans le dossier caché `appDataFolder`, un `file-<id>` par fichier).
- `driveClient.ts` : accès à l'API Drive, derrière une interface (`memoryDrive.ts` sert aux tests).
- `controller.ts` : états, verrou anti-doublon, déclencheurs (démarrage, retour en ligne, après écriture avec 5 s de délai, bouton).
- `auth.ts` : Google Identity Services (jeton, renouvellement silencieux). Les scripts Google ne sont chargés qu'à la demande.
- `backup.ts` : export/restauration d'une archive zip (fusion, jamais d'écrasement aveugle).
- Les réglages dont la clé commence par `sync.` restent propres à chaque appareil.

## Configurer Google Drive

Cette configuration se fait une seule fois. Il faut un compte Google (gratuit). Aucune carte bancaire n'est nécessaire pour cet usage.

### 1. Créer le projet Google Cloud

1. Allez sur <https://console.cloud.google.com/> et connectez-vous.
2. En haut de la page, cliquez sur le nom du projet, puis sur **Nouveau projet**.
3. Donnez-lui un nom (par exemple « Appli Tricot »), puis **Créer**.
4. Sélectionnez ce projet en haut de la page.

Notez le **numéro du projet** (page d'accueil du projet, rubrique « Informations sur le projet ») : il sert de `VITE_GOOGLE_APP_ID`, facultatif mais recommandé pour l'import depuis Drive.

### 2. Activer les deux API

1. Menu **API et services** puis **Bibliothèque**.
2. Cherchez **Google Drive API**, ouvrez-la, cliquez sur **Activer**.
3. Revenez à la bibliothèque, cherchez **Google Picker API**, cliquez sur **Activer**.

### 3. Configurer l'écran de consentement

1. Menu **API et services** puis **Écran de consentement OAuth** (ou « Google Auth Platform »).
2. Type d'utilisateur : **Externe**, puis **Créer**.
3. Renseignez le nom de l'application (« Appli Tricot »), votre adresse e-mail comme adresse d'assistance et comme contact développeur. Le reste peut rester vide.
4. Dans « Champs d'application » (Scopes), ajoutez ces deux autorisations :
   - `https://www.googleapis.com/auth/drive.appdata`
   - `https://www.googleapis.com/auth/drive.file`
5. Laissez l'application en **mode Test** (ne cliquez pas sur « Publier »).
6. Dans **Utilisateurs de test**, cliquez sur **Add users** et ajoutez l'adresse Gmail de la personne qui utilisera l'application (vous-même, et elle si c'est une autre personne). Seules ces adresses pourront se connecter.

En mode Test, Google affiche un avertissement « application non validée » à la connexion : c'est normal, cliquez sur **Continuer**. Attention, en mode Test l'autorisation expire au bout de 7 jours : il faudra alors se reconnecter (l'application affiche « Reconnexion nécessaire » ; un clic sur « Se reconnecter à Google » dans les Réglages suffit).

### 4. Créer l'ID client OAuth

1. Menu **API et services** puis **Identifiants**.
2. **Créer des identifiants** puis **ID client OAuth**.
3. Type d'application : **Application Web**. Nom au choix.
4. Dans **Origines JavaScript autorisées**, ajoutez les deux adresses :
   - `http://localhost:5173`
   - `https://camelbaggy.github.io`
5. Ne remplissez pas « URI de redirection autorisés » (inutile ici).
6. **Créer**. Copiez l'**ID client** (il se termine par `.apps.googleusercontent.com`).

### 5. Créer la clé API (pour l'import depuis Drive)

1. Toujours dans **Identifiants** : **Créer des identifiants** puis **Clé API**.
2. Copiez la clé. Pour plus de sécurité, cliquez sur « Restreindre la clé » : sous « Restrictions relatives aux applications », choisissez **Sites web** et ajoutez `http://localhost:5173/*` et `https://camelbaggy.github.io/*` ; sous « Restrictions relatives aux API », cochez **Google Picker API** et **Google Drive API**.

### 6. Renseigner les variables

À la racine du projet, copiez `.env.example` en `.env.local` et remplissez :

```
VITE_GOOGLE_CLIENT_ID=votre-id-client.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=votre-cle-api
VITE_GOOGLE_APP_ID=le-numero-du-projet
```

- Sans `VITE_GOOGLE_CLIENT_ID` : pas de synchronisation (tout reste local).
- Sans `VITE_GOOGLE_API_KEY` : la synchronisation marche, mais pas l'import depuis Drive.

Relancez ensuite `npm run dev`. Pour la version en ligne (GitHub Pages), ajoutez les mêmes valeurs comme variables du dépôt (Settings, Secrets and variables, Actions, onglet Variables) et transmettez-les à l'étape de build du workflow de déploiement. L'ID client et la clé API ne sont pas secrets (ils sont visibles dans le navigateur) : c'est la liste des origines autorisées et des utilisateurs de test qui protège l'accès.

### 7. Se connecter

Ouvrez l'application, allez dans **Réglages**, puis **Se connecter à Google**. La première synchronisation démarre toute seule ; l'indicateur en haut de l'écran indique l'état.
