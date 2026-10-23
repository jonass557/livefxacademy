const nodemailer = require('nodemailer');
const { User } = require('../models');

// Whether SMTP credentials or local MTA are available
const isConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS) || process.platform === 'linux';

const createTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false }
    });
  }
  // Fallback sendmail local sur serveur cPanel Linux
  return nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail',
  });
};

// Wrap content in the LivefxTrading branded email template
const wrap = (title, contentHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; text-align: center;">LivefxTrading</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
      ${title ? `<h2 style="color:#4f46e5; margin-top:0;">${title}</h2>` : ''}
      <div style="color: #374151; font-size: 14px; line-height: 1.6;">${contentHtml}</div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        Email automatique envoyé par LivefxTrading.
      </p>
    </div>
  </div>
`;

/**
 * Send a branded email. Best-effort: never throws, returns true/false.
 * @param {string|string[]} to - direct recipient(s)
 * @param {string|string[]} bcc - blind carbon copy recipient(s) (pour diffusion sans exposer les emails)
 * @param {string} subject
 * @param {string} title - heading shown inside the email body
 * @param {string} html - inner HTML content
 */
async function sendMail({ to, bcc, subject, title, html }) {
  try {
    const recipients = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : []);
    const bccRecipients = Array.isArray(bcc) ? bcc.filter(Boolean) : (bcc ? [bcc] : []);
    if (recipients.length === 0 && bccRecipients.length === 0) return false;
    if (!isConfigured()) {
      console.warn(`[mailer] SMTP non configuré — email non envoyé: "${subject}"`);
      return false;
    }
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'contact@livefx-trading.com';
    const mailOptions = {
      from: `"LivefxTrading" <${fromEmail}>`,
      subject,
      html: wrap(title || subject, html)
    };
    if (recipients.length > 0) mailOptions.to = recipients.join(',');
    else mailOptions.to = fromEmail;
    if (bccRecipients.length > 0) mailOptions.bcc = bccRecipients;

    try {
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
      return true;
    } catch (smtpErr) {
      console.warn(`[mailer] SMTP a échoué (${smtpErr.message}), tentative sendmail local...`);
      if (process.platform === 'linux') {
        try {
          const fallbackTransporter = nodemailer.createTransport({
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail',
          });
          await fallbackTransporter.sendMail(mailOptions);
          return true;
        } catch (mtaErr) {
          console.error(`[mailer] Fallback sendmail a échoué:`, mtaErr.message);
        }
      }
      return false;
    }
  } catch (err) {
    console.error(`[mailer] Erreur envoi email "${subject}":`, err.message);
    return false;
  }
}

/** Send a branded email to all admins. */
async function notifyAdmins({ subject, title, html }) {
  try {
    const admins = await User.find({ role: 'admin', email: { $ne: null, $ne: '' } }).select('email');
    const emails = admins.map(a => a.email).filter(Boolean);
    return await sendMail({ to: emails, subject, title, html });
  } catch (err) {
    console.error('[mailer] Erreur notifyAdmins:', err.message);
    return false;
  }
}

/** Send a branded email to all users (clients, trainers, admins) via bcc. */
async function notifyUsers({ subject, title, html, roles = ['client', 'trainer', 'admin'] }) {
  try {
    const users = await User.find({ role: { $in: roles }, email: { $ne: null, $ne: '' } }).select('email');
    const emails = users.map(u => u.email).filter(Boolean);
    if (!emails.length) return false;
    return await sendMail({ bcc: emails, subject, title, html });
  } catch (err) {
    console.error('[mailer] Erreur notifyUsers:', err.message);
    return false;
  }
}

module.exports = { sendMail, notifyAdmins, notifyUsers, isConfigured };
