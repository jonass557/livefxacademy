// Récupération et normalisation du calendrier économique.
//
// Source : flux JSON publics de Forex Factory (gratuits, sans clé API) :
//   https://nfs.faireconomy.media/ff_calendar_{lastweek,thisweek,nextweek}.json
// Chaque entrée : { title, country, date, impact, forecast, previous, url }.
// NB : le flux ne fournit PAS la valeur `actual` (publiée). On l'expose donc à
// `null` ; les analyses « après publication » acceptent une valeur saisie par
// l'utilisateur/admin.
//
// Un cache mémoire (~15 min) évite de marteler la source à chaque requête.

const FEEDS = {
  lastweek: 'https://nfs.faireconomy.media/ff_calendar_lastweek.json',
  thisweek: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  nextweek: 'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
};

// Durée de vie du cache (ms).
const CACHE_TTL = 15 * 60 * 1000;

// Mappe le pays Forex Factory (code ISO monnaie) vers la devise concernée.
// Forex Factory utilise déjà le code devise dans `country` (USD, EUR, GBP…),
// on le conserve tel quel comme devise.
const IMPACT_MAP = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Holiday: 'Holiday',
};

// cache : { [feed]: { data, fetchedAt } }
const cache = {};

// Récupère un flux avec cache. `fetch` natif (Node >= 18).
async function fetchFeed(feed) {
  const url = FEEDS[feed];
  if (!url) throw new Error(`Flux inconnu : ${feed}`);

  const cached = cache[feed];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'LiveFxAcademy/1.0 (economic-calendar)' },
  });
  if (!res.ok) {
    // En cas d'échec réseau, on renvoie le cache périmé s'il existe.
    if (cached) return cached.data;
    throw new Error(`Échec de récupération du calendrier (${res.status})`);
  }
  const raw = await res.json();
  const data = Array.isArray(raw) ? raw.map(normalizeEvent).filter(Boolean) : [];
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
    // Identifiant stable pour le cache d'analyses et le front.
    id: buildEventId(ev.title, currency, date),
    title: ev.title,
    country: currency,
    currency,
    date: date.toISOString(),
    timestamp: date.getTime(),
    impact: IMPACT_MAP[ev.impact] || ev.impact || 'Low',
    forecast: ev.forecast || '',
    previous: ev.previous || '',
    actual: ev.actual || null, // absent du flux FF, saisi manuellement au besoin
    url: ev.url || '',
  };
}

// Identifiant déterministe (titre + devise + horodatage) — sert de clé de cache
// pour les analyses IA afin de ne les calculer qu'une fois par événement.
function buildEventId(title, currency, date) {
  const slug = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return `${currency}-${slug}-${date.getTime()}`;
}

// Récupère les événements sur une période donnée : 'thisweek' (défaut),
// 'lastweek', 'nextweek', ou 'all' (les trois concaténés et triés).
async function getCalendar(range = 'thisweek') {
  let events;
  if (range === 'all') {
    const [last, cur, next] = await Promise.all([
      fetchFeed('lastweek').catch(() => []),
      fetchFeed('thisweek').catch(() => []),
      fetchFeed('nextweek').catch(() => []),
    ]);
    // Dédoublonnage par id (recouvrement possible entre semaines).
    const seen = new Set();
    events = [...last, ...cur, ...next].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  } else {
    events = await fetchFeed(range);
  }
  return events.slice().sort((a, b) => a.timestamp - b.timestamp);
}

// Retrouve un événement précis par son id sur l'ensemble des flux.
async function findEventById(id) {
  const all = await getCalendar('all');
  return all.find((e) => e.id === id) || null;
}

// Filtre utilitaire côté serveur (le front peut aussi filtrer).
function filterEvents(events, { currency, impact, country, from, to } = {}) {
  return events.filter((e) => {
    if (currency && e.currency !== currency.toUpperCase()) return false;
    if (country && e.country !== country.toUpperCase()) return false;
    if (impact && e.impact !== impact) return false;
    if (from && e.timestamp < new Date(from).getTime()) return false;
    if (to && e.timestamp > new Date(to).getTime()) return false;
    return true;
  });
}

module.exports = {
  getCalendar,
  findEventById,
  filterEvents,
  buildEventId,
  CACHE_TTL,
};
