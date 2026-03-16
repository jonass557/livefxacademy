const express = require('express');
const router = express.Router();
const { User, Trainer, Prospect, TrainerStrategy } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Middleware: Admin only
const adminOnly = [authenticateToken, requireRole(['admin'])];

/**
 * @swagger
 * /api/admin/trainers/stats:
 *   get:
 *     summary: Get trainer statistics
 *     tags: [Admin]
 */
router.get('/trainers/stats', adminOnly, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trainers = await User.find({ role: 'trainer' });
    const trainerIds = trainers.map(t => t._id);
    const trainerProfiles = await Trainer.find({ user_id: { $in: trainerIds } });

    const total_trainers = trainers.length;
    const verified_trainers = trainerProfiles.filter(t => t.is_verified === true).length;
    const pending_trainers = total_trainers - verified_trainers;
    const new_this_month = trainers.filter(t => new Date(t.created_at) >= thirtyDaysAgo).length;

    res.json({
      total_trainers,
      verified_trainers,
      pending_trainers,
      new_this_month
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/admin/trainers:
 *   get:
 *     summary: Get all trainers with their profiles
 *     tags: [Admin]
 */
router.get('/trainers', adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    
    const trainers = await User.find({ role: 'trainer' }).sort({ created_at: -1 });
    
    const result = await Promise.all(trainers.map(async (user) => {
      const trainerProfile = await Trainer.findOne({ user_id: user._id });
      const strategiesCount = await TrainerStrategy.countDocuments({ trainer_id: user._id });
      
      // Filter by status
      if (status === 'verified' && (!trainerProfile || !trainerProfile.is_verified)) return null;
      if (status === 'pending' && trainerProfile?.is_verified === true) return null;
      
      return {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        created_at: user.created_at,
        trainer_id: trainerProfile?._id,
        bio: trainerProfile?.bio,
        specialty: trainerProfile?.specialty,
        strategy_description: trainerProfile?.strategy_description,
        is_verified: trainerProfile?.is_verified || false,
        years_experience: trainerProfile?.years_experience,
        certifications: trainerProfile?.certifications,
        linkedin: trainerProfile?.linkedin,
        twitter: trainerProfile?.twitter,
        youtube: trainerProfile?.youtube,
        myfxbook: trainerProfile?.myfxbook,
        strategies_count: strategiesCount
      };
    }));
    
    res.json(result.filter(r => r !== null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/admin/trainers/:id:
 *   get:
 *     summary: Get a single trainer with all details including strategies
 *     tags: [Admin]
 */
router.get('/trainers/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ _id: id, role: 'trainer' });
    if (!user) {
      return res.status(404).json({ message: 'Formateur non trouvé' });
    }
    
    const trainerProfile = await Trainer.findOne({ user_id: id });
    const strategies = await TrainerStrategy.find({ trainer_id: id }).sort({ created_at: -1 });
    
    res.json({
      trainer: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        created_at: user.created_at,
        trainer_id: trainerProfile?._id,
        bio: trainerProfile?.bio,
        specialty: trainerProfile?.specialty,
        strategy_description: trainerProfile?.strategy_description,
        is_verified: trainerProfile?.is_verified || false,
        years_experience: trainerProfile?.years_experience,
        certifications: trainerProfile?.certifications,
        linkedin: trainerProfile?.linkedin,
        twitter: trainerProfile?.twitter,
        youtube: trainerProfile?.youtube,
        myfxbook: trainerProfile?.myfxbook,
        trainer_created_at: trainerProfile?.created_at
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
 * /api/admin/trainers/:id/verify:
 *   patch:
 *     summary: Verify/approve or reject a trainer
 *     tags: [Admin]
 */
router.patch('/trainers/:id/verify', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;
    
    let trainerProfile = await Trainer.findOne({ user_id: id });
    
    if (!trainerProfile) {
      trainerProfile = await Trainer.create({ user_id: id, is_verified });
    } else {
      trainerProfile.is_verified = is_verified;
      await trainerProfile.save();
    }
    
    res.json({ message: is_verified ? 'Formateur approuvé' : 'Formateur rejeté' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/admin/trainers/:id:
 *   delete:
 *     summary: Delete a trainer
 *     tags: [Admin]
 */
router.delete('/trainers/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOneAndDelete({ _id: id, role: 'trainer' });
    if (!user) {
      return res.status(404).json({ message: 'Formateur non trouvé' });
    }
    
    // Also delete trainer profile and strategies
    await Trainer.deleteOne({ user_id: id });
    await TrainerStrategy.deleteMany({ trainer_id: id });
    
    res.json({ message: 'Formateur supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== USERS MANAGEMENT ====================

/**
 * @swagger
 * /api/admin/users/stats:
 *   get:
 *     summary: Get all users statistics
 *     tags: [Admin]
 */
router.get('/users/stats', adminOnly, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const total_users = await User.countDocuments();
    const total_clients = await User.countDocuments({ role: 'client' });
    const total_trainers = await User.countDocuments({ role: 'trainer' });
    const total_admins = await User.countDocuments({ role: 'admin' });
    const new_this_week = await User.countDocuments({ created_at: { $gte: sevenDaysAgo } });
    const new_this_month = await User.countDocuments({ created_at: { $gte: thirtyDaysAgo } });

    res.json({
      total_users,
      total_clients,
      total_trainers,
      total_admins,
      new_this_week,
      new_this_month
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all registered users (clients + trainers)
 *     tags: [Admin]
 */
router.get('/users', adminOnly, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { role: { $ne: 'admin' } };
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    const result = await Promise.all(users.map(async (user) => {
      let is_verified = true;
      let specialty = null;
      
      if (user.role === 'trainer') {
        const trainerProfile = await Trainer.findOne({ user_id: user._id });
        is_verified = trainerProfile?.is_verified || false;
        specialty = trainerProfile?.specialty;
      }
      
      return {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        is_verified,
        specialty
      };
    }));
    
    res.json({
      users: result,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/admin/users/:id:
 *   get:
 *     summary: Get a single user details
 *     tags: [Admin]
 */
router.get('/users/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    const trainerProfile = await Trainer.findOne({ user_id: id });
    
    res.json({
      ...user.toObject(),
      bio: trainerProfile?.bio,
      specialty: trainerProfile?.specialty,
      is_verified: trainerProfile?.is_verified,
      years_experience: trainerProfile?.years_experience,
      certifications: trainerProfile?.certifications,
      linkedin: trainerProfile?.linkedin,
      twitter: trainerProfile?.twitter,
      youtube: trainerProfile?.youtube,
      myfxbook: trainerProfile?.myfxbook
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/admin/users/:id:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 */
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Impossible de supprimer un administrateur' });
    }
    
    await User.findByIdAndDelete(id);
    await Trainer.deleteOne({ user_id: id });
    await TrainerStrategy.deleteMany({ trainer_id: id });
    
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== PROSPECTS ADVANCED STATS ====================

/**
 * @swagger
 * /api/admin/prospects/detailed-stats:
 *   get:
 *     summary: Get detailed prospect statistics with charts data
 *     tags: [Admin]
 */
router.get('/prospects/detailed-stats', adminOnly, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const prospects = await Prospect.find();
    
    const total_count = prospects.length;
    const new_count = prospects.filter(p => p.status === 'new').length;
    const contacted_count = prospects.filter(p => p.status === 'contacted').length;
    const converted_count = prospects.filter(p => p.status === 'converted').length;
    const rejected_count = prospects.filter(p => p.status === 'rejected').length;
    const conversion_rate = total_count > 0 ? ((converted_count / total_count) * 100).toFixed(2) : 0;
    const weekly_new = prospects.filter(p => new Date(p.created_at) >= sevenDaysAgo).length;
    const monthly_new = prospects.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length;
    const monthly_converted = prospects.filter(p => p.status === 'converted' && new Date(p.created_at) >= thirtyDaysAgo).length;

    // Daily stats (simplified)
    const daily = [];
    
    // Admin performance
    const adminsWithProspects = await Prospect.aggregate([
      { $match: { assigned_to: { $ne: null } } },
      { $group: {
        _id: '$assigned_to',
        total_handled: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
      }}
    ]);

    const adminPerformance = await Promise.all(adminsWithProspects.map(async (item) => {
      const admin = await User.findById(item._id);
      return {
        admin_name: admin?.full_name || 'Unknown',
        total_handled: item.total_handled,
        converted: item.converted,
        rejected: item.rejected
      };
    }));

    res.json({
      summary: {
        total_count,
        new_count,
        contacted_count,
        converted_count,
        rejected_count,
        conversion_rate,
        weekly_new,
        monthly_new,
        monthly_converted
      },
      daily,
      weekly: [],
      adminPerformance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
