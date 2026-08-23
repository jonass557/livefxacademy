# Module Trading Demo — Plan de travail & Rapport d'architecture

> Statut : **ÉTAPE 1 (analyse) — livrée**. Aucune ligne de code applicatif modifiée.
> Ce document sert de référence pour les étapes 2 → 7. Chaque étape sera implémentée
> uniquement sur instruction explicite.

---

## PARTIE A — Plan de travail (7 étapes)

### ÉTAPE 1 — Analyse & préparation *(cette étape, faite)*
Cartographier l'architecture existante (frontend, backend, base, auth, modèles, API,
WebSocket, UI réutilisable, notifications, dashboards) et proposer une intégration du
Trading Demo **sans casser l'existant**, en **réutilisant** au maximum. Ne rien modifier.

### ÉTAPE 2 — Base de données & compte démo
Modèles : `DemoAccount`, `Instrument`, `Position`, `PendingOrder`, `Trade`, `Watchlist`.
Valeurs par défaut compte : `initialBalance = 10000 USD`, `leverage = 1:100`, `currency = USD`.
Contraintes : isolation par utilisateur (un user ↔ son compte démo), index, intégrité,
relations. Puis : « migrations », vérifier schéma, build, corriger.

### ÉTAPE 3 — Instruments & market data
Catégories FOREX / CRYPTO / METALS / INDICES / SYNTHETIC / OTHER. Abstraction
`MarketDataProvider` (`getInstruments`, `getHistoricalData`, `getQuote`,
`subscribeToQuotes`, `unsubscribeFromQuotes`). Clés API **exclusivement côté serveur**.
Données par instrument : Bid, Ask, Spread, timestamp, OHLC, historique, temps réel.
WebSocket temps réel vers le front (reconnexion, détection de perte, anti-abonnements
multiples, nettoyage). Ne jamais inventer les prix des synthétiques.

### ÉTAPE 4 — Terminal de trading (UI)
Header (Balance, Equity, Used Margin, Free Margin, Floating P&L), Watchlist (Bid/Ask/
Spread/variation %, recherche, favoris), graphique chandeliers pro (M1→MN), outils de
dessin, indicateurs (ajout/modif/suppression), responsive desktop/tablette/mobile avec
navigation mobile (Chart / Trade / Positions / Orders / History / Watchlist). Graphique
réellement branché au market data de l'étape 3. Pas encore l'exécution d'ordres.

### ÉTAPE 5 — Ordres au marché
Ticket BUY/SELL, lots prédéfinis + saisie libre (respect `minVolume`/`maxVolume`/
`volumeStep`). BUY = ASK, SELL = BID, **prix d'exécution déterminé côté serveur**.
Validations serveur (compte actif, instrument actif, prix dispo, volume, marge, SL, TP).
Création `Position` + affichage P&L temps réel. Sécurité : anti-double-clic, anti-triche
prix, isolation par utilisateur.

### ÉTAPE 6 — Pending orders
BUY_LIMIT / SELL_LIMIT / BUY_STOP / SELL_STOP avec règles de placement vs prix courant.
Surveillance serveur des prix → déclenchement automatique → `Position` (même si l'user
n'est pas sur la page). UI « Pending Orders » (liste + Modifier/Supprimer). Le backend
est la seule source de vérité (jamais le JS client).

### ÉTAPE 7 — Moteur de trading (financier)
P&L par instrument (contractSize/tickSize/tickValue/pipSize — pas de formule unique).
SL/TP → fermeture auto (`closeReason = STOP_LOSS | TAKE_PROFIT`). Fermeture manuelle et
**partielle**. Métriques temps réel : Balance, Equity = Balance + Floating P&L,
Free Margin = Equity − Used Margin, Margin Level, Floating P&L. Blocage si marge
insuffisante. Affichage sans refresh. Tests : BUY/SELL gagnant/perdant, SL, TP, fermeture
manuelle/partielle, marge insuffisante.

### Contraintes transverses (toutes étapes)
- Réutiliser l'existant ; ne pas recréer d'architecture inutile.
- Ne supprimer aucune fonctionnalité existante.
- Transactions **exclusivement virtuelles** ; isolation totale du réel.
- Sécurité et validations **côté backend**.

---

## PARTIE B — Rapport d'architecture actuelle (faits vérifiés)

### 1. Stack technique
| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind 3, Zustand (état), React Router 6, Axios |
| Graphiques | **KLineCharts 9.8** (chandeliers, dessins, indicateurs) + lightweight-charts 5 (courbe d'équité) |
| UI | Composants type shadcn dans `frontend/src/components/ui/` (button, card, dialog, tabs, select, table, input…), icônes `lucide-react`, toasts `sonner` |
| Backend | Node + **Express 4**, **REST only** (pas de WebSocket serveur exposé) |
| Base | **MongoDB via Mongoose 8** (PAS de Prisma, PAS de SQL) |
| Auth | JWT (`jsonwebtoken`), bcrypt, validation `zod` |
| Temps réel | **Aucun WS exposé** — le « live » actuel est du **polling** (backtesting : 15 s) |
| Déploiement | Backend Railway (`/health`, `/api-docs`), Frontend Vercel, MongoDB Atlas |

Dépendances déjà présentes et réutilisables : **`ws` 8.21 (backend)** — permet un serveur
WebSocket sans nouvelle dépendance ; **`klinecharts`** — graphique du terminal ;
**`zustand`**, **`sonner`**, **`lucide-react`**, **`zod`**.

### 2. Comment les utilisateurs sont identifiés
- Login (`backend/controllers/authController.js:79`) signe un JWT : `{ id: user._id, role }`, `expiresIn 7d`.
- `backend/middleware/authMiddleware.js` : `authenticateToken` pose `req.user = { id, role }` ; `requireRole(roles)` gère l'autorisation par rôle.
- Rôles (`backend/models/User.js`) : **`client` | `trainer` | `admin`** (défaut `client`).
- **Isolation ressources** : partout via `Model.findOne({ _id, user_id: req.user.id })` (ex. `backtestController.js:120`). → C'est le pattern à répliquer pour le compte démo.
- Front : token dans Zustand persistant (`frontend/src/store/authStore.js`, clé `livefx-auth`), injecté en `Authorization: Bearer` par l'intercepteur Axios (`frontend/src/lib/api.js:32`). 401/403 → logout auto.

### 3. Structure de la base (Mongoose)
- Modèles dans `backend/models/*.js`, agrégés par `backend/models/index.js`.
- Conventions : champs **snake_case** (`user_id`, `full_name`, `created_at`), refs via
  `mongoose.Schema.Types.ObjectId` + `ref`, `index: true`, `timestamps: { createdAt:'created_at', updatedAt:'updated_at' }`, champs libres en `Schema.Types.Mixed`.
- ⚠️ **Pas de système de migrations réel** : `backend/run-migration.js` est un **vestige SQL/Postgres** (`pool.query`, fichiers `.sql`) incompatible avec Mongoose → non fonctionnel. Avec Mongoose, les collections sont créées à la volée ; l'équivalent d'une « migration » = définir les schémas + un **script de seed** (comme `backend/seed-admin.js`).
- Modèles existants (extrait) : `User`, `Trainer`, `Backtest`, `Service`, `Consultation`,
  `AnnouncementVideo`, `EconomicAnalysis`, `EconomicNotification`, etc. **Aucun n'est lié au trading en compte** → pas de risque de collision de noms avec les modèles démo.

### 4. API existantes (montées dans `backend/server.js`)
`/api/auth`, `/api/videos`, `/api/banners`, `/api/prospects`, `/api/consultations`,
`/api/vacation-programs`, `/api/trainers`, `/api/admin`, `/api/consultation-sheets`,
`/api/announcements`, `/api/student-consultations`, `/api/emails`, `/api/services`,
**`/api/backtests`**, **`/api/economics`**.
→ Le Trading Demo ajoutera un routeur **`/api/demo`** (ou `/api/trading-demo`) sur le même modèle, protégé par `authenticateToken`.

### 5. WebSocket existant
- **Aucun serveur WS exposé au frontend.** `server.js` fait `app.listen(PORT)` (pas de `http.createServer`).
- `ws` est utilisé **uniquement côté serveur, en interne**, par `backend/utils/marketData/derivProvider.js` pour récupérer l'historique Deriv (ouvre/ferme une socket par requête).
- Le graphique « live » (`frontend/src/components/backtest/LiveChart.jsx:11`) **rafraîchit par polling toutes les 15 s** (`REFRESH_MS`), pas en streaming.
- La cloche « annonces éco » (`NotificationBell`) fonctionne aussi par **polling** (60 s).
→ **Le vrai temps réel (tick streaming) est à construire** : c'est le principal manque pour le Trading Demo.

### 6. Market data — abstraction DÉJÀ présente (réutilisable)
`backend/utils/marketData/` :
- `provider.js` : interface + `TIMEFRAMES` (M1, M5, M15, M30, H1, H4, D1 — **manque W1, MN**) + `MAX_CANDLES`.
- `index.js` : registre `getProvider(name)`, `listProviders()`. Providers : `deriv`, `binance`, `mt5`.
- `derivProvider.js` : implémentation réelle **historique** via Deriv WS (`ticks_history`, `style:'candles'`). Symboles : ~10 forex, 4 métaux, 6 indices, 2 crypto. **Pas de token requis** (app_id public 1089, surchargé par `DERIV_APP_ID`).
- `binanceProvider.js`, `mt5Provider.js` : stubs (`available:false`).
- Interface actuelle : `listSymbols`, `listTimeframes`, `getSymbolMeta`, `fetchCandles`.
  **Manque pour la démo** : `getQuote()`, `subscribeToQuotes()`, `unsubscribeFromQuotes()` (temps réel).

### 7. Indicateurs — déjà codés
`backend/utils/indicators/` : SMA, EMA, RSI, MACD, Bollinger, Stochastic, ATR, VWAP, Volume, helpers (**manque ADX, Ichimoku**). Côté graphique, KLineCharts fournit nativement MA/EMA/BOLL/RSI/MACD/KDJ (exports dans `frontend/src/components/backtest/chartShared.jsx`).

### 8. Dashboards & UI réutilisables
- 3 dashboards : `frontend/src/pages/dashboards/{Client,Trainer,Admin}Dashboard.jsx` + `ClientSidebar/TrainerSidebar/AdminSidebar`.
- **Pattern d'ajout d'une section** (déjà utilisé par « Annonces éco » et « Backtesting ») :
  1. `import Xxx from '...'`
  2. un `case 'xxx': return <Xxx/>` dans le `switch` de rendu
  3. une entrée `{ id:'xxx', icon, label }` dans `navItems`.
  → Le Trading Demo s'ajoutera exactement ainsi (au moins dans le dashboard **client** ; extensible trainer/admin).
- **Graphique réutilisable** : `frontend/src/components/backtest/chartShared.jsx` exporte `DRAW_TOOLS` (trendline, ray, lignes H/V, canal parallèle, Fibonacci, rectangle, texte), `CHART_STYLES`, `ensureRectOverlay`, et les menus `DrawToolsMenu`, `IndicatorsMenu`, `MarketPicker`, `useFullscreen`, `detectPriceDigits`. **Directement réutilisables** pour le terminal.

### 9. Notifications
- Backend : modèle `EconomicNotification` + scheduler `setInterval` (`backend/utils/economicCalendar/scheduler.js`) créant des documents à des paliers, lus via polling. Pas de push temps réel.
→ Réutilisable comme **modèle mental** pour d'éventuelles notifications de trading (SL/TP touché, ordre déclenché), mais le Trading Demo privilégiera le **WS** pour ces événements.

---

## PARTIE C — Proposition d'intégration (sans casser l'existant)

### Principe directeur
Tout est **additif** et **isolé** sous un namespace `demo` : nouveau routeur `/api/demo`,
nouveaux modèles préfixés `Demo*`/trading, nouveau dossier front `components/trading-demo/`,
une seule section ajoutée aux dashboards. **Aucun** modèle/route/écran existant modifié
(hormis 3 points d'ancrage : montage du routeur dans `server.js`, câblage d'un serveur WS,
ajout de la section dans le(s) dashboard(s)).

### Il n'existe PAS de trading « réel »
Aucun système de trading réel n'est présent (le backtesting est de la simulation
historique). Le Trading Demo est donc **intrinsèquement isolé** : toutes les transactions
sont virtuelles, portées par `DemoAccount`. Aucune passerelle vers un broker réel.

### C.1 — Modèles (ÉTAPE 2), alignés sur les conventions Mongoose existantes
Nouveaux fichiers `backend/models/` + enregistrement dans `models/index.js`. Convention
proposée : **snake_case** (cohérent avec le code existant) — les noms « métier » du cahier
des charges sont mappés ci-dessous. *(À confirmer : garder camelCase du cahier des charges,
ou snake_case du codebase. Recommandation : snake_case pour l'homogénéité.)*

- **DemoAccount** : `user_id (ref User, unique, index)`, `account_number`, `balance`,
  `equity`, `used_margin`, `free_margin`, `leverage (défaut 100)`, `currency ('USD')`,
  `initial_balance (10000)`, `status ('active')`, timestamps. → **1 compte par user** (index unique sur `user_id`).
- **Instrument** : `symbol (unique)`, `name`, `category (enum FOREX|CRYPTO|METALS|INDICES|SYNTHETIC|OTHER)`,
  `enabled`, `contract_size`, `tick_size`, `tick_value`, `pip_size`, `min_volume`,
  `max_volume`, `volume_step`, `provider ('deriv'…)`, `provider_symbol` (ex. `frxEURUSD`).
  → Formalise et **persiste** les métadonnées aujourd'hui codées en dur dans `derivProvider.js`, en y ajoutant les paramètres nécessaires au P&L correct.
- **Position** : `demo_account_id (ref, index)`, `instrument_id (ref)`, `side (BUY|SELL)`,
  `volume`, `entry_price`, `current_price`, `stop_loss`, `take_profit`, `profit`,
  `status (OPEN|CLOSED)`, `opened_at`, timestamps.
- **PendingOrder** : `demo_account_id`, `instrument_id`, `type (BUY_LIMIT|SELL_LIMIT|BUY_STOP|SELL_STOP)`,
  `volume`, `entry_price`, `stop_loss`, `take_profit`, `status (PENDING|TRIGGERED|CANCELLED)`, `created_at`.
- **Trade** (historique) : `demo_account_id`, `instrument_id`, `side`, `volume`,
  `entry_price`, `exit_price`, `stop_loss`, `take_profit`, `profit`, `opened_at`,
  `closed_at`, `close_reason (MANUAL|STOP_LOSS|TAKE_PROFIT|PARTIAL)`.
- **Watchlist** : `user_id (ref, index)`, `symbols: [String]` (ou docs `instrument_id`).

Index & intégrité : `user_id` unique sur DemoAccount ; index sur `demo_account_id`+`status`
pour Position/PendingOrder ; contrôle d'appartenance systématique
`findOne({ _id, demo_account_id })` avec vérification que le compte appartient à `req.user.id`.

### C.2 — Market data & temps réel (ÉTAPE 3) — extension de l'existant
1. **Étendre l'interface provider** (`provider.js`) avec `getQuote(symbol)`,
   `subscribeToQuotes(symbols, cb)`, `unsubscribeFromQuotes(sub)` — sans casser `fetchCandles`.
2. **derivProvider** : ajouter le streaming de ticks Deriv (`{ ticks: symbol, subscribe: 1 }`,
   `forget`/`forget_all`) via **une connexion WS persistante partagée** (au lieu d'ouvrir/fermer par requête). Réutiliser pour `getHistoricalData` l'actuel `fetchCandles`.
   - ⚠️ **Bid/Ask** : les ticks Deriv renvoient un prix unique (mid) + `pip_size`. Le
     Bid/Ask/Spread sera **dérivé d'un spread configuré par instrument** (champ sur `Instrument`). BUY=Ask, SELL=Bid calculés serveur. À valider à l'étape 3/5.
3. **Ajouter W1 et MN** aux `TIMEFRAMES`.
4. **Serveur WebSocket** vers le front : transformer `app.listen` en
   `const server = http.createServer(app); server.listen(...)` puis attacher un
   `WebSocketServer` (`ws`, déjà installé) sur un chemin dédié (ex. `/ws/market`).
   - **Auth WS** : le token JWT ne peut pas passer par l'intercepteur Axios → le transmettre en query (`?token=`) ou premier message, vérifié avec `jwt.verify`.
   - Fan-out : un seul abonnement Deriv par symbole côté serveur, ré-émis à tous les clients abonnés (anti-abonnements multiples). Nettoyage à la déconnexion.
   - Railway supporte les WebSockets (même port HTTP).
5. **Clés/API** : rester 100 % serveur (déjà le cas — le front ne reçoit jamais `DERIV_APP_ID`/clés).
6. **Synthetic** : préparer la catégorie + un provider dédié optionnel, **sans inventer de prix** (désactivé tant qu'aucun provider réel n'est branché).

### C.3 — Terminal UI (ÉTAPE 4)
- Nouveau dossier `frontend/src/components/trading-demo/` + page `frontend/src/pages/TradingDemo.jsx`.
- **Réutiliser** : le graphique KLineCharts et `chartShared.jsx` (dessins, indicateurs, fullscreen, MarketPicker), les composants `ui/` (tabs, card, dialog, table), `sonner` pour les toasts.
- **Nouveau hook** `useMarketSocket()` : `WebSocket` natif (pas de socket.io-client à ajouter), reconnexion exponentielle, détection de perte (heartbeat), abonnement unique par symbole, cleanup au démontage.
- Header temps réel (Balance/Equity/Margin/Free/Floating P&L), Watchlist (favoris via modèle Watchlist), navigation mobile (Chart/Trade/Positions/Orders/History/Watchlist).
- **Timeframes** : ajouter W1/MN dans l'UI (dépend de C.2.3).

### C.4 — Moteur d'ordres & financier (ÉTAPES 5-7)
- `backend/utils/tradingDemo/` : `pricing.js` (Bid/Ask/spread), `pnl.js` (P&L par instrument
  selon contract/tick/pip), `engine.js` (ouverture/fermeture/partielle, marge, equity),
  `watcher.js` (`setInterval`/tick handler surveillant SL/TP et pending orders **côté serveur**, indépendant de la présence de l'utilisateur — même approche que le scheduler éco).
- Exécution **prix serveur** uniquement ; validations serveur ; anti-double-clic
  (idempotency key ou verrou par compte) ; ownership sur chaque route.

### C.5 — Points d'ancrage à modifier (minimal, non destructif)
1. `backend/server.js` : monter `/api/demo` + passer à `http.createServer` pour attacher le WS. *(2 ajouts, aucune suppression.)*
2. `backend/models/index.js` : exporter les nouveaux modèles.
3. `frontend/src/pages/dashboards/ClientDashboard.jsx` (puis trainer/admin) : import + `case` + `navItems` (pattern existant).
4. `backend/package.json` / `frontend/package.json` : a priori **aucune nouvelle dépendance** (ws + klinecharts déjà là). Optionnel : lib Ichimoku/ADX si requis à l'étape 4.

### C.6 — Risques & décisions à trancher (avant étape 2)
- **Convention de nommage** des champs : snake_case (codebase) vs camelCase (cahier des charges). → *recommandé : snake_case.*
- **Bid/Ask sur Deriv** : dérivés d'un spread configuré (Deriv ne donne pas de bid/ask natifs sur ticks). → à valider.
- **Couverture des instruments** : Deriv couvre forex/métaux/indices/2 crypto. Pour les 8 crypto et pairs forex manquantes, prévoir extension `derivProvider` et/ou activation `binanceProvider` (crypto). Synthetic = architecture seulement.
- **Timeframes W1/MN** : à ajouter à `TIMEFRAMES` + granularités Deriv.
- **Migrations** : pas de Prisma → « migrations » = schémas Mongoose + script de seed des `Instrument`. Le `run-migration.js` actuel ne sera pas utilisé.

---

## Ce qui est réutilisé vs nouveau (synthèse)

| Besoin Trading Demo | Réutilisé | Nouveau |
|---|---|---|
| Auth / isolation user | ✅ `authenticateToken`, `req.user.id`, pattern `findOne({_id,user_id})` | — |
| Graphique chandeliers, dessins, indicateurs | ✅ KLineCharts + `chartShared.jsx` | Câblage temps réel |
| Données historiques (OHLC) | ✅ `derivProvider.fetchCandles` | `getHistoricalData` (alias) |
| Abstraction provider | ✅ `utils/marketData/` | +`getQuote/subscribe/unsubscribe` |
| Indicateurs | ✅ 9 indicateurs backend + natifs KLineCharts | ADX, Ichimoku (si requis) |
| UI (tabs/card/dialog/table/toasts) | ✅ `components/ui/`, sonner | Écrans terminal |
| Intégration dashboard | ✅ pattern navItems+switch | 1 section « Trading Demo » |
| **Temps réel (tick streaming)** | dépendance `ws` déjà là | **Serveur WS `/ws/market` + hook front** |
| **Compte démo & moteur** | — | **6 modèles + moteur P&L/marge + watcher** |

---

*Fin de l'ÉTAPE 1. En attente d'instruction pour l'ÉTAPE 2.*
