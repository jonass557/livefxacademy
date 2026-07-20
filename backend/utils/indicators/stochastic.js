// utils/indicators/stochastic.js — Oscillateur stochastique.
// %K brut = 100 * (close - plusBas(kPeriod)) / (plusHaut(kPeriod) - plusBas(kPeriod))
// k = SMA(%K brut, smooth) ; d = SMA(k, dPeriod).
const { smaArray } = require('./helpers')

function stochastic(candles, { kPeriod = 14, dPeriod = 3, smooth = 3 } = {}) {
  const n = candles.length
  const rawK = new Array(n).fill(null)
  for (let i = kPeriod - 1; i < n; i++) {
    let hh = -Infinity
    let ll = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high
      if (candles[j].low < ll) ll = candles[j].low
    }
    const range = hh - ll
    rawK[i] = range === 0 ? 100 : (100 * (candles[i].close - ll)) / range
  }
  // Lissage : on ne lisse que la portion définie pour garder l'alignement.
  const first = rawK.findIndex((x) => x != null)
  const k = new Array(n).fill(null)
  const d = new Array(n).fill(null)
  if (first !== -1) {
    const compact = rawK.slice(first).map((x) => x ?? 0)
    const kSm = smaArray(compact, smooth)
    for (let i = 0; i < kSm.length; i++) k[first + i] = kSm[i]
    const kFirst = k.findIndex((x) => x != null)
    if (kFirst !== -1) {
      const kCompact = k.slice(kFirst).map((x) => x ?? 0)
      const dSm = smaArray(kCompact, dPeriod)
      for (let i = 0; i < dSm.length; i++) d[kFirst + i] = dSm[i]
    }
  }
  return { k, d }
}

module.exports = stochastic
