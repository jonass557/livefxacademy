// utils/marketData/mt5Provider.js
// Stub extensible — démontre l'ajout d'un fournisseur MetaTrader 5.
// MT5 n'expose pas d'API HTTP publique : nécessite un pont (terminal MT5 +
// service exposant l'historique). À brancher derrière cette même interface.
const { TIMEFRAMES } = require('./provider')

module.exports = {
  name: 'mt5',
  label: 'MetaTrader 5 — bientôt',
  available: false,
  listSymbols: () => [],
  listTimeframes: () => TIMEFRAMES,
  getSymbolMeta: () => null,
  fetchCandles: async () => {
    throw new Error('Le fournisseur MT5 sera bientôt disponible.')
  },
}
