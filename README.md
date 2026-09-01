# LiveFx Academy Platform

Application complète d'académie de trading (React + Node.js + PostgreSQL).

## 📂 Structure du Projet

- `backend/` : API Node.js/Express, Authentification, Base de données.
- `frontend/` : Interface utilisateur React, TailwindCSS, Shadcn/ui.

---

## 🚀 Installation & Lancement (Local)

### 1. Pré-requis
- Node.js (v18+)
- PostgreSQL (Installé et lancé)
- Compte Cloudinary (pour les vidéos)

### 2. Base de Données (SQL)
1. Ouvrez pgAdmin ou votre terminal SQL.
2. Créez une base de données nommée `livefx_db`.
3. Exécutez le script SQL situé dans `backend/schema.sql`.
   - Ce script crée toutes les tables nécessaires (users, videos, prospects, etc.).

### 3. Configuration Backend
1. Allez dans le dossier backend :
   ```bash
   cd backend
   npm install
   ```
2. Renommez `.env.example` en `.env` et remplissez les informations :
   - `DATABASE_URL` : URL de connexion Postgres (ex: `postgresql://postgres:root@localhost:5432/livefx_db`)
   - `CLOUDINARY_*` : Vos clés API Cloudinary.
   - `JWT_SECRET` : Une phrase secrète aléatoire.

3. Lancez le serveur :
   ```bash
   npm run dev
   ```
   Le serveur démarre sur `http://localhost:5000`. Documentation API disponible sur `http://localhost:5000/api-docs`.

### 4. Configuration Frontend
1. Allez dans le dossier frontend :
   ```bash
   cd frontend
   npm install
   ```
2. (Optionnel) Configurez les variables d'environnement si besoin (par défaut pointe sur localhost:5000).
3. Lancez le frontend :
   ```bash
   npm run dev
   ```
   L'application est accessible sur `http://localhost:5173`.

---

## 🌍 Déploiement (Production)

Tout est hébergé sur **cPanel (GPTServers)** — guide détaillé : [`DEPLOY-CPANEL.md`](./DEPLOY-CPANEL.md).

- **Frontend** — `https://livefx-trading.com` (build Vite statique). **Déploiement automatique** via GitHub Actions (`.github/workflows/deploy.yml`) à chaque push touchant `frontend/**` : build avec `VITE_API_URL=https://api.livefx-trading.com` puis upload FTP vers cPanel.
- **Backend** — `https://api.livefx-trading.com` (application Node.js, Setup Node.js App / Passenger). **Mise à jour manuelle** : sur le serveur, `git pull` puis *Run NPM Install* (si `package.json` a changé) puis *Restart*.
- **Base de données** : MongoDB Atlas (externe, `0.0.0.0/0` autorisé). **Uploads** : Cloudinary (externe).

---

## ✨ Fonctionnalités Clés

- **Authentification** : Login/Register sécurisé avec JWT & Cookies.
- **Rôles** : Client, Formateur, Admin.
- **Vidéos** : Upload Cloudinary (max 3min), Lecture vidéo.
- **Admin** : Gestion des prospects (Round-Robin simulé), Stats.
- **UI** : Interface moderne avec Shadcn/ui & Tailwind.

---

## 🛠 Stack Technique

- **Frontend** : React, Vite, TailwindCSS, Lucide Icons, Zustand, React Hook Form, Zod.
- **Backend** : Node.js, Express, Postgres (pg), Cloudinary, Multer, JWT, Bcrypt.
- **Devops** : Docker ready (optionnel), Swagger Docs.

---

*Développé par Cascade pour LiveFx Academy.*
