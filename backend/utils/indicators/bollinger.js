// utils/indicators/bollinger.js — Bandes de Bollinger.
// mid = SMA(period) ; upper/lower = mid ± mult * écart-type sur la fenêtre.
const { source, smaArray } = require('./helpers')

function bollinger(candles, { period = 20, mult = 2, source: src = 'close' } = {}) {
  const v = source(candles, src)
  const mid = smaArray(v, period)
  const upper = new Array(v.length).fill(null)
  const lower = new Array(v.length).fill(null)
  for (let i = period - 1; i < v.length; i++) {
    let sumSq = 0
    for (let j = i - period + 1; j <= i; j++) sumSq += (v[j] - mid[i]) ** 2
    const sd = Math.sqrt(sumSq / period)
    upper[i] = mid[i] + mult * sd
    lower[i] = mid[i] - mult * sd
  }
  return { upper, mid, lower }
}

module.exports = bollinger
