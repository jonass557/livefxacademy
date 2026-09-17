// Registre des fournisseurs de calendrier économique.
// Stratégie : ForexFactory en base (gratuit, couverture large), complété par
// TradingEconomics quand la clé est configurée (actual, revised, source).
// L'enrichissement local (pays, type, source) s'applique toujours.

const forexFactory = require('./forexFactory');
const tradingEconomics = require('./tradingEconomics');
const { enrichEvent } = require('../enrichment');

// Identifiant stable (titre + devise + timestamp) — utilisé pour le cache
// d'analyses IA et l'index unique des notifications.
function buildEventId(title, currency, date) {
  const slug = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return `${currency}-${slug}-${date.getTime()}`;
}

// Fusionne les événements de plusieurs sources : on prend FF comme base, puis
// on complète les champs manquants (actual, revised, source_name) avec TE.
function mergeEvents(ffEvents, teEvents) {
  const teMap = new Map();
  for (const te of teEvents) {
    // Clé de rapprochement : titre normalisé + devise + date (à ±30 min).
    const key = `${te.title.toLowerCase().trim()}_${te.currency}_${Math.floor(te.timestamp / (30 * 60 * 1000))}`;
    teMap.set(key, te);
  }

  return ffEvents.map((ff) => {
    const key = `${ff.title.toLowerCase().trim()}_${ff.currency}_${Math.floor(ff.timestamp / (30 * 60 * 1000))}`;
    const te = teMap.get(key);
    if (!te) return ff;

    // Compléter les champs manquants de FF avec TE.
    return {
      ...ff,
      actual: ff.actual || te.actual,
      revised: te.revised,
      country_name: ff.country_name || te.country_name,
      source_name: ff.source_name || te.source_name,
      unit: te.unit,
      // Garder le provider FF en base (pour la cohérence du cache), mais noter
      // que l'événement a été enrichi par TE.
      enriched_by: te.provider,
    };
  });
}

async function getEvents(range = 'thisweek') {
  // Récupération des événements de base (ForexFactory).
  let events = await forexFactory.getEvents(range);

  // Enrichissement Trading Economics si la clé est configurée.
  if (tradingEconomics.isConfigured()) {
    try {
      const teEvents = await tradingEconomics.getEvents();
      events = mergeEvents(events, teEvents);
    } catch (err) {
      console.error('[calendar providers] TradingEconomics', err.message);
      // Dégradation propre : on continue avec FF seul.
    }
  }

  // Enrichissement local (pays, type, source) — toujours actif.
  events = events.map(enrichEvent);

  // Générer l'identifiant stable pour le cache/notifications.
  events = events.map((ev) => ({
    ...ev,
    id: buildEventId(ev.title, ev.currency, new Date(ev.date)),
  }));

  // Dédoublonnage par id (peut arriver avec la fusion FF+TE).
  const seen = new Set();
  return events.filter((ev) => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  }).sort((a, b) => a.timestamp - b.timestamp);
}

module.exports = { getEvents, buildEventId };
