// utils/indicators/sma.js — Moyenne mobile simple (Simple Moving Average).
const { source, smaArray } = require('./helpers')

function sma(candles, { period = 20, source: src = 'close' } = {}) {
  return smaArray(source(candles, src), period)
}

module.exports = sma
