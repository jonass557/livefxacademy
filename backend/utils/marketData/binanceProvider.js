// utils/marketData/binanceProvider.js
// Stub extensible — démontre l'ajout d'un nouveau fournisseur (crypto via Binance).
// Binance klines : GET https://api.binance.com/api/v3/klines (fetch natif Node ≥18).
// À implémenter : mapping timeframe -> interval, pagination, normalisation OHLCV.
const { TIMEFRAMES } = require('./provider')

module.exports = {
  name: 'binance',
  label: 'Binance (Crypto) — bientôt',
  available: false,
  listSymbols: () => [],
  listTimeframes: () => TIMEFRAMES,
  getSymbolMeta: () => null,
  fetchCandles: async () => {
    throw new Error('Le fournisseur Binance sera bientôt disponible.')
  },
}
