# Déploiement LiveFx Academy sur cPanel (GPTServers)

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

> ⚠️ **Points sensibles du mutualisé** : le WebSocket `/ws/market` (module démo/cotations temps réel) et les tâches de fond 24/7 (`economicScheduler`, `demoWatcher`) peuvent être instables/coupés quand l'app est mise en veille. À vérifier après déploiement ; sinon garder le backend sur Railway.

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
Créer `~/repos/livefxacademy/backend/.env` (valeurs reprises du backend Railway) :
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
