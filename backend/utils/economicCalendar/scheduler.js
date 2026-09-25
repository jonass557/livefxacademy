// Scheduler des notifications d'annonces économiques.
// Toutes les ~60 s, parcourt le calendrier de la semaine et crée des documents
// EconomicNotification pour les événements Medium/High approchant des paliers
// T-60/30/15/5 min et à la publication (T-0). L'index unique (event_id,
// lead_minutes) garantit qu'un palier n'est notifié qu'une fois.

const calendar = require('./index');
const EconomicNotification = require('../../models/EconomicNotification');
const { notifyUsers } = require('../mailer');

const LEAD_STEPS = [60, 30, 15, 5, 0]; // minutes avant l'événement
const TICK_MS = 60 * 1000;
// Fenêtre de tolérance : on notifie si l'on est à ±90 s du palier visé.
const WINDOW_MS = 90 * 1000;

const RISK_BY_IMPACT = { High: 'eleve', Medium: 'moyen', Low: 'faible' };

function buildMessage(ev, lead) {
  if (lead === 0) {
    return `📊 ${ev.currency} — ${ev.title} : publication en cours. Volatilité possible.`;
  }
  return `⏰ Dans ${lead} min : ${ev.currency} — ${ev.title} (${ev.impact}). Prudence, volatilité attendue.`;
}

// Envoie un email d'alerte instantanée à tous les utilisateurs enregistrés
async function sendEconomicAlertEmail(ev) {
  try {
    const impactColor = ev.impact === 'High' ? '#ef4444' : ev.impact === 'Medium' ? '#f59e0b' : '#10b981';
    const impactLabel = ev.impact === 'High' ? 'Élevé' : ev.impact === 'Medium' ? 'Moyen' : 'Faible';
    const eventDate = new Date(ev.timestamp);
    const timeStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const subject = `🚨 [LivefxTrading] Publication économique : ${ev.currency} — ${ev.title}`;
    const title = `Publication Économique en Direct`;

    const html = `
      <div style="margin-bottom: 20px;">
        <p style="font-size: 15px; margin: 0 0 10px 0;">
          Une annonce macroéconomique majeure vient d'être publiée :
        </p>
        <div style="background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 18px; margin: 15px 0;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 20px; font-weight: bold; color: #111827; margin-right: 10px;">${ev.currency}</span>
            <span style="background: ${impactColor}15; color: ${impactColor}; border: 1px solid ${impactColor}40; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              Impact ${impactLabel}
            </span>
          </div>
          <h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0;">
            ${ev.title}
          </h3>
          <p style="font-size: 13px; color: #6b7280; margin: 0 0 14px 0;">
            📅 ${dateStr} à ${timeStr} (heure locale)
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 6px 0; color: #6b7280;">Valeur précédente :</td>
                <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #111827;">${ev.previous || '—'}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 6px 0; color: #6b7280;">Prévision des analystes :</td>
                <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #111827;">${ev.forecast || '—'}</td>
              </tr>
              ${ev.actual ? `
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 6px 0; color: #6b7280;">Chiffre publié :</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #2563eb;">${ev.actual}</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; font-size: 13px; color: #92400e; margin: 15px 0;">
          ⚠️ <strong>Conseil de gestion du risque :</strong> La sortie de cette annonce peut entraîner une forte volatilité et un élargissement des spreads sur les paires associées (${ev.currency}). Veillez à respecter votre plan de trading et votre gestion de risque.
        </div>

        <div style="text-align: center; margin-top: 25px;">
          <a href="https://livefx-trading.com/dashboard/client" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
            Consulter les marchés sur LivefxTrading
          </a>
        </div>
      </div>
    `;

    await notifyUsers({ subject, title, html });
    console.log(`[economic scheduler] Email envoyé aux utilisateurs pour "${ev.currency} - ${ev.title}"`);
  } catch (err) {
    console.error('[economic scheduler] Erreur envoi email annonce:', err.message);
  }
}

async function tick() {
  try {
    const events = await calendar.getCalendar('thisweek');
    const now = Date.now();

    for (const ev of events) {
      if (ev.impact !== 'High' && ev.impact !== 'Medium') continue;
      const msUntil = ev.timestamp - now;

      for (const lead of LEAD_STEPS) {
        const target = lead * 60 * 1000; // ms avant l'événement pour ce palier
        // On déclenche quand le temps restant entre dans la fenêtre du palier.
        if (Math.abs(msUntil - target) <= WINDOW_MS) {
          await createIfAbsent(ev, lead);
        }
      }
    }
  } catch (err) {
    console.error('[economic scheduler]', err.message);
  }
}

async function createIfAbsent(ev, lead) {
  try {
    await EconomicNotification.create({
      event_id: ev.id,
      event_title: ev.title,
      currency: ev.currency,
      impact: ev.impact,
      event_date: new Date(ev.timestamp),
      lead_minutes: lead,
      message: buildMessage(ev, lead),
      risk: RISK_BY_IMPACT[ev.impact] || 'moyen',
    });

    // Envoi d'un email instantané à l'instant que l'annonce sort (T-0)
    if (lead === 0) {
      sendEconomicAlertEmail(ev).catch((err) =>
        console.error('[economic scheduler] email error:', err.message)
      );
    }
  } catch (e) {
    // 11000 = doublon (palier déjà notifié) → normal, on ignore.
    if (e.code !== 11000) console.error('[economic scheduler] create:', e.message);
  }
}

let timer = null;
function start() {
  if (timer) return;
  // Premier tick après 10 s (laisse la connexion Mongo s'établir), puis chaque minute.
  setTimeout(() => {
    tick();
    timer = setInterval(tick, TICK_MS);
  }, 10 * 1000);
  console.log('[economic scheduler] démarré');
}

module.exports = { start, tick };
