const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Plans publics & Configuration passerelle (SEBPAY / iKeePay)
router.get('/plans', subscriptionController.getActivePlans);
router.get('/payment-config', subscriptionController.getPaymentGatewayConfig);
router.get('/operators', subscriptionController.getSebpayOperators);
router.post('/public/pay', subscriptionController.initiatePublicMobilePayment);
router.post('/public/confirm-ikeepay', subscriptionController.confirmIkeepayPayment);
router.post('/public/start-trial', subscriptionController.startPublicTrial);
router.get('/public/status/:reference', subscriptionController.checkPublicPaymentStatus);

// Admin : gestion des plans & diagnostic passerelles
router.get('/admin/plans', authenticateToken, requireRole(['admin']), subscriptionController.getAdminPlans);
router.post('/admin/plans', authenticateToken, requireRole(['admin']), subscriptionController.createPlan);
router.put('/admin/plans/:id', authenticateToken, requireRole(['admin']), subscriptionController.updatePlan);
router.delete('/admin/plans/:id', authenticateToken, requireRole(['admin']), subscriptionController.deletePlan);
router.post('/admin/grant-free/:userId', authenticateToken, requireRole(['admin']), subscriptionController.grantFreeMonth);
router.post('/admin/revoke/:userId', authenticateToken, requireRole(['admin']), subscriptionController.revokeSubscription);
router.post('/admin/test-sebpay', authenticateToken, requireRole(['admin']), subscriptionController.testSebpayConnection);

// Paiements Mobile Money authentifiés
router.post('/pay/mobile', authenticateToken, subscriptionController.initiateMobilePayment);
router.post('/start-trial', authenticateToken, subscriptionController.startTrial);
router.get('/status/:reference', authenticateToken, subscriptionController.checkPaymentStatus);
router.get('/my-history', authenticateToken, subscriptionController.getMySubscriptions);

// Webhooks publics (SEBPAY & iKeePay)
router.post('/webhook/sebpay', subscriptionController.sebpayWebhook);
router.post('/webhook/ikeepay', subscriptionController.ikeepayWebhook);

module.exports = router;
