const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const economicController = require('../controllers/economicController');

// Toutes les routes « annonces économiques » nécessitent une session authentifiée
// (disponibles dans les 3 dashboards : client, formateur, admin).
router.use(authenticateToken);

/**
 * @swagger
 * /api/economics/calendar:
 *   get:
 *     summary: Calendrier économique (filtrable par période/devise/importance)
 *     tags: [Economics]
 */
router.get('/calendar', economicController.getCalendar);

/**
 * @swagger
 * /api/economics/meta:
 *   get:
 *     summary: Métadonnées (devises, importances, banques centrales, IA activée ?)
 *     tags: [Economics]
 */
router.get('/meta', economicController.getMeta);

/**
 * @swagger
 * /api/economics/analyze:
 *   post:
 *     summary: Analyse IA d'un événement (fundamental | pre | post)
 *     tags: [Economics]
 */
router.post('/analyze', economicController.analyzeEvent);

/**
 * @swagger
 * /api/economics/central-bank:
 *   post:
 *     summary: Résumé IA d'une banque centrale (ton dovish/hawkish, conséquences)
 *     tags: [Economics]
 */
router.post('/central-bank', economicController.analyzeCentralBank);

/**
 * @swagger
 * /api/economics/chat:
 *   post:
 *     summary: Chatbot pédagogique macroéconomique
 *     tags: [Economics]
 */
router.post('/chat', economicController.chat);

/**
 * @swagger
 * /api/economics/notifications:
 *   get:
 *     summary: Notifications d'annonces à venir (cloche)
 *     tags: [Economics]
 */
router.get('/notifications', economicController.getNotifications);

/**
 * @swagger
 * /api/economics/notifications/read:
 *   post:
 *     summary: Marquer des notifications comme lues
 *     tags: [Economics]
 */
router.post('/notifications/read', economicController.markNotificationsRead);

module.exports = router;
