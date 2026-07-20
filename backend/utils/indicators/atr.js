// utils/indicators/atr.js — Average True Range (méthode de Wilder).
// TR = max(high-low, |high-closePrev|, |low-closePrev|) ; ATR = lissage de Wilder du TR.
function atr(candles, { period = 14 } = {}) {
  const n = candles.length
  const out = new Array(n).fill(null)
  if (n <= period) return out

  const tr = new Array(n).fill(0)
  tr[0] = candles[0].high - candles[0].low
  for (let i = 1; i < n; i++) {
    const prevClose = candles[i - 1].close
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose)
    )
  }

  // Amorçage : moyenne simple des `period` premiers TR (index 1..period).
  let sum = 0
  for (let i = 1; i <= period; i++) sum += tr[i]
  let prev = sum / period
  out[period] = prev
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period
    out[i] = prev
  }
  return out
}

module.exports = atr
