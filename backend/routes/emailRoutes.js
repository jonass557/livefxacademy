const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { User, EmailLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const adminOnly = [authenticateToken, requireRole(['admin'])];

// Configure email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * @swagger
 * /api/emails/recipients:
 *   get:
 *     summary: Get all email recipients (trainers and students)
 *     tags: [Emails]
 */
router.get('/recipients', adminOnly, async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = { email: { $ne: null, $ne: '' } };
    
    if (type === 'trainers') {
      query.role = 'trainer';
    } else if (type === 'students') {
      query.role = 'client';
    } else if (type !== 'all') {
      query.role = { $in: ['trainer', 'client'] };
    }
    
    const users = await User.find(query)
      .select('full_name email role created_at')
      .sort({ role: 1, full_name: 1 });
    
    res.json(users.map(u => ({ ...u.toObject(), id: u._id })));
  } catch (err) {
    console.error('Error fetching recipients:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/emails/send:
 *   post:
 *     summary: Send email to selected recipients
 *     tags: [Emails]
 */
router.post('/send', adminOnly, async (req, res) => {
  try {
    const { recipients, subject, message, sendToAll, recipientType } = req.body;
    const adminId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Sujet et message requis' });
    }

    let emailList = [];

    if (sendToAll) {
      let query = { email: { $ne: null, $ne: '' } };
      if (recipientType === 'trainers') {
        query.role = 'trainer';
      } else if (recipientType === 'students') {
        query.role = 'client';
      } else {
        query.role = { $in: ['trainer', 'client'] };
      }
      
      const users = await User.find(query).select('email full_name');
      emailList = users.map(u => ({ email: u.email, full_name: u.full_name }));
    } else if (recipients && recipients.length > 0) {
      const users = await User.find({ _id: { $in: recipients } }).select('email full_name');
      emailList = users.map(u => ({ email: u.email, full_name: u.full_name }));
    }

    if (emailList.length === 0) {
      return res.status(400).json({ message: 'Aucun destinataire sélectionné' });
    }

    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      await EmailLog.create({
        admin_id: adminId,
        recipients_count: emailList.length,
        subject,
        message,
        status: 'pending',
        error_message: 'SMTP non configuré'
      });
      
      return res.status(200).json({ 
        message: `Email enregistré pour ${emailList.length} destinataire(s). Configuration SMTP requise pour l'envoi.`,
        pending: true,
        recipientsCount: emailList.length
      });
    }

    const transporter = createTransporter();

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const recipient of emailList) {
      try {
        await transporter.sendMail({
          from: `"LivefxTrading" <${process.env.SMTP_USER}>`,
          to: recipient.email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; text-align: center;">LivefxTrading</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="color: #374151; font-size: 16px;">Bonjour ${recipient.full_name || 'cher membre'},</p>
                <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="color: #6b7280; font-size: 12px; text-align: center;">
                  Cet email vous a été envoyé par l'équipe LivefxTrading.<br/>
                  <a href="https://livefx-trading.com" style="color: #6366f1;">Visiter notre site</a>
                </p>
              </div>
            </div>
          `
        });
        successCount++;
      } catch (emailErr) {
        failedCount++;
        errors.push({ email: recipient.email, error: emailErr.message });
      }
    }

    await EmailLog.create({
      admin_id: adminId,
      recipients_count: emailList.length,
      subject,
      message,
      status: failedCount === 0 ? 'sent' : 'partial',
      sent_count: successCount,
      failed_count: failedCount
    });

    res.json({
      message: `Email envoyé à ${successCount} destinataire(s)${failedCount > 0 ? `, ${failedCount} échec(s)` : ''}`,
      successCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('Error sending emails:', err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi des emails' });
  }
});

/**
 * @swagger
 * /api/emails/history:
 *   get:
 *     summary: Get email sending history
 *     tags: [Emails]
 */
router.get('/history', adminOnly, async (req, res) => {
  try {
    const logs = await EmailLog.find().sort({ created_at: -1 }).limit(50);
    
    const result = await Promise.all(logs.map(async (log) => {
      const admin = await User.findById(log.admin_id);
      return { ...log.toObject(), id: log._id, admin_name: admin?.full_name };
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching email history:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/emails/templates:
 *   get:
 *     summary: Get email templates
 *     tags: [Emails]
 */
router.get('/templates', adminOnly, async (req, res) => {
  // Predefined templates
  const templates = [
    {
      id: 1,
      name: 'Bienvenue',
      subject: 'Bienvenue chez LivefxTrading !',
      message: `Nous sommes ravis de vous accueillir au sein de LivefxTrading !

Votre parcours vers l'excellence en trading commence maintenant. Voici quelques ressources pour bien démarrer :

• Accédez à votre espace membre
• Consultez nos vidéos de formation
• Rejoignez notre communauté Telegram

N'hésitez pas à nous contacter si vous avez des questions.

À très bientôt !
L'équipe LivefxTrading`
    },
    {
      id: 2,
      name: 'Nouvelle Formation',
      subject: 'Nouvelle formation disponible !',
      message: `Excellente nouvelle !

Une nouvelle formation est maintenant disponible dans votre espace membre.

Connectez-vous dès maintenant pour découvrir ce nouveau contenu et continuer votre progression.

Bonne formation !
L'équipe LivefxTrading`
    },
    {
      id: 3,
      name: 'Rappel Session',
      subject: 'Rappel : Session de formation à venir',
      message: `N'oubliez pas !

Une session de formation est prévue prochainement. Assurez-vous d'être disponible et préparé.

Détails de la session :
• Date : [À compléter]
• Heure : [À compléter]
• Lien : [À compléter]

À très bientôt !
L'équipe LivefxTrading`
    },
    {
      id: 4,
      name: 'Programme Vacances',
      subject: 'Programme Vacances Trading Junior - Inscriptions ouvertes !',
      message: `Les inscriptions pour le Programme Vacances Trading Junior sont ouvertes !

Offrez à vos enfants une expérience unique d'apprentissage du trading pendant les vacances.

Au programme :
• Initiation aux marchés financiers
• Stratégies de base
• Sessions pratiques
• Certificat de participation

Places limitées ! Inscrivez-vous dès maintenant.

L'équipe LivefxTrading`
    }
  ];
  
  res.json(templates);
});

module.exports = router;
