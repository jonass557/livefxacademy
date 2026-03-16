const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', videoController.getVideos);
router.post('/upload', authenticateToken, requireRole(['trainer', 'admin']), videoController.uploadMiddleware.single('video'), videoController.uploadVideo);

module.exports = router;
