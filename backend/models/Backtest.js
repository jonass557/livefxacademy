const mongoose = require('mongoose');

// Résultat de backtest sauvegardé. `strategy`, `config`, `stats`, `trades` et
// `equity_curve` sont stockés en Mixed : leur forme est validée/produite par
// utils/backtest et peut évoluer sans migration.
const backtestSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: String,
  provider: { type: String, required: true },   // 'deriv' | 'binance' | 'mt5'
  symbol: { type: String, required: true },     // ex: 'frxEURUSD'
  symbol_name: String,                          // ex: 'EUR/USD'
  timeframe: { type: String, required: true },  // ex: 'H1'
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  candles_count: Number,
  strategy: mongoose.Schema.Types.Mixed,        // { template, parameters, entry_rules, exit_rules, risk }
  config: mongoose.Schema.Types.Mixed,          // { initial_balance, position_size, spread, ... }
  stats: mongoose.Schema.Types.Mixed,           // sortie de utils/backtest/stats.js
  trades: mongoose.Schema.Types.Mixed,          // journal des trades (plafonné côté contrôleur)
  equity_curve: mongoose.Schema.Types.Mixed     // [{ t, equity }] (sous-échantillonnée)
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Backtest', backtestSchema);
