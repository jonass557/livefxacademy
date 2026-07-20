// utils/indicators/ema.js — Moyenne mobile exponentielle (Exponential Moving Average).
const { source, emaArray } = require('./helpers')

function ema(candles, { period = 20, source: src = 'close' } = {}) {
  return emaArray(source(candles, src), period)
}

module.exports = ema
