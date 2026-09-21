const express = require('express');
const router = express.Router();
const brandingController = require('../controllers/brandingController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', brandingController.getBranding);
router.post('/admin/upload', authenticateToken, requireRole(['admin']), brandingController.uploadMiddleware.single('logo'), brandingController.uploadLogo);
router.delete('/admin/:type', authenticateToken, requireRole(['admin']), brandingController.deleteLogo);

module.exports = router;
