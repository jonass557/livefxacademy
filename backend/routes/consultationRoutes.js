const express = require('express');
const router = express.Router();
const { Prospect, Consultation, User } = require('../models');

/**
 * @swagger
 * /api/consultations/client:
 *   post:
 *     summary: Submit client consultation form (assess trading level)
 *     tags: [Consultations]
 */
router.post('/client', async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      trading_experience,
      trading_duration,
      capital_range,
      trading_goals,
      available_time,
      knowledge_areas,
      biggest_challenge
    } = req.body;

    const detailedNotes = `Consultation Client - Niveau: ${trading_experience}
      Durée trading: ${trading_duration}
      Capital prévu: ${capital_range}
      Temps disponible: ${available_time}
      Connaissances: ${knowledge_areas ? knowledge_areas.join(', ') : 'Aucune'}
      Défi principal: ${biggest_challenge}
    `;

    const prospect = await Prospect.create({
      full_name,
      email,
      phone,
      status: 'new',
      notes: detailedNotes
    });

    await Consultation.create({
      trading_level: trading_experience,
      goals: trading_goals,
      status: 'pending'
    });

    // Round-robin assignment to admin
    const admin = await User.findOne({ role: 'admin' }).sort({ _id: 1 });
    if (admin) {
      prospect.assigned_to = admin._id;
      await prospect.save();
    }

    res.status(201).json({ 
      message: 'Consultation enregistrée', 
      prospectId: prospect._id 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/consultations/trainer:
 *   post:
 *     summary: Submit trainer consultation form (strategy details)
 *     tags: [Consultations]
 */
router.post('/trainer', async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      trading_experience_years,
      main_strategy,
      strategy_description,
      markets_traded,
      win_rate,
      risk_management,
      teaching_experience,
      available_hours,
      why_join,
      portfolio_link
    } = req.body;

    const detailedNotes = `CANDIDATURE FORMATEUR - Stratégie: ${main_strategy}, Expérience: ${trading_experience_years} ans
      === CANDIDATURE FORMATEUR ===
      Marchés: ${markets_traded ? markets_traded.join(', ') : 'N/A'}
      Stratégie: ${main_strategy}
      Description: ${strategy_description}
      Taux de réussite: ${win_rate}
      Gestion risque: ${risk_management}
      Expérience formation: ${teaching_experience}
      Disponibilité: ${available_hours}
      Portfolio: ${portfolio_link || 'Non fourni'}
      Motivation: ${why_join}
    `;

    const prospect = await Prospect.create({
      full_name,
      email,
      phone,
      status: 'new',
      notes: detailedNotes
    });

    res.status(201).json({ 
      message: 'Candidature formateur enregistrée', 
      prospectId: prospect._id 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/consultations:
 *   get:
 *     summary: Get all consultations (admin only)
 *     tags: [Consultations]
 */
router.get('/', async (req, res) => {
  try {
    const consultations = await Consultation.find()
      .populate('client_id', 'full_name')
      .populate('trainer_id', 'full_name')
      .sort({ created_at: -1 });
    
    const result = consultations.map(c => ({
      ...c.toObject(),
      id: c._id,
      client_name: c.client_id?.full_name,
      trainer_name: c.trainer_id?.full_name
    }));
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
