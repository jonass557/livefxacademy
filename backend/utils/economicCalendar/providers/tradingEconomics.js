// Fournisseur Trading Economics — calendrier enrichi (actual, revised, source).
// Actif uniquement si TE_API_KEY est définie. Gratuit : NON (API commerciale).
// Utilisation : compléter les champs manquants de Forex Factory (actual, revised).
//
// Doc API : https://docs.tradingeconomics.com/#events
// Format réponse : [ { Event, Country, Date, Actual, Previous, TEForecast, ... } ]

const isConfigured = () => !!process.env.TE_API_KEY;

const BASE_URL = 'https://api.tradingeconomics.com';
const CACHE_TTL = 10 * 60 * 1000; // 10 min
let cache = null;

async function fetchCalendar() {
  if (!isConfigured()) return [];
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  try {
    const params = new URLSearchParams({
      c: process.env.TE_API_KEY,
      // On récupère 14 jours de chaque côté (semaine dernière + courante + prochaine).
      d1: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      d2: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    });
    const res = await fetch(`${BASE_URL}/calendar?${params}`, {
      headers: { 'User-Agent': 'LivefxTrading/1.0' },
    });
    if (!res.ok) {
      console.error('[tradingEconomics] HTTP', res.status, await res.text().catch(() => ''));
      return cache?.data || [];
    }
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw : [];
    cache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    console.error('[tradingEconomics]', err.message);
    return cache?.data || [];
  }
}

// Normalise un événement Trading Economics vers notre forme interne.
function normalizeEvent(ev) {
  if (!ev || !ev.Event || !ev.Date) return null;
  const date = new Date(ev.Date);
  if (isNaN(date.getTime())) return null;

  return {
    title: ev.Event,
    currency: (ev.Currency || ev.Country || '').toUpperCase(),
    country_name: ev.Country || '',
    date: date.toISOString(),
    timestamp: date.getTime(),
    impact: mapImpact(ev.Importance),
    forecast: ev.TEForecast != null ? String(ev.TEForecast) : '',
    previous: ev.Previous != null ? String(ev.Previous) : '',
    actual: ev.Actual != null ? String(ev.Actual) : null,
    revised: ev.Revised != null ? String(ev.Revised) : null,
    unit: ev.Unit || '',
    source_name: ev.Source || '',
    provider: 'tradingeconomics',
  };
}

function mapImpact(importance) {
  // Trading Economics utilise 1/2/3 (1 = faible, 3 = fort).
  if (importance === 3 || importance === '3') return 'High';
  if (importance === 2 || importance === '2') return 'Medium';
  return 'Low';
}

async function getEvents() {
  const raw = await fetchCalendar();
  return raw.map(normalizeEvent).filter(Boolean);
}

module.exports = { getEvents, isConfigured };
