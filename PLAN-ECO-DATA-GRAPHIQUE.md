# Plan de travail — Données de calendrier enrichies + refonte de l'affichage des graphiques

> Créé le 17/09/2026. Deux chantiers indépendants demandés dans la même session.
> Chantier A : enrichir la rubrique « Annonces économiques » avec les champs
> complets d'un calendrier économique professionnel (type Trading Economics),
> **en plus** de l'IA déjà en place. Chantier B : quatre modifications d'affichage
> sur les graphiques (Graphique/Trading Demo et Backtesting).

---

## État des lieux (vérifié dans le code, 17/09/2026)

### Annonces économiques (existant)
- Source unique : flux JSON publics **Forex Factory**
  (`nfs.faireconomy.media/ff_calendar_{lastweek,thisweek,nextweek}.json`),
  cache mémoire 15 min — `backend/utils/economicCalendar/index.js`.
- Champs réellement servis par le flux (vérifié par requête sur le flux vivant) :
  `title`, `country`, `date`, `impact`, `forecast`, `previous`.
  **Absents du flux** : `actual` (présent seulement après publication, pas sur
  les événements futurs), `revised`, `url`/source officielle, et le **pays**
  distinct de la devise (`country` contient en réalité le code devise : USD, EUR…).
- IA Claude (analyses avant/fondamentale/après, banques centrales, chatbot) +
  notifications : **déjà livrées et en ligne**, à ne pas casser.
- Front : `pages/EconomicCalendar.jsx` (3 onglets) + `components/economic/*`.
  La ligne d'événement n'affiche que heure, devise, pastille, titre, previous,
  forecast. `EventAnalysisModal` affiche previous/forecast/actual.

### Graphiques (existant)
- `frontend/src/components/backtest/chartShared.jsx` : styles, outils de dessin,
  indicateurs, `useFullscreen` — **partagé** par les deux graphiques.
- `components/trading-demo/DemoChart.jsx` (section « Graphique », KLineCharts,
  temps réel WS) et `components/backtest/ReplayChart.jsx` (Backtesting, replay).
- La navbar vient de `AppLayout` dans `src/App.jsx` ; l'en-tête « Tableau de bord
  élève » + le bouton Retour viennent de `pages/dashboards/ClientDashboard.jsx`,
  qui navigue par URL (`?section=trading-demo` / `?section=backtesting`).
- Aucun logo n'est incrusté dans les graphiques. Logo disponible : `frontend/public/logo.png`.

---

## Chantier A — Champs de calendrier économique complets

Objectif : disposer, pour chaque annonce, des informations suivantes **en plus**
des analyses IA :

| Champ demandé | Source retenue |
|---|---|
| 🗓️ date et heure | déjà là (`date`, heure locale du navigateur) |
| 🇺🇸 pays | **à ajouter** — table de correspondance devise → pays + drapeau |
| 📌 événement (NFP, CPI, FOMC…) | déjà là (`title`) + **type d'événement dérivé** (catégorie : emploi, inflation, taux, croissance…) |
| 🔴 importance faible/moyenne/forte | déjà là (`impact`) |
| 📊 valeur précédente | déjà là (`previous`) |
| 🔮 prévision / consensus | déjà là (`forecast`) |
| ✅ valeur réelle après publication | **à ajouter** — fournisseur enrichi + fallback FF (FF ne le sert que pour les événements passés) |
| 🔄 valeur révisée | **à ajouter** — fournisseur enrichi uniquement |
| 💱 devise concernée | déjà là (`currency`) |
| 🏛️ source officielle | **à ajouter** — table par type d'événement (BLS, BEA, Fed, Eurostat, BCE, ONS…) + lien |

### A1. Couche fournisseur dans `backend/utils/economicCalendar/`
Reproduire le motif déjà utilisé pour les données de marché (`utils/marketData/`
avec provider + registre), pour ne pas coupler la rubrique à une source unique :
- `providers/forexFactory.js` — extraction du code actuel (flux gratuit, sans clé).
- `providers/tradingEconomics.js` — appelé **seulement si `TE_API_KEY` est
  configurée** ; sert `actual`, `revised`, `country` réel et `source`.
  ⚠️ L'API Trading Economics est commerciale : la clé n'est pas fournie
  aujourd'hui. Le module doit donc être **inactif par défaut et sans erreur**.
- `providers/index.js` — sélection + **fusion** : Forex Factory reste la base
  (couverture, gratuité), les champs manquants sont complétés par le
  fournisseur enrichi quand il est disponible.
- `enrichment.js` — enrichissement **hors API**, donc toujours actif :
  devise → pays + drapeau, titre → type d'événement, type → source officielle
  et son URL.
- `.env.example` : documenter `TE_API_KEY` (facultatif) et `ECO_PROVIDER`.

### A2. Normalisation
Étendre l'objet événement renvoyé par `getCalendar()` sans rien retirer
(le front existant et le cache d'analyses IA reposent sur `id`) :
`country_name`, `country_code`, `flag`, `event_type`, `source_name`,
`source_url`, `actual`, `revised`, `unit`, `provider`.

### A3. API
- `GET /api/economics/calendar` : renvoie les nouveaux champs (rétro-compatible).
- `GET /api/economics/meta` : ajouter `countries`, `event_types`, `providers`,
  `enriched_fields` pour piloter les filtres du front.
- Filtres serveur : ajouter `event_type` et `country_name` à `filterEvents`.

### A4. Front
- `CalendarView.jsx` : colonnes drapeau + pays, `actual` (avec code couleur
  meilleur/pire que prévu par rapport au consensus), `revised`, filtre par type
  d'événement. Le tableau doit rester lisible sur mobile (colonnes secondaires
  masquées comme aujourd'hui).
- `EventAnalysisModal.jsx` : bloc « Données de l'annonce » complet
  (les 10 champs) + lien vers la source officielle, au-dessus des onglets IA.
- Si `actual` arrive du fournisseur, il **préremplit** le champ de saisie
  manuelle de l'analyse « après publication » au lieu de le laisser vide.

---

## Chantier B — Modifications sur les graphiques

### B1. Vue graphique sans navbar ni en-tête de dashboard
Quand la section active est `trading-demo` (« Graphique ») ou `backtesting`,
l'écran ne doit montrer que le graphique et ses outils :
- `App.jsx` / `AppLayout` : ne pas rendre `<Navbar />` quand l'URL du dashboard
  porte `?section=trading-demo` ou `?section=backtesting` (décision par URL,
  pas de state global à introduire).
- `ClientDashboard.jsx` : pour ces deux sections, masquer le bandeau
  « Tableau de bord élève » et le bloc de padding, et remplacer le bouton
  « Retour » par un bouton discret superposé (pour ne pas enfermer l'utilisateur).
- Vérifier les mêmes sections dans `TrainerDashboard.jsx` / `AdminDashboard.jsx`
  et appliquer le même traitement si elles y sont câblées.

### B2. Logo du site au pied de chaque graphique
Comme le filigrane TradingView : **en bas à gauche** de la zone de tracé,
semi-transparent, non cliquable, sans interférer avec la souris.
- Nouveau composant partagé `ChartWatermark` dans `chartShared.jsx`
  (`absolute bottom-2 left-2`, `pointer-events-none`, opacité réduite).
- Monté dans `DemoChart.jsx` **et** `ReplayChart.jsx`, au même endroit dans les
  deux, y compris en plein écran.

### B3. Mode paysage exploitable
- Media query `(orientation: landscape)` : en paysage sur mobile, le graphique
  prend la hauteur utile (`100dvh` moins la barre d'outils) au lieu du
  `clamp(...vh...)` actuel qui laisse le graphique écrasé.
- Compacter la barre d'outils en paysage, et masquer la navigation mobile
  inférieure de `TradingDemo.jsx` quand on est sur l'onglet graphique en paysage.
- Appeler `chart.resize()` sur `orientationchange` / `resize` (aujourd'hui le
  resize n'est déclenché que sur bascule plein écran et changement d'indicateurs).

### B4. Commit
Committer l'ensemble **sans pousser** (le hook `.git/hooks/post-commit` pousse
automatiquement : il faudra le neutraliser le temps du commit, puis le remettre).
Auteur du commit : `jonass557` (Vercel Hobby refuse les autres auteurs).

---

## Ordre d'exécution
1. A1 → A2 → A3 (backend calendrier), en vérifiant que les analyses IA et le
   cache MongoDB existants continuent de fonctionner.
2. A4 (front calendrier).
3. B1 → B2 → B3 (graphiques).
4. Build Vite + chargement des modules backend.
5. B4 (commit sans push).

## Points de vigilance
- Ne pas casser `buildEventId` : le cache d'analyses IA (`EconomicAnalysis`) et
  l'unicité des notifications (`EconomicNotification`) sont indexés sur `event_id`.
- Trading Economics est **payant** : tout le code doit rester fonctionnel sans
  la clé (dégradation propre, aucun 500).
- Déploiement backend = **manuel** sur cPanel (`git pull` + restart), pas
  d'auto-deploy.
