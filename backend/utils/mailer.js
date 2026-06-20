const nodemailer = require('nodemailer');
const { User } = require('../models');

// Whether SMTP credentials are configured
const isConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// Wrap content in the LiveFx Academy branded email template
const wrap = (title, contentHtml) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; text-align: center;">LiveFx Academy</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
      ${title ? `<h2 style="color:#4f46e5; margin-top:0;">${title}</h2>` : ''}
      <div style="color: #374151; font-size: 14px; line-height: 1.6;">${contentHtml}</div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="color: #6b7280; font-size: 12px; text-align: center;">
        Email automatique envoyé par LiveFx Academy.
      </p>
    </div>
  </div>
`;

/**
 * Send a branded email. Best-effort: never throws, returns true/false.
 * @param {string|string[]} to - recipient(s)
 * @param {string} subject
 * @param {string} title - heading shown inside the email body
 * @param {string} html - inner HTML content
 */
async function sendMail({ to, subject, title, html }) {
  try {
    const recipients = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : []);
    if (recipients.length === 0) return false;
    if (!isConfigured()) {
      console.warn(`[mailer] SMTP non configuré — email non envoyé: "${subject}"`);
      return false;
    }
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"LiveFx Academy" <${process.env.SMTP_USER}>`,
      to: recipients.join(','),
      subject,
      html: wrap(title || subject, html)
    });
    return true;
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

module.exports = { sendMail, notifyAdmins, isConfigured };
