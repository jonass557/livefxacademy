const express = require('express');
const router = express.Router();
const { AnnouncementVideo, VideoView, User, AnnouncementLike, AnnouncementComment } = require('../models');
const jwt = require('jsonwebtoken');
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
  params: async (req, file) => {
    return {
      folder: 'livefx_announcements',
      resource_type: 'auto',
    };
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max
});

// Middleware admin only
const adminOnly = [authenticateToken, requireRole(['admin'])];

// Auth optionnelle : décode le token s'il est présent, sinon continue en anonyme.
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

// ==================== PUBLIC ROUTES (for clients) ====================

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get all active announcement videos (for clients)
 *     tags: [Announcements]
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const videos = await AnnouncementVideo.find({ is_active: true })
      .sort({ priority: -1, created_at: -1 });

    const userId = req.user?.id;
    const result = await Promise.all(videos.map(async (v) => {
      const admin = await User.findById(v.admin_id);
      const like_count = await AnnouncementLike.countDocuments({ video_id: v._id });
      const liked_by_me = userId
        ? !!(await AnnouncementLike.findOne({ video_id: v._id, user_id: userId }))
        : false;
      const comment_count = await AnnouncementComment.countDocuments({ video_id: v._id });
      return {
        ...v.toObject(),
        id: v._id,
        admin_name: admin?.full_name,
        like_count,
        liked_by_me,
        share_count: v.share_count || 0,
        comment_count,
        my_comment_count: comment_count
      };
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
router.post('/admin/upload', adminOnly, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Erreur lors du téléchargement' });
    next();
  });
}, async (req, res) => {
  try {
    const file = req.files?.[0] || req.file;
    const { title, description, priority = 0, media_type, media_url } = req.body;
    const adminId = req.user?.id || req.user?._id;
    
    if (!title) {
      return res.status(400).json({ message: 'Le titre est requis' });
    }

    if (!file && !media_url) {
      return res.status(400).json({ message: 'Veuillez fournir un fichier (vidéo ou image) ou une URL média' });
    }

    let resolvedMediaType = (media_type === 'image' || media_type === 'video') ? media_type : null;
    let finalUrl = media_url;
    let publicId = '';

    if (file) {
      const isVideo = file.mimetype ? file.mimetype.startsWith('video') : /\.(mp4|mov|avi|webm|mkv|m4v)(\?.*)?$/i.test(file.path || file.originalname || '');
      resolvedMediaType = resolvedMediaType || (isVideo ? 'video' : 'image');
      finalUrl = file.path;
      publicId = file.filename || '';
    } else {
      const isVideo = resolvedMediaType === 'video' || /\.(mp4|mov|avi|webm|mkv|m4v)(\?.*)?$/i.test(media_url || '');
      resolvedMediaType = resolvedMediaType || (isVideo ? 'video' : 'image');
    }
    
    const post = await AnnouncementVideo.create({
      admin_id: adminId,
      title: title.trim(),
      description: (description || '').trim(),
      cloudinary_public_id: publicId,
      cloudinary_url: finalUrl,
      media_type: resolvedMediaType,
      priority: parseInt(priority) || 0
    });
    
    res.status(201).json({ message: 'Publication ajoutée avec succès au fil d\'actualité', video: post, post });
  } catch (err) {
    console.error('Error creating announcement post:', err);
    res.status(500).json({ message: err.message || 'Erreur lors de l\'enregistrement de la publication' });
  }
});

/**
 * @swagger
 * /api/announcements/admin/:id:
 *   put:
 *     summary: Update an announcement video or post
 *     tags: [Announcements]
 */
router.put('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_active, priority, media_type } = req.body;
    
    const video = await AnnouncementVideo.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(is_active !== undefined && { is_active }),
        ...(priority !== undefined && { priority }),
        ...(media_type && { media_type })
      },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ message: 'Publication non trouvée' });
    }
    
    res.json({ message: 'Publication mise à jour', video, post: video });
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
      return res.status(404).json({ message: 'Publication non trouvée' });
    }
    
    // Delete from Cloudinary
    if (video.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(video.cloudinary_public_id, {
          resource_type: video.media_type === 'image' ? 'image' : 'video'
        });
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr);
      }
    }
    
    await AnnouncementVideo.findByIdAndDelete(id);
    await VideoView.deleteMany({ video_id: id });
    await AnnouncementLike.deleteMany({ video_id: id });
    await AnnouncementComment.deleteMany({ video_id: id });
    
    res.json({ message: 'Publication supprimée avec succès' });
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


// ============================================================
//  INTERACTIONS : LIKE / PARTAGE / COMMENTAIRES
// ============================================================

// Like / unlike (toggle) d'une annonce.
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const existing = await AnnouncementLike.findOne({ video_id: id, user_id: userId });
    let liked;
    if (existing) {
      await AnnouncementLike.deleteOne({ _id: existing._id });
      liked = false;
    } else {
      await AnnouncementLike.create({ video_id: id, user_id: userId });
      liked = true;
    }
    const like_count = await AnnouncementLike.countDocuments({ video_id: id });
    res.json({ liked, like_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Incrémente le compteur de partages d'une annonce.
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const video = await AnnouncementVideo.findByIdAndUpdate(
      id,
      { $inc: { share_count: 1 } },
      { new: true }
    );
    if (!video) return res.status(404).json({ message: 'Annonce introuvable' });
    res.json({ share_count: video.share_count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupère les commentaires du fil d'actualité pour l'annonce.
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await AnnouncementComment.find({ video_id: id }).sort({ created_at: 1 });
    const result = await Promise.all(comments.map(async (c) => {
      const author = await User.findById(c.author_id);
      return {
        ...c.toObject(),
        id: c._id,
        author_name: author?.full_name || 'Utilisateur',
        is_admin: c.author_role === 'admin'
      };
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Crée un commentaire sur une publication du fil d'actualité.
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Le commentaire ne peut pas être vide' });
    }
    const comment = await AnnouncementComment.create({
      video_id: id,
      thread_owner_id: req.user.id,
      author_id: req.user.id,
      author_role: req.user.role,
      content: content.trim(),
      parent_id: null
    });
    res.status(201).json({ message: 'Commentaire publié', comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Répond à un commentaire (administrateur ou membres).
router.post('/comments/:commentId/reply', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'La réponse ne peut pas être vide' });
    }
    const parent = await AnnouncementComment.findById(commentId);
    if (!parent) return res.status(404).json({ message: 'Commentaire introuvable' });

    const reply = await AnnouncementComment.create({
      video_id: parent.video_id,
      thread_owner_id: parent.thread_owner_id || req.user.id,
      author_id: req.user.id,
      author_role: req.user.role,
      content: content.trim(),
      parent_id: parent.parent_id || parent._id
    });
    res.status(201).json({ message: 'Réponse publiée', reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;