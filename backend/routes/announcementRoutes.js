const express = require('express');
const router = express.Router();
const { AnnouncementVideo, VideoView, User } = require('../models');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'livefx_announcements',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
  },
});

const upload = multer({ storage: storage });

// Middleware admin only
const adminOnly = [authenticateToken, requireRole(['admin'])];

// ==================== PUBLIC ROUTES (for clients) ====================

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get all active announcement videos (for clients)
 *     tags: [Announcements]
 */
router.get('/', async (req, res) => {
  try {
    const videos = await AnnouncementVideo.find({ is_active: true })
      .sort({ priority: -1, created_at: -1 });
    
    const result = await Promise.all(videos.map(async (v) => {
      const admin = await User.findById(v.admin_id);
      return { ...v.toObject(), id: v._id, admin_name: admin?.full_name };
    }));
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/announcements/:id/view:
 *   post:
 *     summary: Mark video as viewed by user
 *     tags: [Announcements]
 */
router.post('/:id/view', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const existingView = await VideoView.findOne({ video_id: id, user_id: userId });
    if (!existingView) {
      await VideoView.create({ video_id: id, user_id: userId });
      await AnnouncementVideo.findByIdAndUpdate(id, { $inc: { view_count: 1 } });
    }
    
    res.json({ message: 'Vue enregistrée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/announcements/admin/all:
 *   get:
 *     summary: Get all announcement videos (admin)
 *     tags: [Announcements]
 */
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const videos = await AnnouncementVideo.find().sort({ created_at: -1 });
    
    const result = await Promise.all(videos.map(async (v) => {
      const admin = await User.findById(v.admin_id);
      const uniqueViews = await VideoView.countDocuments({ video_id: v._id });
      return { ...v.toObject(), id: v._id, admin_name: admin?.full_name, unique_views: uniqueViews };
    }));
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/announcements/admin/stats:
 *   get:
 *     summary: Get announcement video statistics
 *     tags: [Announcements]
 */
router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const total_videos = await AnnouncementVideo.countDocuments();
    const active_videos = await AnnouncementVideo.countDocuments({ is_active: true });
    const videos = await AnnouncementVideo.find();
    const total_views = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
    const new_this_week = await AnnouncementVideo.countDocuments({ created_at: { $gte: sevenDaysAgo } });
    
    res.json({ total_videos, active_videos, total_views, new_this_week });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/announcements/admin/upload:
 *   post:
 *     summary: Upload a new announcement video
 *     tags: [Announcements]
 */
router.post('/admin/upload', adminOnly, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier vidéo fourni' });
    }
    
    const { title, description, priority = 0 } = req.body;
    const adminId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ message: 'Le titre est requis' });
    }
    
    const video = await AnnouncementVideo.create({
      admin_id: adminId,
      title,
      description,
      cloudinary_public_id: req.file.filename,
      cloudinary_url: req.file.path,
      priority: parseInt(priority)
    });
    
    res.status(201).json({ message: 'Vidéo d\'annonce publiée avec succès', video });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/announcements/admin/:id:
 *   put:
 *     summary: Update an announcement video
 *     tags: [Announcements]
 */
router.put('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_active, priority } = req.body;
    
    const video = await AnnouncementVideo.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active }),
        ...(priority !== undefined && { priority })
      },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ message: 'Vidéo non trouvée' });
    }
    
    res.json({ message: 'Vidéo mise à jour', video });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/announcements/admin/:id:
 *   delete:
 *     summary: Delete an announcement video
 *     tags: [Announcements]
 */
router.delete('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const video = await AnnouncementVideo.findById(id);
    if (!video) {
      return res.status(404).json({ message: 'Vidéo non trouvée' });
    }
    
    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(video.cloudinary_public_id, { resource_type: 'video' });
    } catch (cloudErr) {
      console.error('Cloudinary delete error:', cloudErr);
    }
    
    await AnnouncementVideo.findByIdAndDelete(id);
    await VideoView.deleteMany({ video_id: id });
    
    res.json({ message: 'Vidéo supprimée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/announcements/admin/:id/toggle:
 *   patch:
 *     summary: Toggle video active status
 *     tags: [Announcements]
 */
router.patch('/admin/:id/toggle', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const video = await AnnouncementVideo.findById(id);
    if (!video) {
      return res.status(404).json({ message: 'Vidéo non trouvée' });
    }
    
    video.is_active = !video.is_active;
    await video.save();
    
    res.json({
      message: video.is_active ? 'Vidéo activée' : 'Vidéo désactivée',
      video
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
