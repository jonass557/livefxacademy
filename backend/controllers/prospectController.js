const pool = require('../db');
const { z } = require('zod');

const prospectSchema = z.object({
  full_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  notes: z.string().optional(),
});

exports.createProspect = async (req, res) => {
  try {
    const { full_name, email, phone, notes } = prospectSchema.parse(req.body);

    // ROUND ROBIN LOGIC
    // 1. Get all admins
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC");
    
    let assignedTo = null;
    if (admins.rows.length > 0) {
      // 2. Find the admin who was assigned a lead least recently (simplest round robin implementation)
      // For a true round robin, we usually store a 'last_assigned_at' on the user table or use a sequence.
      // Here we will just query the last prospect assigned to find the next admin.
      
      const lastAssignment = await pool.query("SELECT assigned_to FROM prospects WHERE assigned_to IS NOT NULL ORDER BY created_at DESC LIMIT 1");
      
      if (lastAssignment.rows.length === 0) {
        assignedTo = admins.rows[0].id;
      } else {
        const lastAdminId = lastAssignment.rows[0].assigned_to;
        const lastAdminIndex = admins.rows.findIndex(a => a.id === lastAdminId);
        const nextIndex = (lastAdminIndex + 1) % admins.rows.length;
        assignedTo = admins.rows[nextIndex].id;
      }
    }

    const newProspect = await pool.query(
      'INSERT INTO prospects (full_name, email, phone, notes, assigned_to) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [full_name, email, phone, notes, assignedTo]
    );

    res.status(201).json(newProspect.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProspects = async (req, res) => {
  try {
    // Admins see all, or filter by assigned_to me
    const prospects = await pool.query('SELECT * FROM prospects ORDER BY created_at DESC');
    res.json(prospects.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
