# Plan de travail — Correctifs & Améliorations LiveFx Academy

> **Note d'intégrité :** Ce projet a été conçu avec Claude Opus 4.8. Conformément aux directives, **l'architecture du projet (routes, contrôleurs, modèles, arborescence front/back) est strictement conservée**. Aucune refonte structurelle ne sera opérée ; seules les corrections ciblées, les ajustements d'UI et les optimisations demandées seront appliquées.

---

## 1. Diagnostic des Problèmes & Solutions

### A. Bug de la page blanche sur « Annonces éco »
* **Diagnostic :**
  Dans `frontend/src/components/economic/EventAnalysisModal.jsx`, la condition `if (!event) return null;` est positionnée à la ligne 29, **avant** l'appel du Hook `React.useEffect` à la ligne 32. 
  En React 18, lors de l'ouverture d'un événement, le composant exécute plus de hooks que lors de son premier rendu à vide (`selected = null`). Cela déclenche l'erreur fatale : *"Rendered more hooks than during the previous render"*, ce qui démonte l'ensemble de l'arbre React et provoque un écran blanc complet sans contenu.
* **Solution :**
  1. Déplacer tous les Hooks (`useState`, `useEffect`) au tout début du composant avant toute condition de sortie (`return null`).
  2. Réinitialiser proprement l'état local (`results`, `actual`) lors du changement d'événement (`event?.id`).
  3. Conditionner le montage dans `CalendarView.jsx` (`{selected && <EventAnalysisModal ... />}`) pour éviter tout montage inutile à vide.
  4. Ajouter un `ErrorBoundary` ou une capture d'erreur pour garantir qu'un problème ponctuel dans un composant ne fasse jamais tomber toute la page.

---

### B. Rubrique Graphique (Trading Démo)
* **B1. Masquage de la balance / equity dans la vue Graphique :**
  * *Demande :* « Lorsque la page s'ouvre et on clic sur le bouton graphique la partie concernant la balance,equity et autre ne doit plus être visible à cette endroit... Cette partie doit rien que être visible au niveau de trade, position, ordre et historique ».
  * *Action :* Dans `TradingDemo.jsx`, n'afficher `<AccountHeader />` que si l'onglet actif est `trade`, `positions`, `orders`, ou `history`. Sur l'onglet `chart` (Graphique), l'en-tête du compte est masqué pour dédier 100% de la vue au graphique.
* **B2. Suppression de « Tableau de bord client » au-dessus du graphique :**
  * *Demande :* « enlève également tableau de bord client qui s'y trouve ».
  * *Action :* Dans `frontend/src/pages/Dashboard.jsx`, le composant englobant affichait un en-tête avec `Tableau de bord` et le badge `CLIENT` même lorsque l'URL était en section graphique (`?section=trading-demo`). Cet en-tête sera masqué lorsque `isChartSection` est actif (`trading-demo` ou `backtesting`).
* **B3. Page du graphique fixe et non scrolable :**
  * *Demande :* « la page du graphique de trading demo ne doit pas être scrolable elle doit être fixe et le graphique bien visible et fluide ».
  * *Action :*
    - Configurer le conteneur du graphique en `h-[calc(100dvh-4rem)]` (ou `h-screen overflow-hidden` quand la navbar est absente).
    - Empêcher le scroll vertical global sur la vue graphique.
    - Adapter `DemoChart.jsx` pour que le canvas KLineCharts occupe `flex-1 h-full w-full min-h-0`, avec recalcul fluide du resize lors des changements de dimensions de fenêtre et d'orientation mobile.
* **B4. Logo incrusté sur le graphique (taille, couleur vive, position fixe) :**
  * *Demande :* « le logo de la page trading demo sur le graphique n'ai pas visible ajouter la taille et que la couleur du logo soit visible et il doit bien être fixe ».
  * *Action :*
    - Dans `frontend/src/components/backtest/chartShared.jsx` (`ChartWatermark`) :
      - Supprimer le filtre `filter: grayscale(0.3)` qui décolorait le logo.
      - Augmenter l'opacité de `0.4` à `0.9` (couleurs d'origine bien vives et nettes).
      - Augmenter la taille du logo (passer de `h-6 / h-7` à `h-10 sm:h-12 md:h-14`).
      - Positionnement fixe absolu en bas à gauche (`bottom-3 left-3 pointer-events-none z-20`) sans interférer avec les chandeliers ni les boutons.
* **B5. Modification du logo depuis le Dashboard Administrateur :**
  * *Demande :* « l'administrateur doit être capable de modifier se logo depuis sont dashboard je parle du logo du graphique et de la navbar ».
  * *Action :*
    - Vérifier et fiabiliser la section **Branding** dans l'espace Admin (`/dashboard?section=branding`).
    - L'admin peut y téléverser à la fois le `Logo de la barre de navigation` et le `Logo du graphique Trading Demo`.
    - Ajouter également un accès direct vers le Branding depuis l'accueil du tableau de bord Admin pour une visibilité immédiate.
    - Vérifier la prise en compte en temps réel des deux logos sans avoir à vider le cache du navigateur.
* **B6. Timeframes en liste déroulante (identique au Backtesting) :**
  * *Demande :* « les timeframes du graphique trading demo doit être en liste déroulante exactement comme pour le backtesting ».
  * *Action :*
    - Dans `DemoChart.jsx`, remplacer la rangée de boutons de timeframes par un composant déroulant (`Dropdown` avec `ChevronDown`, identique à celui de `Backtesting.jsx`), affichant l'unité sélectionnée (ex: `H1`) et permettant de choisir en un clic parmi `M1`, `M5`, `M15`, `M30`, `H1`, `H4`, `D1`, `W1`.

---

## 2. Ordre d'Exécution des Travaux

1. **Sauvegarde & Planification :** Enregistrement du présent plan (dans le repo et en artifact).
2. **Correction du Bug Annonces Éco :**
   - Correction de l'ordre des Hooks dans `EventAnalysisModal.jsx`.
   - Sécurisation du rendu dans `CalendarView.jsx`.
3. **Mise à jour du Dashboard & Rubrique Graphique :**
   - Masquage de `Tableau de bord [CLIENT]` dans `Dashboard.jsx` pour les vues graphiques.
   - Refonte du conteneur `TradingDemo.jsx` pour masquer la balance sur l'onglet graphique et ne l'afficher que sur trade/positions/ordres/historique.
   - Fixation du layout du graphique (non scrolable, `overflow-hidden`, pleine hauteur fluide).
   - Remplacement des boutons de timeframes par un menu déroulant (`Dropdown`).
   - Agrandissement, clarification des couleurs et fixation du logo dans `chartShared.jsx`.
4. **Vérification du Branding Admin :**
   - Contrôle du fonctionnement des uploads logo navbar + logo graphique dans l'Admin.
   - Ajout d'une carte d'accès rapide au Branding sur le dashboard Admin.
5. **Vérification Responsive & Tests :**
   - Test du build Vite (`npm run build`).
   - Vérification du comportement mobile, tablette et bureau.
6. **Préparation au Déploiement :**
   - Commit Git avec les messages détaillés.
   - Guide pour le déploiement sur le terminal cPanel.
