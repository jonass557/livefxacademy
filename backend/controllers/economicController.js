// Contrôleur du module « Annonces économiques ».
// Expose : calendrier, analyses IA (fondamentale / avant / après / banque
// centrale) avec cache MongoDB, chatbot, et notifications.

const calendar = require('../utils/economicCalendar');
const ai = require('../utils/economicCalendar/ai');
const EconomicAnalysis = require('../models/EconomicAnalysis');
const EconomicNotification = require('../models/EconomicNotification');

// Message renvoyé quand la clé Claude n'est pas configurée.
const AI_UNAVAILABLE = {
  message:
    "L'analyse IA n'est pas disponible : la clé ANTHROPIC_API_KEY n'est pas configurée sur le serveur.",
};

// GET /api/economics/calendar?range=thisweek&currency=&impact=&country=&from=&to=
exports.getCalendar = async (req, res) => {
  try {
    const { range = 'thisweek', currency, impact, country, from, to } = req.query;
    let events = await calendar.getCalendar(range);
    events = calendar.filterEvents(events, { currency, impact, country, from, to });
    res.json({ range, count: events.length, events });
  } catch (err) {
    console.error('getCalendar:', err.message);
    res.status(502).json({ message: 'Impossible de récupérer le calendrier économique pour le moment.' });
  }
};

// Métadonnées pour construire les filtres côté client.
exports.getMeta = async (req, res) => {
  try {
    const events = await calendar.getCalendar('all');
    const currencies = [...new Set(events.map((e) => e.currency).filter(Boolean))].sort();
    res.json({
      currencies,
      impacts: ['High', 'Medium', 'Low', 'Holiday'],
      ranges: ['lastweek', 'thisweek', 'nextweek', 'all'],
      central_banks: ['Fed', 'BCE', 'BoE', 'BoJ', 'BoC', 'BNS', 'RBA', 'RBNZ', 'PBoC'],
      ai_enabled: ai.isConfigured(),
    });
  } catch (err) {
    console.error('getMeta:', err.message);
    res.status(502).json({ message: 'Métadonnées indisponibles.' });
  }
};

// Récupère (ou calcule et met en cache) une analyse IA pour un événement.
async function getOrCreateAnalysis({ event, type, actual = null, compute }) {
  const query = { event_id: event.id, type, actual };
  const existing = await EconomicAnalysis.findOne(query);
  if (existing) return existing.result;

  const result = await compute();
  // upsert défensif (deux requêtes simultanées) : on ignore l'erreur de doublon.
  try {
    await EconomicAnalysis.create({
      event_id: event.id,
      event_title: event.title,
      currency: event.currency,
      type,
      actual,
      result,
      model: ai.MODEL,
    });
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
  return result;
}

// POST /api/economics/analyze  body: { event_id, type, actual? }
// type ∈ 'fundamental' | 'pre' | 'post'
exports.analyzeEvent = async (req, res) => {
  try {
    if (!ai.isConfigured()) return res.status(503).json(AI_UNAVAILABLE);
    const { event_id, type = 'fundamental', actual = null } = req.body;
    if (!event_id) return res.status(400).json({ message: 'event_id requis' });

    const event = await calendar.findEventById(event_id);
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });

    let result;
    if (type === 'post') {
      const value = actual || event.actual;
      if (!value) {
        return res.status(400).json({ message: 'La valeur publiée (actual) est requise pour une analyse après publication.' });
      }
      result = await getOrCreateAnalysis({
        event, type, actual: value, compute: () => ai.analyzePostRelease(event, value),
      });
    } else if (type === 'pre') {
      result = await getOrCreateAnalysis({ event, type, compute: () => ai.analyzePreRelease(event) });
    } else {
      result = await getOrCreateAnalysis({ event, type: 'fundamental', compute: () => ai.analyzeFundamental(event) });
    }

    res.json({ event, type, analysis: result });
  } catch (err) {
    console.error('analyzeEvent:', err.message);
    res.status(500).json({ message: "Erreur lors de l'analyse IA." });
  }
};

// POST /api/economics/central-bank  body: { bank, context? }
exports.analyzeCentralBank = async (req, res) => {
  try {
    if (!ai.isConfigured()) return res.status(503).json(AI_UNAVAILABLE);
    const { bank, context = '' } = req.body;
    if (!bank) return res.status(400).json({ message: 'bank requis' });

    // Cache par banque (event_id synthétique). On rafraîchit chaque jour.
    const day = new Date().toISOString().slice(0, 10);
    const pseudoEvent = { id: `cb-${bank}-${day}`, title: `Banque centrale ${bank}`, currency: bank };
    const result = await getOrCreateAnalysis({
      event: pseudoEvent,
      type: 'central_bank',
      compute: () => ai.analyzeCentralBank(bank, context),
    });
    res.json({ bank, analysis: result });
  } catch (err) {
    console.error('analyzeCentralBank:', err.message);
    res.status(500).json({ message: "Erreur lors de l'analyse banque centrale." });
  }
};

// POST /api/economics/chat  body: { question, withContext? }
exports.chat = async (req, res) => {
  try {
    if (!ai.isConfigured()) return res.status(503).json(AI_UNAVAILABLE);
    const { question, withContext = true } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ message: 'question requise' });

    let ctx = '';
    if (withContext) {
      try {
        const events = await calendar.getCalendar('thisweek');
        ctx = events
          .filter((e) => e.impact === 'High' || e.impact === 'Medium')
          .slice(0, 40)
          .map((e) => `- ${new Date(e.date).toLocaleString('fr-FR')} | ${e.currency} | ${e.title} (${e.impact}) prev:${e.previous || '?'} prev:${e.forecast || '?'}`)
          .join('\n');
      } catch (_) { /* contexte facultatif */ }
    }

    const answer = await ai.chat(question, ctx);
    res.json({ answer });
  } catch (err) {
    console.error('chat:', err.message);
    res.status(500).json({ message: 'Erreur du chatbot.' });
  }
};

// GET /api/economics/notifications  — liste les notifications récentes.
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h glissantes
    const notifs = await EconomicNotification.find({ created_at: { $gte: since } })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    const withRead = notifs.map((n) => ({
      ...n,
      read: userId ? (n.read_by || []).some((id) => String(id) === String(userId)) : false,
    }));
    const unread = withRead.filter((n) => !n.read).length;
    res.json({ count: withRead.length, unread, notifications: withRead });
  } catch (err) {
    console.error('getNotifications:', err.message);
    res.status(500).json({ message: 'Erreur notifications.' });
  }
};

// POST /api/economics/notifications/read  body: { ids?: [] }  (vide = tout)
exports.markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });
    const { ids } = req.body || {};
    const filter = Array.isArray(ids) && ids.length ? { _id: { $in: ids } } : {};
    await EconomicNotification.updateMany(filter, { $addToSet: { read_by: userId } });
    res.json({ success: true });
  } catch (err) {
    console.error('markNotificationsRead:', err.message);
    res.status(500).json({ message: 'Erreur mise à jour notifications.' });
  }
};
