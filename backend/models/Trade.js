const mongoose = require('mongoose');

// Historique d'une position fermée (totale ou partielle). Sert de journal.
const tradeSchema = new mongoose.Schema({
  demo_account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DemoAccount',
    required: true,
    index: true,
  },
  instrument_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instrument',
    required: true,
  },
  symbol: { type: String, required: true },
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  volume: { type: Number, required: true },
  entry_price: { type: Number, required: true },
  exit_price: { type: Number, required: true },
  stop_loss: { type: Number, default: null },
  take_profit: { type: Number, default: null },
  profit: { type: Number, required: true },         // P&L réalisé (devise compte)
  opened_at: { type: Date, required: true },
  closed_at: { type: Date, default: Date.now },
  close_reason: {
    type: String,
    enum: ['MANUAL', 'STOP_LOSS', 'TAKE_PROFIT', 'PARTIAL', 'MARGIN_CALL'],
    default: 'MANUAL',
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

tradeSchema.index({ demo_account_id: 1, closed_at: -1 });

module.exports = mongoose.model('Trade', tradeSchema);
