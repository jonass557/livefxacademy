const express = require('express');
const router = express.Router();
const { User, Trainer, ConsultationSheet, TrainerStrategy } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { sendMail, notifyAdmins } = require('../utils/mailer');

// ==================== TRAINER ROUTES ====================

/**
 * @swagger
 * /api/consultation-sheets/my-sheet:
 *   get:
 *     summary: Get trainer's own consultation sheet
 *     tags: [ConsultationSheets]
 */
router.get('/my-sheet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user || user.role !== 'trainer') {
      return res.status(403).json({ message: 'Accès réservé aux formateurs' });
    }
    
    const sheet = await ConsultationSheet.findOne({ trainer_id: userId })
      .sort({ created_at: -1 });
    
    if (!sheet) {
      return res.json({ sheet: null, strategies: [] });
    }
    
    const strategies = await TrainerStrategy.find({ trainer_id: userId })
      .sort({ created_at: -1 });
    
    res.json({
      sheet: { ...sheet.toObject(), trainer_name: user.full_name, trainer_email: user.email },
      strategies
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/consultation-sheets:
 *   post:
 *     summary: Create or update trainer's consultation sheet
 *     tags: [ConsultationSheets]
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      full_name, email, phone,
      trading_style, preferred_session, years_experience, win_rate,
      markets_traded, favorite_pairs, timeframes, indicators,
      capital_managed, risk_per_trade, risk_reward_ratio, monthly_target,
      coaching_experience, teaching_platform, availability, hourly_rate,
      myfxbook_link, tradingview_link, linkedin_link, youtube_link,
      strategies
    } = req.body;
    
    const user = await User.findById(userId);
    if (!user || user.role !== 'trainer') {
      return res.status(403).json({ message: 'Accès réservé aux formateurs' });
    }

    if (!full_name || !email || !phone) {
      return res.status(400).json({ message: 'Nom, email et téléphone sont obligatoires' });
    }
    
    let sheet = await ConsultationSheet.findOne({ 
      trainer_id: userId, 
      status: { $ne: 'rejected' } 
    }).sort({ created_at: -1 });
    
    const sheetData = {
      full_name, email, phone,
      trading_style, preferred_session, years_experience, win_rate,
      markets_traded, favorite_pairs, timeframes, indicators,
      capital_managed, risk_per_trade, risk_reward_ratio, monthly_target,
      coaching_experience, teaching_platform, availability, hourly_rate,
      myfxbook_link, tradingview_link, linkedin_link, youtube_link,
      strategies_data: strategies,
      status: 'pending'
    };
    
    if (sheet) {
      Object.assign(sheet, sheetData);
      await sheet.save();
    } else {
      sheet = await ConsultationSheet.create({ trainer_id: userId, ...sheetData });
    }

    // Notify admins that a trainer sheet was submitted
    notifyAdmins({
      subject: 'Nouvelle fiche formateur reçue',
      title: 'Nouvelle fiche d\'inscription formateur',
      html: `
        <p>Un formateur a envoyé sa fiche d'inscription.</p>
        <p><strong>Formateur :</strong> ${full_name}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Téléphone :</strong> ${phone || '-'}</p>
        <p>Connectez-vous à votre tableau de bord pour la consulter et la valider.</p>
      `
    });

    res.status(201).json({
      message: 'Fiche d\'inscription envoyée avec succès à l\'administrateur',
      sheet
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/consultation-sheets/my-sheet:
 *   delete:
 *     summary: Delete trainer's consultation sheet (only if draft/not submitted)
 *     tags: [ConsultationSheets]
 */
router.delete('/my-sheet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user || user.role !== 'trainer') {
      return res.status(403).json({ message: 'Accès réservé aux formateurs' });
    }
    
    const sheet = await ConsultationSheet.findOne({ trainer_id: userId })
      .sort({ created_at: -1 });
    
    if (!sheet) {
      return res.status(404).json({ message: 'Aucune fiche trouvée' });
    }
    
    if (sheet.status !== 'draft') {
      return res.status(403).json({ 
        message: 'Impossible de supprimer une fiche déjà envoyée à l\'administrateur' 
      });
    }
    
    await ConsultationSheet.findByIdAndDelete(sheet._id);
    
    res.json({ message: 'Fiche supprimée avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/consultation-sheets/save-draft:
 *   post:
 *     summary: Save trainer's consultation sheet as draft
 *     tags: [ConsultationSheets]
 */
router.post('/save-draft', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      full_name, email, phone,
      trading_style, preferred_session, years_experience, win_rate,
      markets_traded, favorite_pairs, timeframes, indicators,
      capital_managed, risk_per_trade, risk_reward_ratio, monthly_target,
      coaching_experience, teaching_platform, availability, hourly_rate,
      myfxbook_link, tradingview_link, linkedin_link, youtube_link,
      strategies
    } = req.body;
    
    const user = await User.findById(userId);
    if (!user || user.role !== 'trainer') {
      return res.status(403).json({ message: 'Accès réservé aux formateurs' });
    }
    
    let sheet = await ConsultationSheet.findOne({ trainer_id: userId, status: 'draft' })
      .sort({ created_at: -1 });
    
    const sheetData = {
      full_name, email, phone,
      trading_style, preferred_session, years_experience, win_rate,
      markets_traded, favorite_pairs, timeframes, indicators,
      capital_managed, risk_per_trade, risk_reward_ratio, monthly_target,
      coaching_experience, teaching_platform, availability, hourly_rate,
      myfxbook_link, tradingview_link, linkedin_link, youtube_link,
      strategies_data: strategies
    };
    
    if (sheet) {
      Object.assign(sheet, sheetData);
      await sheet.save();
    } else {
      sheet = await ConsultationSheet.create({ trainer_id: userId, ...sheetData, status: 'draft' });
    }
    
    res.json({ message: 'Brouillon enregistré', sheet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== ADMIN ROUTES ====================

const adminOnly = [authenticateToken, requireRole(['admin'])];

/**
 * @swagger
 * /api/consultation-sheets/admin/stats:
 *   get:
 *     summary: Get consultation sheets statistics (Admin only)
 *     tags: [ConsultationSheets]
 */
router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const total_sheets = await ConsultationSheet.countDocuments();
    const pending_sheets = await ConsultationSheet.countDocuments({ status: { $in: ['submitted', 'pending'] } });
    const reviewed_sheets = await ConsultationSheet.countDocuments({ status: 'reviewed' });
    const approved_sheets = await ConsultationSheet.countDocuments({ status: 'approved' });
    const rejected_sheets = await ConsultationSheet.countDocuments({ status: 'rejected' });
    const new_this_week = await ConsultationSheet.countDocuments({ created_at: { $gte: sevenDaysAgo } });
    
    res.json({ total_sheets, pending_sheets, reviewed_sheets, approved_sheets, rejected_sheets, new_this_week });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/consultation-sheets/admin/all:
 *   get:
 *     summary: Get all consultation sheets (Admin only)
 *     tags: [ConsultationSheets]
 */
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['pending', 'submitted'] };
      } else {
        query.status = status;
      }
    }
    
    const sheets = await ConsultationSheet.find(query).sort({ created_at: -1 });
    
    const result = await Promise.all(sheets.map(async (cs) => {
      const user = await User.findById(cs.trainer_id);
      const trainerProfile = await Trainer.findOne({ user_id: cs.trainer_id });
      const strategiesCount = await TrainerStrategy.countDocuments({ trainer_id: cs.trainer_id });
      
      return {
        ...cs.toObject(),
        id: cs._id,
        trainer_name: user?.full_name,
        trainer_email: user?.email,
        trainer_phone: user?.phone,
        specialty: trainerProfile?.specialty,
        years_experience: trainerProfile?.years_experience,
        is_verified: trainerProfile?.is_verified,
        strategies_count: strategiesCount
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
 * /api/consultation-sheets/admin/:id:
 *   get:
 *     summary: Get a single consultation sheet with full details (Admin only)
 *     tags: [ConsultationSheets]
 */
router.get('/admin/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const sheet = await ConsultationSheet.findById(id);
    if (!sheet) {
      return res.status(404).json({ message: 'Fiche de consultation non trouvée' });
    }
    
    const user = await User.findById(sheet.trainer_id);
    const trainerProfile = await Trainer.findOne({ user_id: sheet.trainer_id });
    const reviewer = sheet.reviewed_by ? await User.findById(sheet.reviewed_by) : null;
    const strategies = await TrainerStrategy.find({ trainer_id: sheet.trainer_id }).sort({ created_at: -1 });
    
    res.json({
      sheet: {
        ...sheet.toObject(),
        trainer_name: user?.full_name,
        trainer_email: user?.email,
        trainer_phone: user?.phone,
        trainer_registered_at: user?.created_at,
        bio: trainerProfile?.bio,
        specialty: trainerProfile?.specialty,
        years_experience: trainerProfile?.years_experience,
        certifications: trainerProfile?.certifications,
        is_verified: trainerProfile?.is_verified,
        linkedin: trainerProfile?.linkedin,
        twitter: trainerProfile?.twitter,
        youtube: trainerProfile?.youtube,
        myfxbook: trainerProfile?.myfxbook,
        reviewer_name: reviewer?.full_name
      },
      strategies
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/consultation-sheets/admin/:id/review:
 *   patch:
 *     summary: Review/update status of a consultation sheet (Admin only)
 *     tags: [ConsultationSheets]
 */
router.patch('/admin/:id/review', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.user.id;
    
    if (!['submitted', 'reviewed', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }
    
    const sheet = await ConsultationSheet.findById(id);
    if (!sheet) {
      return res.status(404).json({ message: 'Fiche de consultation non trouvée' });
    }
    
    sheet.status = status;
    if (admin_notes) sheet.admin_notes = admin_notes;
    sheet.reviewed_by = adminId;
    sheet.reviewed_at = new Date();
    await sheet.save();
    
    // Si approuvé, vérifier automatiquement le formateur
    if (status === 'approved') {
      await Trainer.findOneAndUpdate(
        { user_id: sheet.trainer_id },
        { is_verified: true },
        { upsert: true }
      );
    }

    // Notifier le formateur en cas d'approbation ou de rejet
    if (status === 'approved' || status === 'rejected') {
      const trainer = await User.findById(sheet.trainer_id);
      const trainerEmail = sheet.email || trainer?.email;
      if (trainerEmail) {
        const approved = status === 'approved';
        sendMail({
          to: trainerEmail,
          subject: approved ? 'Votre fiche formateur a été validée' : 'Votre fiche formateur a été examinée',
          title: approved ? 'Fiche validée ✅' : 'Fiche non retenue',
          html: approved
            ? `<p>Bonjour ${sheet.full_name || trainer?.full_name || ''},</p>
               <p>Votre fiche d'inscription formateur a été <strong>validée</strong> par l'administrateur. Votre compte est désormais vérifié.</p>
               ${admin_notes ? `<p><strong>Note de l'administrateur :</strong> ${admin_notes}</p>` : ''}
               <p>Bienvenue dans l'équipe LivefxTrading !</p>`
            : `<p>Bonjour ${sheet.full_name || trainer?.full_name || ''},</p>
               <p>Votre fiche d'inscription formateur n'a pas été retenue pour le moment.</p>
               ${admin_notes ? `<p><strong>Motif / note :</strong> ${admin_notes}</p>` : ''}
               <p>N'hésitez pas à mettre à jour votre fiche et à la renvoyer.</p>`
        });
      }
    }

    res.json({
      message: `Fiche ${status === 'approved' ? 'approuvée' : status === 'rejected' ? 'rejetée' : 'mise à jour'}`,
      sheet
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
