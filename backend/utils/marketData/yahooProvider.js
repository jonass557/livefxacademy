// utils/marketData/yahooProvider.js
// Fournisseur FOREX / MÉTAUX / INDICES via l'API publique Yahoo Finance (sans clé).
// - Historique (bougies) : GET https://query1.finance.yahoo.com/v8/finance/chart/<symbol>
//   avec period1/period2 (epoch s) + interval. Données de MARCHÉ réelles (pas inventées).
// - Temps réel (dernier prix) : géré par liveFeed.js (polling du même endpoint chart).
// Remarques :
//   * Yahoo n'a pas d'intervalle 4h natif → on récupère du 60m et on agrège ×4.
//   * W1/MN sont natifs chez Yahoo (1wk / 1mo), contrairement à Deriv.
//   * Symboles : forex « EURUSD=X », métaux futures « GC=F/SI=F/PL=F/PA=F », indices « ^GSPC »…
const { TIMEFRAMES, MAX_CANDLES } = require('./provider')

const BASE = 'https://query1.finance.yahoo.com'
const UA = 'Mozilla/5.0'

// Symboles exposés (surtout pour le module Backtesting ; le Trading Demo lit la base).
const SYMBOLS = [
  { symbol: 'EURUSD=X', name: 'EUR/USD', pip: 0.0001, category: 'forex' },
  { symbol: 'GBPUSD=X', name: 'GBP/USD', pip: 0.0001, category: 'forex' },
  { symbol: 'USDJPY=X', name: 'USD/JPY', pip: 0.01, category: 'forex' },
  { symbol: 'AUDUSD=X', name: 'AUD/USD', pip: 0.0001, category: 'forex' },
  { symbol: 'USDCAD=X', name: 'USD/CAD', pip: 0.0001, category: 'forex' },
  { symbol: 'GC=F', name: 'Or (XAU/USD)', pip: 0.1, category: 'metals' },
  { symbol: 'SI=F', name: 'Argent (XAG/USD)', pip: 0.01, category: 'metals' },
  { symbol: '^GSPC', name: 'S&P 500', pip: 1, category: 'indices' },
  { symbol: '^DJI', name: 'Dow Jones 30', pip: 1, category: 'indices' },
  { symbol: '^NDX', name: 'Nasdaq 100', pip: 1, category: 'indices' },
]

// granularité (secondes) -> intervalle Yahoo. 14400 (H4) : pas d'intervalle natif,
// on demande du 60m puis on agrège en bougies 4h.
const INTERVAL_BY_GRANULARITY = {
  60: '1m', 300: '5m', 900: '15m', 1800: '30m',
  3600: '60m', 14400: '60m', 86400: '1d', 604800: '1wk', 2592000: '1mo',
}

function listSymbols() { return SYMBOLS }
function listTimeframes() { return TIMEFRAMES }
function getSymbolMeta(symbol) { return SYMBOLS.find((s) => s.symbol === symbol) || null }

// Agrège des bougies 60m en bougies 4h (buckets alignés sur 14400 s UTC).
function aggregate4h(hourly) {
  const buckets = new Map()
  for (const c of hourly) {
    const key = Math.floor(c.time / 14400) * 14400
    const b = buckets.get(key)
    if (!b) buckets.set(key, { time: key, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume || 0 })
    else {
      b.high = Math.max(b.high, c.high)
      b.low = Math.min(b.low, c.low)
      b.close = c.close
      b.volume += c.volume || 0
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time)
}

// Récupère les bougies OHLC de `start` à `end` (epoch secondes).
async function fetchCandles({ symbol, granularity, start, end }) {
  const interval = INTERVAL_BY_GRANULARITY[granularity]
  if (!interval) throw new Error('Granularité non supportée par Yahoo : ' + granularity)
  const p1 = Math.floor(start)
  const p2 = Math.floor(end)
  if (!(p1 < p2)) throw new Error('Période invalide (début ≥ fin)')

  const url = `${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=${interval}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Yahoo: échec chart (${res.status})`)
  const j = await res.json()
  const r = j && j.chart && j.chart.result && j.chart.result[0]
  if (!r || !Array.isArray(r.timestamp)) return []
  const q = r.indicators && r.indicators.quote && r.indicators.quote[0]
  if (!q) return []

  const out = []
  for (let i = 0; i < r.timestamp.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i]
    if (o == null || h == null || l == null || c == null) continue // bougie incomplète (gap)
    out.push({ time: r.timestamp[i], open: o, high: h, low: l, close: c, volume: q.volume ? (q.volume[i] || 0) : 0 })
  }
  out.sort((a, b) => a.time - b.time)

  const candles = granularity === 14400 ? aggregate4h(out) : out
  return candles.length > MAX_CANDLES ? candles.slice(candles.length - MAX_CANDLES) : candles
}

module.exports = {
  name: 'yahoo',
  label: 'Yahoo Finance (Forex / Métaux / Indices)',
  available: true,
  listSymbols,
  listTimeframes,
  getSymbolMeta,
  fetchCandles,
}
