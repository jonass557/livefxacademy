const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { VacationProgram, VacationRegistration, Prospect, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const adminOnly = [authenticateToken, requireRole(['admin'])];

// Cloudinary config (shared env vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for payment proof (images or PDF)
const paymentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'livefx_payment_proofs',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  },
});

const uploadProof = multer({ storage: paymentStorage });

// Email transporter (same config as emailRoutes)
const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /api/vacation-programs:
 *   get:
 *     summary: Get all active vacation programs
 *     tags: [Vacation Programs]
 */
router.get('/', async (req, res) => {
  try {
    const programs = await VacationProgram.find({
      is_active: true,
      end_date: { $gte: new Date() }
    }).sort({ start_date: 1 });
    
    res.json(programs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/vacation-programs/register:
 *   post:
 *     summary: Register for vacation program
 *     tags: [Vacation Programs]
 */
router.post('/register', uploadProof.single('payment_proof'), async (req, res) => {
  try {
    const {
      program_id,
      student_name,
      student_age,
      parent_name,
      parent_email,
      parent_phone,
      session,
      amount
    } = req.body;

    // Resolve program (price/title) if a program_id is provided
    let program = null;
    if (program_id) {
      program = await VacationProgram.findById(program_id).catch(() => null);
    }

    const resolvedAmount = amount !== undefined && amount !== ''
      ? Number(amount)
      : (program ? program.price : undefined);
    const programTitle = program ? program.title : (session || 'Programme Vacances Junior');

    // Save the registration (with payment proof if uploaded)
    const registration = await VacationRegistration.create({
      program_id: program ? program._id : undefined,
      program_title: programTitle,
      student_name,
      student_age: student_age ? Number(student_age) : undefined,
      parent_name,
      parent_email,
      parent_phone,
      session,
      amount: resolvedAmount,
      payment_proof_url: req.file ? req.file.path : undefined,
      payment_proof_public_id: req.file ? req.file.filename : undefined,
      status: 'pending'
    });

    // Also create a prospect for follow-up (existing behaviour)
    const prospect = await Prospect.create({
      full_name: parent_name,
      email: parent_email,
      phone: parent_phone,
      status: 'new',
      notes: `PROGRAMME VACANCES JUNIOR
        Programme: ${programTitle}
        Élève: ${student_name} (${student_age} ans)
        Session: ${session || '-'}
        Montant: ${resolvedAmount != null ? resolvedAmount : '-'}
        Preuve de paiement: ${req.file ? req.file.path : 'Non fournie'}`
    });

    // Round-robin assignment
    const admin = await User.findOne({ role: 'admin' }).sort({ _id: 1 });
    if (admin) {
      prospect.assigned_to = admin._id;
      await prospect.save();
    }

    // Notify all admins by email (best-effort)
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const admins = await User.find({ role: 'admin', email: { $ne: null, $ne: '' } }).select('email');
        const adminEmails = admins.map(a => a.email).filter(Boolean);
        if (adminEmails.length > 0) {
          const transporter = createTransporter();
          await transporter.sendMail({
            from: `"LiveFx Academy" <${process.env.SMTP_USER}>`,
            to: adminEmails.join(','),
            subject: `Nouvelle inscription - ${programTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color:#6366f1;">Nouvelle inscription au programme vacances</h2>
                <p><strong>Programme :</strong> ${programTitle}</p>
                <p><strong>Élève :</strong> ${student_name || '-'} (${student_age || '-'} ans)</p>
                <p><strong>Parent/Tuteur :</strong> ${parent_name || '-'}</p>
                <p><strong>Email :</strong> ${parent_email || '-'}</p>
                <p><strong>Téléphone :</strong> ${parent_phone || '-'}</p>
                <p><strong>Session :</strong> ${session || '-'}</p>
                <p><strong>Montant :</strong> ${resolvedAmount != null ? resolvedAmount : '-'}</p>
                <p><strong>Preuve de paiement :</strong> ${req.file ? `<a href="${req.file.path}">Voir le justificatif</a>` : 'Non fournie'}</p>
              </div>
            `
          });
        }
      }
    } catch (mailErr) {
      console.error('Erreur envoi email inscription vacances:', mailErr.message);
    }

    res.status(201).json({
      message: 'Inscription au programme vacances enregistrée',
      registrationId: registration._id,
      prospectId: prospect._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/vacation-programs/admin/all:
 *   get:
 *     summary: Get all vacation programs (admin)
 *     tags: [Vacation Programs]
 */
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const programs = await VacationProgram.find().sort({ created_at: -1 });
    
    const result = await Promise.all(programs.map(async (p) => {
      const registrationsCount = await VacationRegistration.countDocuments({ program_id: p._id });
      return {
        ...p.toObject(),
        id: p._id,
        registrations_count: registrationsCount
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
 * /api/vacation-programs/admin/stats:
 *   get:
 *     summary: Get vacation programs statistics
 *     tags: [Vacation Programs]
 */
router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const now = new Date();
    
    const total_programs = await VacationProgram.countDocuments();
    const active_programs = await VacationProgram.countDocuments({ 
      is_active: true, 
      end_date: { $gte: now } 
    });
    const upcoming_programs = await VacationProgram.countDocuments({ 
      start_date: { $gt: now } 
    });
    const pending_registrations = await VacationRegistration.countDocuments({ status: 'pending' });
    const confirmed_registrations = await VacationRegistration.countDocuments({ status: 'confirmed' });
    
    res.json({
      total_programs,
      active_programs,
      upcoming_programs,
      pending_registrations,
      confirmed_registrations
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/vacation-programs:
 *   post:
 *     summary: Create a new vacation program (admin only)
 *     tags: [Vacation Programs]
 */
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, description, start_date, end_date, price, location, max_participants, age_range, image_url } = req.body;
    
    const program = await VacationProgram.create({
      title,
      description,
      start_date,
      end_date,
      price,
      location,
      max_participants,
      age_range,
      image_url,
      created_by: req.user.id
    });
    
    res.status(201).json(program);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/vacation-programs/:id:
 *   put:
 *     summary: Update a vacation program (admin only)
 *     tags: [Vacation Programs]
 */
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, price, location, max_participants, age_range, image_url, is_active } = req.body;
    
    const program = await VacationProgram.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(description && { description }),
        ...(start_date && { start_date }),
        ...(end_date && { end_date }),
        ...(price !== undefined && { price }),
        ...(location && { location }),
        ...(max_participants !== undefined && { max_participants }),
        ...(age_range && { age_range }),
        ...(image_url && { image_url }),
        ...(is_active !== undefined && { is_active })
      },
      { new: true }
    );
    
    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }
    
    res.json(program);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/vacation-programs/:id:
 *   delete:
 *     summary: Delete a vacation program (admin only)
 *     tags: [Vacation Programs]
 */
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const program = await VacationProgram.findByIdAndDelete(id);
    
    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }
    
    res.json({ message: 'Programme supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/vacation-programs/admin/registrations:
 *   get:
 *     summary: Get all vacation registrations (admin only)
 *     tags: [Vacation Programs]
 */
router.get('/admin/registrations', adminOnly, async (req, res) => {
  try {
    const registrations = await VacationRegistration.find().sort({ created_at: -1 });
    res.json(registrations.map(r => ({ ...r.toObject(), id: r._id })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/vacation-programs/:id/registrations:
 *   get:
 *     summary: Get registrations for a program (admin only)
 *     tags: [Vacation Programs]
 */
router.get('/:id/registrations', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const registrations = await VacationRegistration.find({ program_id: id })
      .sort({ created_at: -1 });
    
    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
