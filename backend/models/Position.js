const mongoose = require('mongoose');

// Position démo ouverte. `symbol` est dénormalisé pour l'affichage/temps réel.
// `margin` = marge immobilisée par la position (libérée à la fermeture).
const positionSchema = new mongoose.Schema({
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
  volume: { type: Number, required: true },       // en lots
  entry_price: { type: Number, required: true },
  current_price: { type: Number, required: true },
  stop_loss: { type: Number, default: null },
  take_profit: { type: Number, default: null },
  margin: { type: Number, default: 0 },            // marge immobilisée (devise compte)
  profit: { type: Number, default: 0 },            // P&L flottant (devise compte)
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
  opened_at: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Recherche fréquente : positions ouvertes d'un compte.
positionSchema.index({ demo_account_id: 1, status: 1 });

module.exports = mongoose.model('Position', positionSchema);
