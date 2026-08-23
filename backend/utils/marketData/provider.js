// utils/marketData/provider.js
// Constantes et helpers partagés par tous les fournisseurs de données de marché.
//
// Un fournisseur (« provider ») expose l'interface suivante :
//   - name: string
//   - label: string
//   - listSymbols(): [{ symbol, name, pip }]
//   - listTimeframes(): TIMEFRAMES
//   - async fetchCandles({ symbol, granularity, start, end }): [{ time, open, high, low, close, volume? }]
//     où `time` est un epoch en SECONDES, croissant. Le tableau est trié et borné.
//
// Cette couche d'abstraction permet d'ajouter un nouveau fournisseur (Binance,
// MT5, etc.) sans toucher au moteur de backtest ni aux contrôleurs.

// Unités de temps supportées (mappées vers la granularité en secondes).
// NB : Deriv plafonne à D1. Le Trading Demo gère W1/MN séparément (candleService)
// pour ne pas exposer ces unités au module Backtesting qui s'appuie sur Deriv.
const TIMEFRAMES = [
  { key: 'M1', label: '1 minute', granularity: 60 },
  { key: 'M5', label: '5 minutes', granularity: 300 },
  { key: 'M15', label: '15 minutes', granularity: 900 },
  { key: 'M30', label: '30 minutes', granularity: 1800 },
  { key: 'H1', label: '1 heure', granularity: 3600 },
  { key: 'H4', label: '4 heures', granularity: 14400 },
  { key: 'D1', label: '1 jour', granularity: 86400 },
]

// Nombre maximal de bougies récupérées par backtest (garde-fou perf + taille Mongo).
const MAX_CANDLES = 10000

function granularityOf(timeframeKey) {
  const tf = TIMEFRAMES.find((t) => t.key === timeframeKey)
  return tf ? tf.granularity : null
}

function isValidTimeframe(timeframeKey) {
  return TIMEFRAMES.some((t) => t.key === timeframeKey)
}

module.exports = { TIMEFRAMES, MAX_CANDLES, granularityOf, isValidTimeframe }
