// Fournisseur Forex Factory — flux JSON publics gratuits.
// Source de base pour le calendrier : couverture large, sans clé API.
// Champs fournis : title, country (devise), date, impact, forecast, previous.
// Champs absents : actual (sauf événements passés), revised, pays réel, source.

const FEEDS = {
  lastweek: 'https://nfs.faireconomy.media/ff_calendar_lastweek.json',
  thisweek: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  nextweek: 'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
};

const CACHE_TTL = 15 * 60 * 1000; // 15 min
const cache = {}; // { [feed]: { data, fetchedAt } }

const IMPACT_MAP = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Holiday: 'Holiday',
};

async function fetchFeed(feed) {
  const url = FEEDS[feed];
  if (!url) throw new Error(`Flux inconnu : ${feed}`);

  const cached = cache[feed];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'LivefxTrading/1.0 (economic-calendar)' },
  });
  if (!res.ok) {
    // En cas d'échec réseau, on renvoie le cache périmé s'il existe.
    if (cached) return cached.data;
    throw new Error(`Échec de récupération du calendrier (${res.status})`);
  }
  const raw = await res.json();
  const data = Array.isArray(raw) ? raw : [];
  cache[feed] = { data, fetchedAt: Date.now() };
  return data;
}

// Normalise une entrée brute Forex Factory vers notre forme interne.
function normalizeEvent(ev) {
  if (!ev || !ev.title || !ev.date) return null;
  const date = new Date(ev.date);
  if (isNaN(date.getTime())) return null;

  const currency = (ev.country || '').toUpperCase();
  return {
    title: ev.title,
    currency,
    date: date.toISOString(),
    timestamp: date.getTime(),
    impact: IMPACT_MAP[ev.impact] || ev.impact || 'Low',
    forecast: ev.forecast || '',
    previous: ev.previous || '',
    actual: ev.actual || null, // présent seulement pour les événements passés
    // Les champs enrichis (country_name, flag, event_type, source_*, revised)
    // seront complétés par la couche enrichment.
    provider: 'forexfactory',
  };
}

async function getEvents(range = 'thisweek') {
  let events;
  if (range === 'all') {
    const [last, cur, next] = await Promise.all([
      fetchFeed('lastweek').catch(() => []),
      fetchFeed('thisweek').catch(() => []),
      fetchFeed('nextweek').catch(() => []),
    ]);
    events = [...last, ...cur, ...next];
  } else {
    events = await fetchFeed(range);
  }
  return events.map(normalizeEvent).filter(Boolean);
}

module.exports = { getEvents, isConfigured: () => true };
