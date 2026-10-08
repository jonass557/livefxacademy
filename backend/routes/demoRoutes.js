const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const demo = require('../controllers/demoController');

// Toutes les routes Trading Demo nécessitent une session authentifiée.
// L'isolation par utilisateur est appliquée dans le contrôleur (compte lié à req.user.id).
router.use(authenticateToken);

// Compte & métriques
router.get('/account', demo.getAccount);
router.post('/account/reset', demo.resetAccount);

// Marché
router.get('/instruments', demo.getInstruments);
router.get('/candles', demo.getCandles);

// Portefeuille
router.get('/positions', demo.getPositions);
router.get('/orders', demo.getOrders);
router.get('/history', demo.getHistory);

// Ordres au marché & gestion des positions (ÉTAPE 5 + 7)
router.post('/orders/market', demo.openMarket);
router.post('/positions/:id/close', demo.closePosition);
router.patch('/positions/:id', demo.updatePosition);

// Pending orders (ÉTAPE 6)
router.post('/orders/pending', demo.createPending);
router.patch('/orders/:id', demo.updatePending);
router.delete('/orders/:id', demo.cancelPending);

// Watchlist
router.get('/watchlist', demo.getWatchlist);
router.post('/watchlist', demo.updateWatchlist);

// Alertes de prix (TradingView / MT5 avec notifications email)
router.get('/alerts', demo.getAlerts);
router.post('/alerts', demo.createAlert);
router.patch('/alerts/:id', demo.toggleAlert);
router.delete('/alerts/:id', demo.deleteAlert);
router.delete('/alerts', demo.clearAlerts);

module.exports = router;
