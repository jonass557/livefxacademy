// utils/indicators/vwap.js — Volume Weighted Average Price (cumulatif).
// VWAP = Σ(prix_typique * volume) / Σ(volume). Le forex Deriv ne fournit PAS de
// volume : on dégrade proprement en pondération égale (VWAP ≡ moyenne cumulée du
// prix typique). Le résultat reste exploitable ; documenté comme approximation.
function vwap(candles) {
  const n = candles.length
  const out = new Array(n).fill(null)
  let cumPV = 0
  let cumV = 0
  for (let i = 0; i < n; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3
    const vol = candles[i].volume != null && candles[i].volume > 0 ? candles[i].volume : 1
    cumPV += tp * vol
    cumV += vol
    out[i] = cumV === 0 ? null : cumPV / cumV
  }
  return out
}

module.exports = vwap
