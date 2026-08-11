// Scheduler des notifications d'annonces économiques.
// Toutes les ~60 s, parcourt le calendrier de la semaine et crée des documents
// EconomicNotification pour les événements Medium/High approchant des paliers
// T-60/30/15/5 min et à la publication (T-0). L'index unique (event_id,
// lead_minutes) garantit qu'un palier n'est notifié qu'une fois.

const calendar = require('./index');
const EconomicNotification = require('../../models/EconomicNotification');

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
