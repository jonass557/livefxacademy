const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Public route to get banners
router.get('/', bannerController.getBanners);

// Admin routes
router.post('/upload', authenticateToken, requireRole(['admin']), bannerController.uploadMiddleware.single('image'), bannerController.uploadBanner);
router.delete('/:id', authenticateToken, requireRole(['admin']), bannerController.deleteBanner);

module.exports = router;
