# Guide de déploiement Railway — LiveFx Academy

Ce document décrit le déploiement du **backend** (Express.js) sur Railway et du **frontend** (React/Vite) sur Vercel.

---

## Architecture

```
Frontend (Vercel)  ──HTTPS──>  Backend (Railway)  ──>  MongoDB Atlas
React + Vite                    Express.js              Mongoose
https://livefxacademy            https://xxx.up.railway.app    MongoDB Atlas Cluster
```

---

## Prérequis

- Compte [Railway](https://railway.app) (liée à votre GitHub)
- Compte [Vercel](https://vercel.com) (déjà configuré)
- Compte [MongoDB Atlas](https://www.mongodb.com/atlas) (déjà configuré)
- Compte [Cloudinary](https://cloudinary.com) (déjà configuré)
- Dépôt GitHub avec le code à jour

---

## Étape 1 — Déployer le backend sur Railway

### 1.1 Créer le projet Railway

1. Aller sur https://railway.app → **New Project**
2. Sélectionner **Deploy from GitHub repo**
3. Choisir le dépôt `LiveFxAcademy`
4. **Important :** Dans **Settings → Root Directory**, définir le chemin sur `backend`
5. Railway détecte automatiquement Node.js via `package.json`

### 1.2 Configurer les variables d'environnement

Dans l'onglet **Variables**, ajouter **toutes** les variables suivantes :

| Variable | Valeur | Obligatoire |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` (votre chaîne Atlas) | Oui |
| `JWT_SECRET` | Chaîne aléatoire longue | Oui |
| `JWT_REFRESH_SECRET` | Chaîne aléatoire longue | Oui |
| `CLOUDINARY_CLOUD_NAME` | Votre cloud name Cloudinary | Oui |
| `CLOUDINARY_API_KEY` | Votre clé API Cloudinary | Oui |
| `CLOUDINARY_API_SECRET` | Votre secret Cloudinary | Oui |
| `FRONTEND_URL` | `https://votre-app.vercel.app` | Oui |
| `NODE_ENV` | `production` | Oui |
| `SMTP_HOST` | `smtp.gmail.com` (ou autre) | Non* |
| `SMTP_PORT` | `587` | Non* |
| `SMTP_USER` | Votre email | Non* |
| `SMTP_PASS` | Mot de passe d'application | Non* |

> *Les variables SMTP sont optionnelles. Si elles ne sont pas configurées, les emails ne seront pas envoyés (le serveur continuera de fonctionner normalement).

> **Note :** `PORT` est fourni automatiquement par Railway. Ne pas le définir manuellement.

### 1.3 Configurer le domaine

1. Aller dans **Settings → Networking**
2. Cliquer **Generate Domain**
3. Railway génère une URL comme : `https://livefx-backend.up.railway.app`
4. Noter cette URL — elle sera utilisée pour le frontend

### 1.4 Vérifier le déploiement

1. Dans l'onglet **Deployments**, attendre que le build soit terminé
2. Les logs doivent afficher :
   ```
   MongoDB Connected: livefx.xxxx.mongodb.net
   Server running on port XXXX
   ```
3. Tester l'URL : `https://votre-app.up.railway.app/health`
   - Doit retourner : `{"status":"ok","database":"connected","uptime":...,"timestamp":...}`
4. Tester Swagger : `https://votre-app.up.railway.app/api-docs`

---

## Étape 2 — Configurer MongoDB Atlas

### 2.1 Autoriser les connexions Railway

Railway utilise des IP dynamiques. Il faut donc autoriser toutes les IPs :

1. Aller sur [MongoDB Atlas](https://cloud.mongodb.com)
2. Sélectionner votre cluster → **Network Access**
3. Cliquer **Add IP Address**
4. Sélectionner **Allow Access From Anywhere** (`0.0.0.0/0`)
5. Confirmer

> Cela est nécessaire car Railway ne fournit pas d'IP fixe sur le plan gratuit/hobby.

### 2.2 Vérifier l'utilisateur de la base de données

1. Aller dans **Database Access**
2. Vérifier que l'utilisateur (`valdes557`) existe avec le rôle `readWriteAnyDatabase`
3. Le mot de passe doit correspondre à celui dans `MONGODB_URI`

---

## Étape 3 — Mettre à jour le frontend sur Vercel

### 3.1 Mettre à jour la variable d'environnement Vercel

1. Aller sur [Vercel](https://vercel.com) → votre projet frontend
2. **Settings → Environment Variables**
3. Modifier la variable `VITE_API_URL` :
   - **Valeur :** `https://votre-app.up.railway.app` (l'URL Railway de l'étape 1.3)
   - **Ne pas mettre de slash final**
4. Sauvegarder

### 3.2 Redéployer le frontend

1. Aller dans **Deployments**
2. Cliquer **Redeploy** sur le dernier déploiement
3. Ou pousser un nouveau commit sur GitHub pour déclencher un déploiement automatique

### 3.3 Vérifier le frontend

1. Ouvrir `https://votre-app.vercel.app`
2. Tester la connexion (login) — doit fonctionner sans erreur CORS
3. Vérifier la console navigateur — aucune erreur de requête API

---

## Étape 4 — Vérifications post-déploiement

### Checklist

- [ ] Backend Railway : `https://xxx.up.railway.app/health` retourne `{"status":"ok"}`
- [ ] Backend Railway : `https://xxx.up.railway.app/` retourne "LiveFx Academy API Running"
- [ ] Backend Railway : `https://xxx.up.railway.app/api-docs` affiche Swagger
- [ ] Frontend Vercel : la page d'accueil se charge
- [ ] Frontend Vercel : la connexion (login) fonctionne
- [ ] Frontend Vercel : les appels API ne génèrent pas d'erreur CORS
- [ ] Upload de vidéos/bannières fonctionne (Cloudinary)
- [ ] Emails transactionnels fonctionnent (si SMTP configuré)

---

## Dépannage

### Erreur : `MongoDB connection error`

**Cause :** L'IP Railway n'est pas autorisée dans Atlas.

**Solution :** Ajouter `0.0.0.0/0` dans Network Access Atlas (voir Étape 2.1).

---

### Erreur : `CORS error` dans le navigateur

**Cause :** La variable `FRONTEND_URL` sur Railway ne correspond pas à l'URL Vercel.

**Solution :**
1. Vérifier la valeur de `FRONTEND_URL` sur Railway (sans slash final)
2. Doit être exactement : `https://votre-app.vercel.app`
3. Redéployer le backend Railway

---

### Erreur : `Cannot GET /` ou 404

**Cause :** Mauvaise configuration du root directory.

**Solution :** Vérifier que **Root Directory** est défini sur `backend` dans Railway → Settings.

---

### Erreur : `Application failed to respond` (Railway)

**Cause :** Le serveur ne démarre pas correctement.

**Solution :**
1. Consulter les logs dans Railway → Deployments
2. Vérifier que toutes les variables d'environnement sont définies
3. Vérifier que `MONGODB_URI` est correct
4. Le healthcheck `/health` doit retourner 200

---

### Erreur : `npm install` échoue pendant le build

**Cause :** Conflit de dépendances avec `multer-storage-cloudinary`.

**Solution :** Le fichier `backend/.npmrc` contient `legacy-peer-deps=true`. Vérifier qu'il est bien présent dans le dépôt.

---

### Le cold start prend trop de temps

**Cause :** Railway met le service en sommeil après inactivité (plan gratuit).

**Solution :**
- Le timeout Axios côté frontend est de 30s, ce qui est suffisant
- Pour éviter le cold start, passer au plan Hobby ($5/mois) qui garde le service actif

---

### Les cookies de refresh token ne fonctionnent pas

**Cause :** Les cookies cross-origin nécessitent `sameSite: 'none'` + `secure: true`.

**Solution :** C'est déjà configuré dans le code quand `NODE_ENV=production`. Vérifier que `NODE_ENV=production` est bien défini sur Railway.

> Note : Le refresh token n'est actuellement pas utilisé côté frontend (l'authentification utilise le access token via header `Authorization: Bearer`). Le cookie est préparé pour une future utilisation.

---

## Fichiers de configuration Railway

### `backend/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": null
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### `backend/.npmrc`

```
legacy-peer-deps=true
```

---

## Comparaison Render vs Railway

| Aspect | Render (ancien) | Railway (nouveau) |
|---|---|---|
| Build | `npm install` | Auto (Nixpacks) |
| Start | `node server.js` | `node server.js` |
| Health check | `/` | `/health` |
| Port | Auto via `PORT` | Auto via `PORT` |
| Variables env | Dashboard Render | Dashboard Railway |
| Domaine | `xxx.onrender.com` | `xxx.up.railway.app` |
| Cold start | Oui (plan gratuit) | Oui (plan gratuit) |

---

## Nettoyage (optionnel)

Après vérification que Railway fonctionne correctement :

1. **Désactiver le service Render :**
   - Aller sur Render → votre service backend
   - Suspendre ou supprimer le service

2. **Supprimer `render.yaml` (optionnel) :**
   ```bash
   git rm render.yaml
   git commit -m "chore: remove render config (moved to Railway)"
   ```

3. **Mettre à jour le README** pour refléter le nouveau déploiement Railway.
