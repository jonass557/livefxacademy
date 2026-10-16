const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Espace utilisateur connecté : ses statistiques de parrainage
router.get('/my-stats', authenticateToken, referralController.getMyReferralStats);

// Espace admin : gestion globale du parrainage
router.get('/admin/overview', authenticateToken, requireRole(['admin']), referralController.getAdminReferralOverview);
router.patch('/admin/users/:userId/toggle', authenticateToken, requireRole(['admin']), referralController.toggleUserReferral);
router.post('/admin/referrers/:referrerId/pay-commissions', authenticateToken, requireRole(['admin']), referralController.markCommissionsPaid);
router.post('/admin/users/:referrerId/pay', authenticateToken, requireRole(['admin']), referralController.markCommissionsPaid);

module.exports = router;

