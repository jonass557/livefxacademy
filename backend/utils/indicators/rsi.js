// utils/indicators/rsi.js — Relative Strength Index (méthode de Wilder).
// RSI = 100 - 100/(1 + RS) où RS = moyenne des gains / moyenne des pertes.
const { source } = require('./helpers')

function rsi(candles, { period = 14, source: src = 'close' } = {}) {
  const v = source(candles, src)
  const out = new Array(v.length).fill(null)
  if (v.length <= period) return out

  let avgGain = 0
  let avgLoss = 0
  // Amorçage : moyenne simple des `period` premières variations.
  for (let i = 1; i <= period; i++) {
    const diff = v[i] - v[i - 1]
    if (diff >= 0) avgGain += diff
    else avgLoss -= diff
  }
  avgGain /= period
  avgLoss /= period
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  // Lissage de Wilder pour les valeurs suivantes.
  for (let i = period + 1; i < v.length; i++) {
    const diff = v[i] - v[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }
  return out
}

module.exports = rsi
