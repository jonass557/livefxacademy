// utils/indicators/macd.js — Moving Average Convergence Divergence.
// macd = EMA(fast) - EMA(slow) ; signal = EMA(macd, signalPeriod) ; hist = macd - signal.
const { source, emaArray } = require('./helpers')

function macd(candles, { fast = 12, slow = 26, signal = 9, source: src = 'close' } = {}) {
  const v = source(candles, src)
  const emaFast = emaArray(v, fast)
  const emaSlow = emaArray(v, slow)
  const macdLine = v.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
  )
  // EMA du signal calculée uniquement sur la portion définie de la ligne MACD.
  const firstIdx = macdLine.findIndex((x) => x != null)
  const signalLine = new Array(v.length).fill(null)
  if (firstIdx !== -1) {
    const compact = macdLine.slice(firstIdx).map((x) => x ?? 0)
    const sig = emaArray(compact, signal)
    for (let i = 0; i < sig.length; i++) signalLine[firstIdx + i] = sig[i]
  }
  const hist = v.map((_, i) =>
    macdLine[i] != null && signalLine[i] != null ? macdLine[i] - signalLine[i] : null
  )
  return { macd: macdLine, signal: signalLine, hist }
}

module.exports = macd
