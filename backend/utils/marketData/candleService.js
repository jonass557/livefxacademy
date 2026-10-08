// utils/marketData/candleService.js
// Récupération d'historique OHLC pour le Trading Demo, indépendante du fournisseur.
// Gère W1/MN pour Deriv (qui plafonne à D1) par agrégation des bougies journalières.
const { getProvider, TIMEFRAMES } = require('./index');

// Granularités (secondes) gérées par le Trading Demo, W1/MN inclus (au-delà de Deriv).
const GRAN = { M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H2: 7200, H4: 14400, H6: 21600, H8: 28800, D1: 86400, W1: 604800, MN: 2592000 };

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

const FOREX_METALS_DERIV_MAP = {
  EURUSD: 'frxEURUSD',
  GBPUSD: 'frxGBPUSD',
  USDJPY: 'frxUSDJPY',
  USDCHF: 'frxUSDCHF',
  USDCAD: 'frxUSDCAD',
  AUDUSD: 'frxAUDUSD',
  NZDUSD: 'frxNZDUSD',
  EURGBP: 'frxEURGBP',
  EURJPY: 'frxEURJPY',
  GBPJPY: 'frxGBPJPY',
  EURCHF: 'frxEURCHF',
  EURAUD: 'frxEURAUD',
  EURNZD: 'frxEURNZD',
  GBPAUD: 'frxGBPAUD',
  GBPCAD: 'frxGBPCAD',
  GBPNZD: 'frxGBPNZD',
  AUDJPY: 'frxAUDJPY',
  CADJPY: 'frxCADJPY',
  CHFJPY: 'frxCHFJPY',
  AUDCAD: 'frxAUDCAD',
  AUDNZD: 'frxAUDNZD',
  NZDCAD: 'frxNZDCAD',
  NZDJPY: 'frxNZDJPY',
  XAUUSD: 'frxXAUUSD',
  XAGUSD: 'frxXAGUSD',
  XPTUSD: 'frxXPTUSD',
  XPDUSD: 'frxXPDUSD',
};

// count bougies récentes d'un instrument (pour le graphique du terminal).
// `instrument` = document Instrument. Renvoie [{ time, open, high, low, close, volume? }].
async function getCandles(instrument, timeframeKey, count = 300) {
  if (!instrument) return [];
  const derivSym = FOREX_METALS_DERIV_MAP[instrument.symbol];
  const providerName = derivSym ? 'deriv' : instrument.provider;
  const providerSymbol = derivSym || instrument.provider_symbol;
  if (!providerSymbol) return [];

  const provider = getProvider(providerName);
  const now = Math.floor(Date.now() / 1000);
  const n = Math.min(Math.max(Number(count) || 300, 1), 1000);

  // Deriv ne fournit pas W1/MN → on télécharge du D1 puis on agrège.
  if (providerName === 'deriv' && (timeframeKey === 'W1' || timeframeKey === 'MN')) {
    const daysNeeded = timeframeKey === 'W1' ? n * 7 : n * 31;
    const dailyStart = now - (daysNeeded * 86400 * 2);
    const daily = await provider.fetchCandles({ symbol: providerSymbol, granularity: 86400, start: dailyStart, end: now, count: daysNeeded });
    const agg = aggregate(daily, timeframeKey === 'W1' ? weekKey : monthKey);
    return agg.slice(-n);
  }

  const granularity = GRAN[timeframeKey];
  if (!granularity) throw new Error('Unité de temps invalide');
  const start = now - (n * granularity * 2);
  const candles = await provider.fetchCandles({ symbol: providerSymbol, granularity, start, end: now, count: n });
  return candles.slice(-n);
}

module.exports = { getCandles, TIMEFRAMES };
