# Déploiement LivefxTrading sur cPanel (GPTServers)

Domaine : **livefx-trading.com** (acheté chez LWS, serveurs DNS pointés vers GPTServers, propagation + AutoSSL faits).
Hébergement : cPanel mutualisé « Cas A » (un seul compte, LiveFx ajouté en **Addon Domain** à côté d'un premier site — dossiers séparés, aucun conflit).

## Architecture cible
```
~/                                  (home, le Terminal démarre ici)
├── repos/livefxacademy/            ← git clone (code source)
│     ├── frontend/  → build → dist/
│     └── backend/   → application Node.js (api.livefx-trading.com)
└── <DOCROOT de livefx-trading.com> ← contenu de dist/ (frontend)
```
- Frontend statique  → `https://livefx-trading.com`
- Backend Node.js    → `https://api.livefx-trading.com`
- Base de données    → MongoDB Atlas (externe, `0.0.0.0/0` autorisé)
- Uploads            → Cloudinary (externe)

> ⚠️ **Points sensibles du mutualisé** : le WebSocket `/ws/market` (module démo/cotations temps réel) et les tâches de fond 24/7 (`economicScheduler`, `demoWatcher`) peuvent être instables/coupés quand Passenger met l'app en veille après inactivité. À vérifier après déploiement (voir §8) ; si instable, mettre en place un ping keep-alive (cron) vers `/health` ou demander à l'hébergeur un process Node persistant.

---

## ÉTAPE 1 — Sous-domaine API
cPanel → **Domaines** → **Créer un domaine** → `api.livefx-trading.com`.
Noter le **Document Root** de `livefx-trading.com` (= `DOCROOT` ci-dessous).

## ÉTAPE 2 — Application Node.js (backend)
cPanel → **Setup Node.js App** → **Create Application** :
- Node version : **20**
- Application mode : **Production**
- Application root : `repos/livefxacademy/backend`
- Application URL : `api.livefx-trading.com`
- Application startup file : `server.js`

Copier la commande **« Enter to the virtual environment »** affichée en haut de la page (sert aussi à builder le frontend).

## ÉTAPE 3 — Cloner le code (Terminal : Advanced → Terminal)
```bash
mkdir -p ~/repos && cd ~/repos
git clone https://github.com/jonass557/livefxacademy.git
# Dépôt privé : git clone https://jonass557:VOTRE_TOKEN@github.com/jonass557/livefxacademy.git
```

## ÉTAPE 4 — Variables d'environnement backend
Créer `~/repos/livefxacademy/backend/.env` :
```env
NODE_ENV=production
# NE PAS définir PORT (géré par Passenger)

# OBLIGATOIRE
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://livefx-trading.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Selon usage
ANTHROPIC_API_KEY=...        # analyses IA annonces éco
DERIV_APP_ID=1089            # optionnel (défaut)
SMTP_HOST=...                # optionnel (emails)
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

## ÉTAPE 5 — Installer + démarrer le backend
1. Page de l'app Node.js → **Run NPM Install** → attendre.
2. **Restart**.
3. MongoDB Atlas → Network Access → `0.0.0.0/0`.
4. cPanel → **SSL/TLS Status** → cocher `api.livefx-trading.com` → **Run AutoSSL**.
5. Test : `https://api.livefx-trading.com/health` → `{"status":"ok","database":"connected"}`.

## ÉTAPE 6 — Builder le frontend (Terminal)
Coller la commande d'activation du venv (étape 2), puis :
```bash
cd ~/repos/livefxacademy/frontend
npm ci
VITE_API_URL=https://api.livefx-trading.com npm run build
```
> URL de l'API passée en ligne de commande (n'écrit rien dans le dépôt, ne perturbe pas Vercel).
> Build qui échoue (mémoire) → builder en local et uploader `dist/` par FTP.

## ÉTAPE 7 — Publier le frontend
```bash
cp -r ~/repos/livefxacademy/frontend/dist/. ~/livefx-trading.com/   # adapter au vrai DOCROOT
ls -la ~/livefx-trading.com/                                        # vérifier .htaccess présent
```
Le `.htaccess` (routing SPA, versionné dans `frontend/public/.htaccess`) évite l'erreur
« The requested resource could not be found on this server » au rechargement d'une page interne.

## ÉTAPE 8 — Vérifier
- `https://livefx-trading.com` charge ; connexion OK.
- Rester quelques minutes, naviguer, **F5** sur une page interne → pas de 404.
- F12 → Réseau : appels vers `api.livefx-trading.com` sans erreur CORS ; WebSocket
  `wss://api.livefx-trading.com/ws/market` en `101 Switching Protocols`.

---

## Mises à jour ultérieures
```bash
cd ~/repos/livefxacademy && git pull
# frontend
source <venv-activate> ; cd frontend && npm ci && VITE_API_URL=https://api.livefx-trading.com npm run build
cp -r dist/. ~/livefx-trading.com/
# backend : Run NPM Install (si package.json a changé) puis Restart dans cPanel
```

## Déploiement automatique GitHub Actions

Le frontend est déployé par `.github/workflows/deploy.yml` lorsqu'un commit `main` modifie `frontend/**`. Le workflow peut aussi être lancé avec **Actions → Deploy frontend to cPanel → Run workflow**.

Secrets GitHub requis :

- `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` : identifiants FTPS cPanel.
- `FTP_SERVER_DIR` (recommandé) : chemin du Document Root vu depuis la racine du compte FTP. Laisser vide uniquement si le compte FTP est déjà limité au Document Root ; dans ce cas le workflow utilise `./`.

Le chemin de `FTP_SERVER_DIR` doit être confirmé dans cPanel avant le premier lancement. Ne pas activer de nettoyage distant tant que le chemin n'a pas été vérifié.

Le backend est déployé par `.github/workflows/backend-deploy.yml` sur les changements `backend/**` ou manuellement. Créer un Environment GitHub nommé `production` et y ajouter :

- `CPANEL_SSH_HOST`
- `CPANEL_SSH_USERNAME`
- `CPANEL_SSH_KEY`
- `CPANEL_SSH_PORT` (optionnel, défaut `22`)

La clé doit permettre au serveur d'accéder au dépôt GitHub via `origin`. Le job s'arrête si le répertoire applicatif contient des modifications, utilise uniquement un fast-forward, ne modifie jamais `backend/.env`, installe les dépendances seulement si les manifests changent, puis redémarre Passenger via `backend/tmp/restart.txt`. Vérifier que cette méthode est supportée par l'application Node.js cPanel avant d'activer le workflow.

Après un déploiement, vérifier le SHA affiché par le job, `/health`, le frontend, une route SPA après actualisation et les logs Passenger. En cas de problème, utiliser le workflow frontend précédent pour revenir au dernier build connu, et faire un revert Git relu pour le backend plutôt qu'un reset destructif du serveur.
