const express = require('express');
const router = express.Router();
const { Prospect, ProspectComment, User } = require('../models');

/**
 * @swagger
 * /api/prospects:
 *   get:
 *     summary: Get all prospects with filters
 *     tags: [Prospects]
 */
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const prospects = await Prospect.find(query)
      .populate('assigned_to', 'full_name')
      .sort({ 
        status: 1,
        created_at: -1 
      })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Prospect.countDocuments(query);
    
    const result = await Promise.all(prospects.map(async (p) => {
      const commentCount = await ProspectComment.countDocuments({ prospect_id: p._id });
      return {
        ...p.toObject(),
        id: p._id,
        assigned_name: p.assigned_to?.full_name,
        comment_count: commentCount
      };
    }));
    
    res.json({
      prospects: result,
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
 * /api/prospects/stats:
 *   get:
 *     summary: Get prospect statistics
 *     tags: [Prospects]
 */
router.get('/stats', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const total_count = await Prospect.countDocuments();
    const new_count = await Prospect.countDocuments({ status: 'new' });
    const contacted_count = await Prospect.countDocuments({ status: 'contacted' });
    const converted_count = await Prospect.countDocuments({ status: 'converted' });
    const rejected_count = await Prospect.countDocuments({ status: 'rejected' });
    const conversion_rate = total_count > 0 ? ((converted_count / total_count) * 100).toFixed(2) : 0;
    const weekly_new = await Prospect.countDocuments({ created_at: { $gte: sevenDaysAgo } });
    const monthly_new = await Prospect.countDocuments({ created_at: { $gte: thirtyDaysAgo } });
    
    res.json({
      summary: {
        new_count,
        contacted_count,
        converted_count,
        rejected_count,
        total_count,
        conversion_rate,
        weekly_new,
        monthly_new
      },
      daily: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/prospects/{id}:
 *   patch:
 *     summary: Update prospect status and add comment
 *     tags: [Prospects]
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, comment, admin_id } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    if (Object.keys(updateData).length > 0) {
      await Prospect.findByIdAndUpdate(id, updateData);
    }
    
    // Add comment if provided
    if (comment && admin_id) {
      await ProspectComment.create({
        prospect_id: id,
        admin_id,
        content: comment
      });
    }
    
    // Round-robin assignment for next prospect
    if (['contacted', 'converted', 'rejected'].includes(status)) {
      const nextProspect = await Prospect.findOne({ 
        status: 'new', 
        assigned_to: null 
      }).sort({ created_at: 1 });
      
      if (nextProspect) {
        const admins = await User.find({ role: 'admin' }).sort({ _id: 1 });
        
        if (admins.length > 0) {
          const lastAssignment = await Prospect.findOne({ 
            assigned_to: { $ne: null } 
          }).sort({ created_at: -1 });
          
          let nextAdminIndex = 0;
          if (lastAssignment) {
            const lastAdminIndex = admins.findIndex(a => 
              a._id.toString() === lastAssignment.assigned_to?.toString()
            );
            nextAdminIndex = (lastAdminIndex + 1) % admins.length;
          }
          
          nextProspect.assigned_to = admins[nextAdminIndex]._id;
          await nextProspect.save();
        }
      }
    }
    
    res.json({ message: 'Prospect mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/prospects/{id}/comments:
 *   get:
 *     summary: Get comments for a prospect
 *     tags: [Prospects]
 */
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await ProspectComment.find({ prospect_id: id })
      .populate('admin_id', 'full_name')
      .sort({ created_at: -1 });
    
    const result = comments.map(c => ({
      ...c.toObject(),
      id: c._id,
      admin_name: c.admin_id?.full_name
    }));
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
