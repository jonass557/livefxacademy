const express = require('express');
const router = express.Router();
const { Service } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const adminOnly = [authenticateToken, requireRole(['admin'])];

// ==================== PUBLIC ====================

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all active services (public)
 *     tags: [Services]
 */
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ is_active: true }).sort({ order: 1, created_at: 1 });
    res.json(services.map(s => ({ ...s.toObject(), id: s._id })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== ADMIN ====================

/**
 * @swagger
 * /api/services/admin/all:
 *   get:
 *     summary: Get all services including inactive (admin)
 *     tags: [Services]
 */
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const services = await Service.find().sort({ order: 1, created_at: 1 });
    res.json(services.map(s => ({ ...s.toObject(), id: s._id })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a service (admin only)
 *     tags: [Services]
 */
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, description, icon, color, details, whatsapp, phone, email, telegram, link, order, is_active } = req.body;
    if (!title) return res.status(400).json({ message: 'Le titre est requis' });

    const service = await Service.create({
      title,
      description,
      icon,
      color,
      details,
      whatsapp,
      phone,
      email,
      telegram,
      link,
      order,
      is_active,
      created_by: req.user.id
    });
    res.status(201).json({ ...service.toObject(), id: service._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/services/:id:
 *   put:
 *     summary: Update a service (admin only)
 *     tags: [Services]
 */
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { title, description, icon, color, details, whatsapp, phone, email, telegram, link, order, is_active } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(details !== undefined && { details }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(telegram !== undefined && { telegram }),
        ...(link !== undefined && { link }),
        ...(order !== undefined && { order }),
        ...(is_active !== undefined && { is_active })
      },
      { new: true }
    );
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    res.json({ ...service.toObject(), id: service._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/services/:id:
 *   delete:
 *     summary: Delete a service (admin only)
 *     tags: [Services]
 */
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    res.json({ message: 'Service supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
