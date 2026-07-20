// utils/indicators/volume.js — Série de volume brute.
// Renvoie le volume par bougie (null si le fournisseur n'en fournit pas, ex. forex Deriv).
function volume(candles) {
  return candles.map((c) => (c.volume != null ? c.volume : null))
}

module.exports = volume
