# 🚂 Migration Render → Railway (backend) — Vercel conservé (frontend)

> Le fichier `backend/railway.json` est déjà prêt dans le dépôt
> (start `node server.js`, healthcheck `/health`).

---

## Étape 1 — Créer le projet Railway

1. Va sur **https://railway.app** → connecte-toi avec ton compte **GitHub**.
2. Clique **New Project** → **Deploy from GitHub repo**.
3. Choisis le dépôt **`valdes557/livefxacademy`**
   (autorise l'accès Railway à ton GitHub si demandé).

---

## Étape 2 — Configurer le service

1. Clique sur le service créé → onglet **Settings** :
   - **Root Directory** : `backend`  ← ⚠️ TRÈS IMPORTANT (monorepo)
   - **Branch** : `main` (auto-deploy à chaque push, comme Render)
2. Railway détecte Node.js et lit `railway.json` automatiquement.

---

## Étape 3 — Variables d'environnement

Onglet **Variables** → ajoute (copie les valeurs depuis le dashboard
Render, onglet *Environment*) :

```
MONGODB_URI=<ton URI MongoDB Atlas>
JWT_SECRET=<idem Render>
JWT_REFRESH_SECRET=<idem Render>
CLOUDINARY_CLOUD_NAME=<...>
CLOUDINARY_API_KEY=<...>
CLOUDINARY_API_SECRET=<...>
SMTP_HOST=<...>
SMTP_PORT=<...>
SMTP_USER=<...>
SMTP_PASS=<...>
FRONTEND_URL=https://<ton-site>.vercel.app
DERIV_APP_ID=1089
```

Pas besoin de `PORT` : Railway l'injecte et `server.js` le lit déjà.

---

## Étape 4 — Domaine public

1. **Settings → Networking → Generate Domain**
   → tu obtiens une URL du type
   `https://livefxacademy-production-xxxx.up.railway.app`
2. Teste dans le navigateur : `https://<ton-domaine-railway>/health`
   → tu dois voir `{"status":"ok","database":"connected"}`.

---

## Étape 5 — Pointer Vercel vers Railway

1. Dashboard **Vercel** → ton projet → **Settings → Environment Variables**.
2. Modifie **`VITE_API_URL`** : remplace l'URL Render
   (`https://livefx-backend.onrender.com`) par ton URL Railway.
   ⚠️ Sans `/` final ni `/api` — le code ajoute `/api` lui-même.
3. **Deployments → ⋯ → Redeploy**
   (obligatoire : les variables Vite sont figées au moment du build).
4. Vérifie sur MongoDB Atlas que **Network Access** autorise `0.0.0.0/0`
   (sinon Railway ne pourra pas se connecter à la base).

---

## Étape 6 — Quitter Render (une fois Railway validé)

1. Teste le site Vercel complet : login, annonces, vidéos,
   et le nouveau **Backtesting**.
2. Dashboard **Render** → service `livefx-backend` →
   **Settings → Suspend** (d'abord, par prudence),
   puis **Delete** quand tout est confirmé.
3. Supprimer ensuite `render.yaml` du dépôt (devenu obsolète).

---

## 💡 Notes

- **Railway vs Render gratuit** : plus de "cold start" de 50 s,
  mais Railway n'a pas de plan gratuit permanent (~5 $/mois après l'essai).
- Le retry/timeout déjà présent dans `frontend/src/lib/api.js`
  reste utile pour les connexions lentes.
