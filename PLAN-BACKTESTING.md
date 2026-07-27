# Plan — Module Backtesting (LiveFx Academy)

Suivi du chantier Backtesting du dashboard élève.
Données de marché : API publique Deriv (WebSocket), `DERIV_APP_ID` optionnel
(défaut `1089`, app_id public de test — aucune variable à créer sur Railway).

## Phase 1 — Mode Replay façon TradingView ✅ (commit `620b68f`)

Backend
- [x] `POST /api/backtests/run` renvoie les bougies OHLC utilisées
- [x] `GET /api/backtests/:id/candles` re-télécharge les bougies d'un backtest
      de l'historique (non stockées en base : ~500 Ko / backtest)

Frontend — onglet « Graphique & Replay » (affiché par défaut)
- [x] Chandeliers japonais via KLineCharts 9.8.12, thème sombre du dashboard
- [x] Replay : Lecture / Pause / pas à pas / Recommencer
- [x] Vitesses x1 · x2 · x5 · x10 · x25
- [x] Date courante en évidence (`📅 15 juin 2026 14:00`) démarrant à la date
      de début, compteur `bougie 240/2016 (12 %)`, barre de progression navigable
- [x] Marqueurs de trades au fil de l'eau : ▲ Achat / ▼ Vente à l'ouverture,
      ✕ + profit à la fermeture
- [x] Courbe d'équité synchronisée avec le replay
- [x] Outils de dessin : tendance, droite, demi-droite, horizontale, verticale,
      ligne de prix, canal parallèle, Fibonacci, rectangle, texte, gomme
- [x] Indicateurs : MA, EMA, BOLL (sur le prix) · RSI, MACD, KDJ (sous-graphiques)

## Phase 2 — Graphique du marché en direct ✅ (commit `233c201`)

- [x] `GET /api/backtests/candles?symbol=&timeframe=&count=` (bougies récentes)
      déclaré **avant** `/:id` pour éviter le conflit de route
- [x] Composant `LiveChart` en haut de la page : graphique visible dès
      l'ouverture, sans lancer de backtest
- [x] Suit la paire et l'unité de temps du formulaire
- [x] Rafraîchissement auto toutes les 15 s (pastille « Marché en direct »)
- [x] Outils de dessin et indicateurs disponibles sur le live
- [x] Refactorisation : thème, outils et indicateurs partagés dans
      `chartShared.jsx` (aucune duplication entre live et replay)

## Phase 3 — Affichage large façon MT5 mobile ✅ (build OK, à pousser)

Référence : capture MT5 Android (`Documents/graphique.jpg`) — le graphique
occupe la quasi-totalité de l'écran, entête symbole/OHLC en surimpression,
contrôles compacts.

- [x] Hauteur responsive `clamp(420px, 62vh, 760px)` au lieu de 420 px fixes
- [x] Bouton **plein écran** sur le live et sur le replay (`fixed inset-0`,
      sortie par Échap, scroll du body bloqué)
- [x] Entête en surimpression : `GBPJPY H1` + `O H L C` colorée selon la bougie
- [x] Toolbar et barres de contrôle compactées en plein écran
- [x] Bloc capital repliable en plein écran (bouton « Capital »)
- [x] `chart.resize()` au changement de conteneur (plein écran, indicateurs)
- [x] Hook `useFullscreen` partagé dans `chartShared.jsx`

## Phase 4 — Menus compacts + sélecteur de marché par catégorie ✅

- [x] Backend : catalogue Deriv élargi et groupé par catégorie —
      Forex (10 paires), Métaux (or, argent, platine, palladium),
      Indices (S&P 500, Wall Street 30, US Tech 100, UK 100, Allemagne 40,
      Japon 225), Crypto (BTC, ETH). Tous testés OK via ticks_history.
- [x] Outils de dessin regroupés dans un menu « Outils » (la toolbar latérale
      est supprimée → le graphique occupe toute la largeur)
- [x] Indicateurs regroupés dans un menu « Indicateurs » avec cases cochables
- [x] Entête du graphique : bouton `EUR/USD H1 ▾` ouvrant le sélecteur de
      marché — onglets par catégorie + choix de l'unité de temps (M1→D1)
- [x] Sélection synchronisée avec le formulaire de backtest (paire/TF)

## Phase 5 — Studio unifié + historique + design des dashboards ✅

- [x] Vue d'ensemble immédiate : à l'ouverture, le graphique montre la période
      délimitée (lignes verticales bleue = début, violette = fin, avec marge
      de contexte de 10 %) avant tout clic sur Lecture
- [x] Barre de réglages unique en haut : Paire (par catégorie Forex/Métaux/
      Indices/Crypto), TF, Période (préréglages 1 mois → 1 an + dates libres),
      Lot (0.01 → 5), Stratégie — tout en menus déroulants
- [x] Solde fixe 10 000 $ ; bouton « Lecture » (dégradé) lance le backtest
- [x] Cartes Configuration / Résultats / Historique supprimées de la page ;
      les stats s'affichent en bandeau compact au-dessus du graphique
- [x] Backend : `GET /api/backtests/candles` accepte `start_date`/`end_date`
      pour l'aperçu de la période délimitée
- [x] Bouton « Historique de backtest » sur les dashboards Client et
      Formateur : composant `BacktestHistory` (consultation + suppression)
- [x] Design des dashboards : header en dégradé avec halos (esprit page
      d'accueil), cartes de navigation avec survol dégradé + élévation

## Reste à faire

- [ ] Vérifier le rendu sur téléphone
- [ ] Nettoyage Render (service à supprimer côté dashboard Render)
