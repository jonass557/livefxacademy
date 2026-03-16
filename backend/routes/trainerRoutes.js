const express = require('express');
const router = express.Router();
const { User, Trainer, TrainerStrategy } = require('../models');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/trainers/profile:
 *   get:
 *     summary: Get trainer's own profile with registration info
 *     tags: [Trainers]
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (user.role !== 'trainer') {
      return res.status(403).json({ message: 'Accès réservé aux formateurs' });
    }
    
    const trainerProfile = await Trainer.findOne({ user_id: userId });
    
    const profile = trainerProfile ? trainerProfile.toObject() : {
      user_id: userId,
      bio: '',
      specialty: '',
      is_verified: false
    };
    
    res.json({
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      trainer_profile: profile
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/trainers/profile:
 *   put:
 *     summary: Update trainer's profile
 *     tags: [Trainers]
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, specialty, years_experience, certifications, linkedin, twitter, youtube, myfxbook } = req.body;
    
    let trainerProfile = await Trainer.findOne({ user_id: userId });
    
    if (!trainerProfile) {
      trainerProfile = await Trainer.create({
        user_id: userId,
        bio,
        specialty,
        years_experience,
        certifications,
        linkedin,
        twitter,
        youtube,
        myfxbook
      });
    } else {
      if (bio !== undefined) trainerProfile.bio = bio;
      if (specialty !== undefined) trainerProfile.specialty = specialty;
      if (years_experience !== undefined) trainerProfile.years_experience = years_experience;
      if (certifications !== undefined) trainerProfile.certifications = certifications;
      if (linkedin !== undefined) trainerProfile.linkedin = linkedin;
      if (twitter !== undefined) trainerProfile.twitter = twitter;
      if (youtube !== undefined) trainerProfile.youtube = youtube;
      if (myfxbook !== undefined) trainerProfile.myfxbook = myfxbook;
      await trainerProfile.save();
    }
    
    res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== STRATEGIES CRUD ====================

/**
 * @swagger
 * /api/trainers/strategies:
 *   get:
 *     summary: Get all strategies for the logged-in trainer
 *     tags: [Trainers]
 */
router.get('/strategies', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const strategies = await TrainerStrategy.find({ trainer_id: userId })
      .sort({ created_at: -1 });
    
    res.json(strategies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/trainers/strategies:
 *   post:
 *     summary: Create a new strategy
 *     tags: [Trainers]
 */
router.post('/strategies', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      market_type,
      timeframe,
      risk_reward_ratio,
      win_rate,
      entry_criteria,
      exit_criteria,
      risk_management
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Le nom de la stratégie est requis' });
    }
    
    const strategy = await TrainerStrategy.create({
      trainer_id: userId,
      name,
      description,
      market_type,
      timeframe,
      risk_reward_ratio,
      win_rate,
      entry_criteria,
      exit_criteria,
      risk_management
    });
    
    res.status(201).json(strategy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/trainers/strategies/:id:
 *   put:
 *     summary: Update a strategy
 *     tags: [Trainers]
 */
router.put('/strategies/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const strategyId = req.params.id;
    const {
      name,
      description,
      market_type,
      timeframe,
      risk_reward_ratio,
      win_rate,
      entry_criteria,
      exit_criteria,
      risk_management,
      is_active
    } = req.body;
    
    const strategy = await TrainerStrategy.findOne({ _id: strategyId, trainer_id: userId });
    
    if (!strategy) {
      return res.status(404).json({ message: 'Stratégie non trouvée' });
    }
    
    if (name !== undefined) strategy.name = name;
    if (description !== undefined) strategy.description = description;
    if (market_type !== undefined) strategy.market_type = market_type;
    if (timeframe !== undefined) strategy.timeframe = timeframe;
    if (risk_reward_ratio !== undefined) strategy.risk_reward_ratio = risk_reward_ratio;
    if (win_rate !== undefined) strategy.win_rate = win_rate;
    if (entry_criteria !== undefined) strategy.entry_criteria = entry_criteria;
    if (exit_criteria !== undefined) strategy.exit_criteria = exit_criteria;
    if (risk_management !== undefined) strategy.risk_management = risk_management;
    if (is_active !== undefined) strategy.is_active = is_active;
    
    await strategy.save();
    
    res.json(strategy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/trainers/strategies/:id:
 *   delete:
 *     summary: Delete a strategy
 *     tags: [Trainers]
 */
router.delete('/strategies/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const strategyId = req.params.id;
    
    const strategy = await TrainerStrategy.findOneAndDelete({ _id: strategyId, trainer_id: userId });
    
    if (!strategy) {
      return res.status(404).json({ message: 'Stratégie non trouvée' });
    }
    
    res.json({ message: 'Stratégie supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/trainers/strategies/:id:
 *   get:
 *     summary: Get a single strategy by ID
 *     tags: [Trainers]
 */
router.get('/strategies/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const strategyId = req.params.id;
    
    const strategy = await TrainerStrategy.findOne({ _id: strategyId, trainer_id: userId });
    
    if (!strategy) {
      return res.status(404).json({ message: 'Stratégie non trouvée' });
    }
    
    res.json(strategy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
