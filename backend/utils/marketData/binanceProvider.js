// utils/marketData/binanceProvider.js
// Fournisseur CRYPTO via l'API publique Binance (aucune clé requise).
// - Historique : GET https://api.binance.com/api/v3/klines (fetch natif Node ≥ 18)
// - Temps réel (bid/ask) : géré par liveFeed.js via wss .../@bookTicker
const { TIMEFRAMES, MAX_CANDLES } = require('./provider')

const REST_BASE = 'https://api.binance.com'
const PER_REQUEST = 1000 // max klines par requête Binance

// Symboles exposés (display -> symbole Binance). pip indicatif pour le backtest.
const SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin (BTC/USD)', pip: 0.01, category: 'crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum (ETH/USD)', pip: 0.01, category: 'crypto' },
  { symbol: 'BNBUSDT', name: 'BNB (BNB/USD)', pip: 0.01, category: 'crypto' },
  { symbol: 'XRPUSDT', name: 'XRP (XRP/USD)', pip: 0.0001, category: 'crypto' },
  { symbol: 'SOLUSDT', name: 'Solana (SOL/USD)', pip: 0.01, category: 'crypto' },
  { symbol: 'ADAUSDT', name: 'Cardano (ADA/USD)', pip: 0.0001, category: 'crypto' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin (DOGE/USD)', pip: 0.00001, category: 'crypto' },
  { symbol: 'LTCUSDT', name: 'Litecoin (LTC/USD)', pip: 0.01, category: 'crypto' },
]

// granularité (secondes) -> intervalle Binance
const INTERVAL_BY_GRANULARITY = {
  60: '1m', 300: '5m', 900: '15m', 1800: '30m',
  3600: '1h', 14400: '4h', 86400: '1d', 604800: '1w', 2592000: '1M',
}

function listSymbols() { return SYMBOLS }
function listTimeframes() { return TIMEFRAMES }
function getSymbolMeta(symbol) { return SYMBOLS.find((s) => s.symbol === symbol) || null }

// Récupère les bougies OHLC de `start` à `end` (epoch secondes), paginées en avant.
async function fetchCandles({ symbol, granularity, start, end }) {
  const interval = INTERVAL_BY_GRANULARITY[granularity]
  if (!interval) throw new Error('Granularité non supportée par Binance : ' + granularity)
  const startMs = Math.floor(start) * 1000
  const endMs = Math.floor(end) * 1000
  if (!(startMs < endMs)) throw new Error('Période invalide (début ≥ fin)')

  const byTime = new Map()
  let cursor = startMs

  for (let guard = 0; guard < Math.ceil(MAX_CANDLES / PER_REQUEST) + 2; guard++) {
    const url = `${REST_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}` +
      `&startTime=${cursor}&endTime=${endMs}&limit=${PER_REQUEST}`
    const res = await fetch(url, { headers: { 'User-Agent': 'LivefxTrading/1.0' } })
    if (!res.ok) {
      if (byTime.size) break // on garde ce qu'on a
      throw new Error(`Binance: échec klines (${res.status})`)
    }
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) break

    for (const r of rows) {
      const t = Math.floor(Number(r[0]) / 1000) // openTime ms -> s
      if (!byTime.has(t)) {
        byTime.set(t, {
          time: t,
          open: Number(r[1]), high: Number(r[2]),
          low: Number(r[3]), close: Number(r[4]), volume: Number(r[5]),
        })
      }
    }
    const lastOpen = Number(rows[rows.length - 1][0])
    if (rows.length < PER_REQUEST || byTime.size >= MAX_CANDLES) break
    cursor = lastOpen + 1
  }

  const out = Array.from(byTime.values()).sort((a, b) => a.time - b.time)
  return out.length > MAX_CANDLES ? out.slice(out.length - MAX_CANDLES) : out
}

module.exports = {
  name: 'binance',
  label: 'Binance (Crypto)',
  available: true,
  listSymbols,
  listTimeframes,
  getSymbolMeta,
  fetchCandles,
}
