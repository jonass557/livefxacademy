const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Plans publics / pour membres
router.get('/plans', subscriptionController.getActivePlans);

// Admin : gestion des plans
router.get('/admin/plans', authenticateToken, requireRole(['admin']), subscriptionController.getAdminPlans);
router.post('/admin/plans', authenticateToken, requireRole(['admin']), subscriptionController.createPlan);
router.put('/admin/plans/:id', authenticateToken, requireRole(['admin']), subscriptionController.updatePlan);
router.delete('/admin/plans/:id', authenticateToken, requireRole(['admin']), subscriptionController.deletePlan);

// Paiements Mobile Money (SEBPAY)
router.post('/pay/mobile', authenticateToken, subscriptionController.initiateMobilePayment);
router.get('/status/:reference', authenticateToken, subscriptionController.checkPaymentStatus);
router.get('/my-history', authenticateToken, subscriptionController.getMySubscriptions);

// Webhook SEBPAY (public car appelé par les serveurs SEBPAY)
router.post('/webhook/sebpay', subscriptionController.sebpayWebhook);

module.exports = router;
