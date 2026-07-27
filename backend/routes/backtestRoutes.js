const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const backtestController = require('../controllers/backtestController');

// Toutes les routes de backtest nécessitent une session authentifiée.
router.use(authenticateToken);

/**
 * @swagger
 * /api/backtests/meta:
 *   get:
 *     summary: Métadonnées (fournisseurs, symboles, timeframes, indicateurs, templates)
 *     tags: [Backtests]
 */
router.get('/meta', backtestController.getMeta);

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
