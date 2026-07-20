// utils/indicators/helpers.js
// Utilitaires partagés par les indicateurs. Les indicateurs sont des fonctions
// PURES : elles reçoivent le tableau de bougies et renvoient un tableau aligné
// sur l'index des bougies (valeur `null` pendant la période de chauffe/warm-up).

// Extrait la série de prix d'une source donnée ('close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3').
function source(candles, src = 'close') {
  switch (src) {
    case 'open': return candles.map((c) => c.open)
    case 'high': return candles.map((c) => c.high)
    case 'low': return candles.map((c) => c.low)
    case 'hl2': return candles.map((c) => (c.high + c.low) / 2)
    case 'hlc3': return candles.map((c) => (c.high + c.low + c.close) / 3)
    case 'close':
    default: return candles.map((c) => c.close)
  }
}

// Moyenne mobile simple d'un tableau de nombres → tableau aligné (null en warm-up).
function smaArray(values, period) {
  const out = new Array(values.length).fill(null)
  if (period <= 0) return out
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

// Moyenne mobile exponentielle d'un tableau (amorcée par une SMA sur `period`).
function emaArray(values, period) {
  const out = new Array(values.length).fill(null)
  if (period <= 0) return out
  const k = 2 / (period + 1)
  let prev = null
  let seed = 0
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { seed += values[i]; continue }
    if (i === period - 1) { seed += values[i]; prev = seed / period; out[i] = prev; continue }
    prev = values[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

module.exports = { source, smaArray, emaArray }
