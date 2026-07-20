// utils/indicators/index.js — Registre des indicateurs (indépendant du moteur).
// Pour ajouter un indicateur : créer le fichier (fonction pure) puis l'enregistrer
// ci-dessous. `multi` liste les sous-séries pour les indicateurs à sorties multiples.
const sma = require('./sma')
const ema = require('./ema')
const rsi = require('./rsi')
const macd = require('./macd')
const bollinger = require('./bollinger')
const atr = require('./atr')
const stochastic = require('./stochastic')
const vwap = require('./vwap')
const volume = require('./volume')

const INDICATORS = {
  sma: { fn: sma, multi: null, label: 'SMA', defaults: { period: 20, source: 'close' } },
  ema: { fn: ema, multi: null, label: 'EMA', defaults: { period: 20, source: 'close' } },
  rsi: { fn: rsi, multi: null, label: 'RSI', defaults: { period: 14, source: 'close' } },
  macd: { fn: macd, multi: ['macd', 'signal', 'hist'], label: 'MACD', defaults: { fast: 12, slow: 26, signal: 9, source: 'close' } },
  bollinger: { fn: bollinger, multi: ['upper', 'mid', 'lower'], label: 'Bollinger Bands', defaults: { period: 20, mult: 2, source: 'close' } },
  atr: { fn: atr, multi: null, label: 'ATR', defaults: { period: 14 } },
  stochastic: { fn: stochastic, multi: ['k', 'd'], label: 'Stochastic', defaults: { kPeriod: 14, dPeriod: 3, smooth: 3 } },
  vwap: { fn: vwap, multi: null, label: 'VWAP', defaults: {} },
  volume: { fn: volume, multi: null, label: 'Volume', defaults: {} },
}

// Sérialisation stable d'un objet de paramètres (clés triées) → clé de cache.
function stableStringify(obj) {
  if (!obj) return ''
  return Object.keys(obj).sort().map((k) => `${k}=${obj[k]}`).join(',')
}

// Clé unique d'un indicateur (type + paramètres fusionnés avec les défauts).
// La MÊME clé est utilisée au calcul et à la lecture pour garantir la cohérence.
function indicatorKey(type, params) {
  const def = INDICATORS[type]
  const merged = { ...(def ? def.defaults : {}), ...(params || {}) }
  return `${type}:${stableStringify(merged)}`
}

// Calcule tous les indicateurs demandés (spécifications dédupliquées).
// specs = [{ type, params }] → renvoie { [key]: array | { field: array } }.
function computeIndicators(candles, specs) {
  const store = {}
  for (const spec of specs || []) {
    const def = INDICATORS[spec.type]
    if (!def) continue
    const params = { ...def.defaults, ...(spec.params || {}) }
    const key = indicatorKey(spec.type, params)
    if (store[key] !== undefined) continue
    store[key] = def.fn(candles, params)
  }
  return store
}

// Métadonnées pour le formulaire client.
function listIndicators() {
  return Object.entries(INDICATORS).map(([type, d]) => ({
    type, label: d.label, multi: d.multi, defaults: d.defaults,
  }))
}

module.exports = { INDICATORS, computeIndicators, indicatorKey, listIndicators }
