// utils/marketData/candleService.js
// Récupération d'historique OHLC pour le Trading Demo, indépendante du fournisseur.
// Gère W1/MN pour Deriv (qui plafonne à D1) par agrégation des bougies journalières.
const { getProvider, TIMEFRAMES } = require('./index');

// Granularités (secondes) gérées par le Trading Demo, W1/MN inclus (au-delà de Deriv).
const GRAN = { M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400, W1: 604800, MN: 2592000 };

// Agrège des bougies D1 en périodes hebdo/mensuelles (buckets par clé calendaire UTC).
function aggregate(daily, bucketKeyFn) {
  const buckets = new Map();
  for (const c of daily) {
    const key = bucketKeyFn(new Date(c.time * 1000));
    const b = buckets.get(key);
    if (!b) {
      buckets.set(key, { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0 });
    } else {
      b.high = Math.max(b.high, c.high);
      b.low = Math.min(b.low, c.low);
      b.close = c.close;
      b.volume += c.volume || 0;
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

// Clé de semaine ISO (année + numéro de semaine).
function weekKey(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7; // lundi=0
  t.setUTCDate(t.getUTCDate() - day);
  return `${t.getUTCFullYear()}-${t.getUTCMonth()}-${t.getUTCDate()}`;
}
function monthKey(d) { return `${d.getUTCFullYear()}-${d.getUTCMonth()}`; }

// count bougies récentes d'un instrument (pour le graphique du terminal).
// `instrument` = document Instrument. Renvoie [{ time, open, high, low, close, volume? }].
async function getCandles(instrument, timeframeKey, count = 300) {
  if (!instrument || !instrument.provider_symbol) return [];
  const provider = getProvider(instrument.provider);
  const now = Math.floor(Date.now() / 1000);
  const n = Math.min(Math.max(Number(count) || 300, 1), 1000);

  // Deriv ne fournit pas W1/MN → on télécharge du D1 puis on agrège.
  if (instrument.provider === 'deriv' && (timeframeKey === 'W1' || timeframeKey === 'MN')) {
    const daysNeeded = timeframeKey === 'W1' ? n * 7 : n * 31;
    const start = now - daysNeeded * 86400;
    const daily = await provider.fetchCandles({ symbol: instrument.provider_symbol, granularity: 86400, start, end: now });
    const agg = aggregate(daily, timeframeKey === 'W1' ? weekKey : monthKey);
    return agg.slice(-n);
  }

  const granularity = GRAN[timeframeKey];
  if (!granularity) throw new Error('Unité de temps invalide');
  const start = now - n * granularity;
  const candles = await provider.fetchCandles({ symbol: instrument.provider_symbol, granularity, start, end: now });
  return candles.slice(-n);
}

module.exports = { getCandles, TIMEFRAMES };
