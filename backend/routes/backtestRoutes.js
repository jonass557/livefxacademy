const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const backtestController = require('../controllers/backtestController');

/**
 * @swagger
 * /api/backtests/meta:
 *   get:
 *     summary: Métadonnées (fournisseurs, symboles, timeframes, indicateurs, templates)
 *     tags: [Backtests]
 */
router.get('/meta', optionalAuth, backtestController.getMeta);

/**
 * @swagger
 * /api/backtests/candles:
 *   get:
 *     summary: Bougies récentes d'un marché (graphique en direct)
 *     tags: [Backtests]
 */
// NB: déclarée avant '/:id' pour ne pas être interprétée comme un id.
router.get('/candles', optionalAuth, backtestController.getMarketCandles);

// Les routes suivantes (historique personnel, sauvegarde) nécessitent une session authentifiée.
router.use(authenticateToken);

/**
 * @swagger
 * /api/backtests/run:
 *   post:
 *     summary: Lancer un backtest (et le sauvegarder par défaut)
 *     tags: [Backtests]
 */
router.post('/run', backtestController.runBacktest);

/**
 * @swagger
 * /api/backtests:
 *   get:
 *     summary: Historique des backtests de l'utilisateur connecté
 *     tags: [Backtests]
 */
router.get('/', backtestController.listBacktests);

/**
 * @swagger
 * /api/backtests/:id/candles:
 *   get:
 *     summary: Bougies OHLC d'un backtest (re-téléchargées, pour le graphique/replay)
 *     tags: [Backtests]
 */
router.get('/:id/candles', backtestController.getBacktestCandles);

/**
 * @swagger
 * /api/backtests/:id:
 *   get:
 *     summary: Détail complet d'un backtest
 *     tags: [Backtests]
 */
router.get('/:id', backtestController.getBacktest);

/**
 * @swagger
 * /api/backtests/:id:
 *   delete:
 *     summary: Supprimer un backtest
 *     tags: [Backtests]
 */
router.delete('/:id', backtestController.deleteBacktest);

module.exports = router;
