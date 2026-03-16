const express = require('express');
const router = express.Router();
const { StudentConsultation, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Middleware client only
const clientOnly = [authenticateToken, requireRole(['client'])];
// Middleware admin only
const adminOnly = [authenticateToken, requireRole(['admin'])];

// ==================== CLIENT ROUTES ====================

/**
 * @swagger
 * /api/student-consultations/my:
 *   get:
 *     summary: Get student's own consultation sheet
 *     tags: [StudentConsultation]
 */
router.get('/my', clientOnly, async (req, res) => {
  try {
    const userId = req.user.id;
    const consultation = await StudentConsultation.findOne({ user_id: userId })
      .sort({ created_at: -1 });
    res.json(consultation || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/student-consultations:
 *   post:
 *     summary: Submit a new consultation sheet
 *     tags: [StudentConsultation]
 */
router.post('/', clientOnly, async (req, res) => {
  try {
    const userId = req.user.id;
    const consultationData = { ...req.body, user_id: userId };

    let consultation = await StudentConsultation.findOne({ user_id: userId, status: 'pending' });

    if (consultation) {
      Object.assign(consultation, consultationData);
      await consultation.save();
      return res.json({ message: 'Fiche de consultation mise à jour', consultation });
    }

    consultation = await StudentConsultation.create(consultationData);
    res.status(201).json({ message: 'Fiche de consultation envoyée avec succès', consultation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/student-consultations/my-consultation:
 *   delete:
 *     summary: Delete student's consultation (only if draft/not submitted)
 *     tags: [StudentConsultation]
 */
router.delete('/my-consultation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const consultation = await StudentConsultation.findOne({ user_id: userId })
      .sort({ created_at: -1 });
    
    if (!consultation) {
      return res.status(404).json({ message: 'Aucune fiche trouvée' });
    }
    
    if (consultation.status !== 'draft') {
      return res.status(403).json({ 
        message: 'Impossible de supprimer une fiche déjà envoyée à l\'administrateur' 
      });
    }
    
    await StudentConsultation.findByIdAndDelete(consultation._id);
    res.json({ message: 'Fiche supprimée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/student-consultations/save-draft:
 *   post:
 *     summary: Save student's consultation as draft
 *     tags: [StudentConsultation]
 */
router.post('/save-draft', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const consultationData = { ...req.body, user_id: userId, status: 'draft' };
    
    let consultation = await StudentConsultation.findOne({ user_id: userId, status: 'draft' })
      .sort({ created_at: -1 });
    
    if (consultation) {
      Object.assign(consultation, consultationData);
      await consultation.save();
    } else {
      consultation = await StudentConsultation.create(consultationData);
    }
    
    res.json({ message: 'Brouillon enregistré', consultation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/student-consultations/admin/stats:
 *   get:
 *     summary: Get student consultation statistics
 *     tags: [StudentConsultation]
 */
router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const total = await StudentConsultation.countDocuments();
    const pending = await StudentConsultation.countDocuments({ status: 'pending' });
    const reviewed = await StudentConsultation.countDocuments({ status: 'reviewed' });
    const contacted = await StudentConsultation.countDocuments({ status: 'contacted' });
    const this_week = await StudentConsultation.countDocuments({ created_at: { $gte: sevenDaysAgo } });
    
    const consultations = await StudentConsultation.find({ satisfaction_rating: { $ne: null } });
    const avg_satisfaction = consultations.length > 0 
      ? (consultations.reduce((sum, c) => sum + (c.satisfaction_rating || 0), 0) / consultations.length).toFixed(1)
      : null;
    
    res.json({ total, pending, reviewed, contacted, this_week, avg_satisfaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/student-consultations/admin/all:
 *   get:
 *     summary: Get all student consultations
 *     tags: [StudentConsultation]
 */
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const consultations = await StudentConsultation.find(query).sort({ created_at: -1 });
    
    const result = await Promise.all(consultations.map(async (sc) => {
      const user = await User.findById(sc.user_id);
      const reviewer = sc.reviewed_by ? await User.findById(sc.reviewed_by) : null;
      return {
        ...sc.toObject(),
        id: sc._id,
        user_name: user?.full_name,
        user_email: user?.email,
        reviewer_name: reviewer?.full_name
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
 * /api/student-consultations/admin/:id:
 *   get:
 *     summary: Get a single student consultation
 *     tags: [StudentConsultation]
 */
router.get('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const consultation = await StudentConsultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ message: 'Fiche non trouvée' });
    }
    
    const user = await User.findById(consultation.user_id);
    const reviewer = consultation.reviewed_by ? await User.findById(consultation.reviewed_by) : null;
    
    res.json({
      ...consultation.toObject(),
      id: consultation._id,
      user_name: user?.full_name,
      user_email: user?.email,
      user_phone: user?.phone,
      reviewer_name: reviewer?.full_name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/student-consultations/admin/:id/review:
 *   patch:
 *     summary: Review a student consultation
 *     tags: [StudentConsultation]
 */
router.patch('/admin/:id/review', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.user.id;
    
    const consultation = await StudentConsultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ message: 'Fiche non trouvée' });
    }
    
    if (status) consultation.status = status;
    if (admin_notes) consultation.admin_notes = admin_notes;
    consultation.reviewed_at = new Date();
    consultation.reviewed_by = adminId;
    await consultation.save();
    
    res.json({ message: 'Fiche mise à jour', consultation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/student-consultations/admin/:id:
 *   delete:
 *     summary: Delete a student consultation
 *     tags: [StudentConsultation]
 */
router.delete('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const consultation = await StudentConsultation.findByIdAndDelete(id);
    if (!consultation) {
      return res.status(404).json({ message: 'Fiche non trouvée' });
    }
    
    res.json({ message: 'Fiche supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
